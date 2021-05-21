import type { Request, Session, LoaderFunction } from 'remix';
import { Response, createCookieSessionStorage, json, redirect } from 'remix';
import { DateTime } from 'luxon';

import { prisma, User } from './db';
import { getLocale } from './intl';

export const { getSession, commitSession, destroySession } =
  createCookieSessionStorage({
    cookie: {
      name: '__session',
      secrets: [String(process.env['SESSION_SECRET'])],
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      expires: DateTime.local().plus({ year: 1 }).toJSDate(),
      ...(process.env.NODE_ENV === 'production'
        ? {
            secure: true,
            domain: String(process.env['APP_DOMAIN']),
          }
        : undefined),
    },
  });

type NextFunction<T> = (context: T) => ReturnType<LoaderFunction>;

export async function withSession(
  request: Request,
  next: NextFunction<Session>
): Promise<Response> {
  const session = await getSession(request.headers.get('cookie'));
  // pass the session to the loader/action and let it handle the response
  let response = await next(session);

  // if they returned a plain object, turn it into a response
  if (typeof response == 'string') {
    response = redirect(response);
  } else if (!(response instanceof Response)) {
    response = json(response);
  }

  // commit the session automatically
  response.headers.append('set-cookie', await commitSession(session));

  return response;
}

export async function withLocale(request: Request, next: NextFunction<string>) {
  const session = await getSession(request.headers.get('cookie'));
  const locale =
    session.get('locale') || getLocale(request.headers.get('accept-language'));

  return next(locale);
}

export async function requireUser(
  session: Session,
  next: NextFunction<Pick<User, 'id' | 'email'>>,
  fallback: NextFunction<void> = () => redirect('/signin')
) {
  if (session.has('user')) {
    const user = await prisma.user.findUnique({
      select: { id: true, email: true },
      where: { id: session.get('user') },
    });
    if (user) {
      return next(user);
    }
  }
  return fallback();
}
