import { createCookieSessionStorage } from 'remix';
import { DateTime } from 'luxon';
import resolveAcceptLanguage from 'resolve-accept-language';

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as RTE from 'fp-ts/ReaderTaskEither';
import * as M from 'hyper-ts/lib/Middleware';
import * as D from 'io-ts/Decoder';

import { prisma } from './db';
import { decodeSession, toHandlerWithSession } from './hyper';

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

export const toHandler = toHandlerWithSession(cookieSession);

const getSessionLocale = (defaultLocale: string) =>
  pipe(
    decodeSession('locale', D.string.decode),
    M.orElse(() => M.of(defaultLocale))
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
    M.decodeHeader('accept-language', D.string.decode),
    M.chainEitherKW((acceptLanguageHeader) =>
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
    M.chainW(getSessionLocale),
    M.orElse(() => M.of(defaultLocale))
  );

const findUser = pipe(
  RTE.ask<string>(),
  RTE.chainTaskEitherK((id) =>
    prisma((p) =>
      p.user.findUnique({
        select: { id: true, email: true },
        where: { id },
      })
    )
  )
);

export const getUser = pipe(
  decodeSession('user', D.string.decode),
  M.chainTaskEitherKW(findUser),
  M.mapLeft(() => UnauthorizedError)
);