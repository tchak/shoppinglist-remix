import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import * as D from 'io-ts/Decoder';
import { DateTime } from 'luxon';
import { createCookieSessionStorage } from 'remix';
import resolveAcceptLanguage from 'resolve-accept-language';

import { prisma } from './db';
import * as H from './hyper';

export const UnauthorizedError = 'UnauthorizedError' as const;
export type UnauthorizedError = typeof UnauthorizedError;
export const AcceptLanguageParseError = 'AcceptLanguageParseError' as const;
export type AcceptLanguageParseError = typeof AcceptLanguageParseError;

export const cookieSession = createCookieSessionStorage({
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

export const toHandler = H.toHandlerWithSession(cookieSession);

const getSessionLocale = (defaultLocale: string) =>
  pipe(
    H.decodeSession('locale', D.string.decode),
    H.orElse(() => H.of(defaultLocale))
  );

type LocaleOptions = {
  supportedLocales: string[];
  defaultLocale: string;
};

export const decodeLocale = ({
  supportedLocales,
  defaultLocale,
}: LocaleOptions) =>
  pipe(
    H.decodeHeader('accept-language', D.string.decode),
    H.chainEitherKW((acceptLanguageHeader) =>
      E.tryCatch(
        () =>
          resolveAcceptLanguage(
            acceptLanguageHeader,
            supportedLocales,
            defaultLocale
          ),
        () => AcceptLanguageParseError
      )
    ),
    H.chainW(getSessionLocale),
    H.orElse(() => H.of(defaultLocale))
  );

const findUser = pipe(
  H.ask<string>(),
  H.chainTaskEitherK((id) =>
    prisma((p) =>
      p.user.findUnique({
        select: { id: true, email: true },
        where: { id },
      })
    )
  )
);

export const getUser = pipe(
  H.decodeSession('user', D.string.decode),
  H.chainTaskEitherKW(findUser),
  H.mapLeft(() => UnauthorizedError)
);
