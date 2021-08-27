import type { Session } from 'remix';
import type { Task } from 'fp-ts/Task';
import type { IO } from 'fp-ts/IO';
import type { Option } from 'fp-ts/Option';
import type { Reader } from 'fp-ts/Reader';
import type { ReaderTask } from 'fp-ts/ReaderTask';
import type { TaskEither } from 'fp-ts/TaskEither';
import { createCookieSessionStorage } from 'remix';
import { DateTime } from 'luxon';
import resolveAcceptLanguage from 'resolve-accept-language';

import { pipe } from 'fp-ts/function';
import * as T from 'fp-ts/Task';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import * as RE from 'fp-ts/ReaderEither';
import * as E from 'fp-ts/Either';
import * as M from 'hyper-ts/lib/Middleware';
import * as RM from 'hyper-ts/lib/ReaderMiddleware';
import * as D from 'io-ts/Decoder';

import { prisma } from './db';

const UnauthorizedError = 'UnauthorizedError' as const;
const AcceptLanguageParseError = 'AcceptLanguageParseError' as const;

const cookieSession = createCookieSessionStorage({
  cookie: {
    name: '__session',
    secrets: [String(process.env['SESSION_SECRET'])],
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    expires: DateTime.local().plus({ years: 1 }).toJSDate(),
    ...(process.env.NODE_ENV === 'production'
      ? {
          secure: true,
          domain: String(process.env['APP_DOMAIN']),
        }
      : undefined),
  },
});

export const getSessionTask: ReaderTask<string | null, Session> =
  (cookie: string | null): Task<Session> =>
  () =>
    cookieSession.getSession(cookie);

export const commitSessionTask: ReaderTask<Session, string> =
  (session: Session): Task<string> =>
  () =>
    cookieSession.commitSession(session);

export const destroySessionTask: ReaderTask<Session, string> =
  (session: Session): Task<string> =>
  () =>
    cookieSession.destroySession(session);

function sessionGet<Value>(key: string): Reader<Session, Option<Value>> {
  return (session: Session) => O.fromNullable<Value>(session.get(key));
}

function sessionSet<Value>(
  name: string,
  value: Value,
  flash = false
): Reader<Session, IO<void>> {
  return (session: Session) => () => {
    if (flash) {
      session.flash(name, value);
    } else if (value == null) {
      session.unset(name);
    } else {
      session.set(name, value);
    }
  };
}

export function setUser(user: {
  id: string;
}): (session: Session) => Task<string> {
  return (session: Session) => {
    sessionSet('user', user.id)(session)();
    return pipe(session, commitSessionTask);
  };
}

function _unsetUser(session: Session): Task<string> {
  sessionSet('user', null)(session)();
  return pipe(session, commitSessionTask);
}

export const getSession = pipe(
  M.decodeHeader('cookie', D.nullable(D.string).decode),
  M.chainTaskK(getSessionTask)
);

export function getUserWithSession(
  session: Session
): TaskEither<
  typeof UnauthorizedError,
  { session: Session; user: { id: string; email: string } }
> {
  return pipe(
    session,
    sessionGet<string>('user'),
    TE.fromOption(() => UnauthorizedError),
    TE.chainW((id) =>
      prisma((p) =>
        p.user.findUnique({
          rejectOnNotFound: true,
          select: { id: true, email: true },
          where: { id },
        })
      )
    ),
    TE.map((user) => ({ session, user })),
    TE.mapLeft(() => UnauthorizedError)
  );
}

export const getUser = pipe(
  getSession,
  M.chainTaskEitherKW(getUserWithSession),
  M.map(({ user }) => user)
);

export const getUserAndSession = pipe(
  getSession,
  M.chainTaskEitherKW(getUserWithSession)
);

export const unsetUser = pipe(getSession, M.chainTaskK(_unsetUser));

const getSessionLocale = pipe(
  RM.fromMiddleware(getSession),
  RM.chainW((session) =>
    pipe(
      RM.ask<string>(),
      RM.chainTaskK((defaultLocale) =>
        pipe(
          session,
          sessionGet<string>('locale'),
          O.match(
            () => T.of(defaultLocale),
            (locale) => T.of(locale)
          )
        )
      )
    )
  )
);

const readAcceptLanguage = ({
  supportedLocales,
  defaultLocale,
}: {
  supportedLocales: string[];
  defaultLocale: string;
}): RE.ReaderEither<string, typeof AcceptLanguageParseError, string> =>
  pipe(
    RE.ask<string>(),
    RE.chainEitherK((acceptLanguageHeader) =>
      E.tryCatch(
        () =>
          resolveAcceptLanguage(
            acceptLanguageHeader,
            supportedLocales,
            defaultLocale
          ),
        () => AcceptLanguageParseError
      )
    )
  );

export const decodeLocale = pipe(
  M.decodeHeader('accept-language', D.string.decode),
  M.chainEitherKW(
    readAcceptLanguage({
      supportedLocales: ['en-GB', 'fr-FR'],
      defaultLocale: 'en-GB',
    })
  ),
  M.chainW((locale) => getSessionLocale(locale))
);
