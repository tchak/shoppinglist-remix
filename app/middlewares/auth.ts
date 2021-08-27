import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as M from 'hyper-ts/lib/Middleware';
import * as D from 'io-ts/Decoder';

import { prisma } from '../lib/db';
import { hash, verify } from '../lib/argon2.server';
import { getUser, getSession, setUser, unsetUser } from '../lib/sessions';
import { POST, redirect, json, toHandler } from '../lib/hyper';

export interface ValidPasswordBrand {
  readonly ValidPasswordBrand: unique symbol;
}
export type ValidPassword = string & ValidPasswordBrand;

const validPassword = (password: string): password is ValidPassword =>
  password.length >= 6;

const password = pipe(D.string, D.refine(validPassword, 'ValidPassword'));
const signUpBody = D.struct({ email: D.string, password });
const signInBody = D.struct({ email: D.string, password });

const WrondPasswordError = 'WrondPasswordError' as const;

export const signUpLoader = pipe(
  getUser,
  M.ichainW(() => redirect('/')),
  M.orElse(() => json(null)),
  toHandler
);

export const signUpAction = pipe(
  getUser,
  M.ichain(() => redirect('/')),
  M.orElse(() =>
    pipe(
      POST,
      M.chainW(() => M.decodeBody(signUpBody.decode)),
      M.chainTaskEitherKW(({ email, password }) =>
        pipe(
          TE.fromTask<string, never>(hash(password)),
          TE.chainW((password) =>
            prisma((p) =>
              p.user.create({
                data: { email, password },
                select: { id: true },
              })
            )
          )
        )
      ),
      M.chainW((user) => pipe(getSession, M.chainTaskK(setUser(user)))),
      M.ichainW((cookie) =>
        pipe(
          M.redirect('/lists'),
          M.ichain(() => M.header('set-cookie', cookie)),
          M.ichain(() => M.closeHeaders()),
          M.ichain(() => M.end())
        )
      ),
      M.orElse(() => redirect('/signup'))
    )
  ),
  toHandler
);

export const signInLoader = pipe(
  getUser,
  M.ichainW(() => redirect('/')),
  M.orElse(() => json(null)),
  toHandler
);

export const signInAction = pipe(
  getUser,
  M.ichain(() => redirect('/')),
  M.orElse(() =>
    pipe(
      POST,
      M.chainW(() => M.decodeBody(signInBody.decode)),
      M.chainTaskEitherKW(({ email, password }) =>
        pipe(
          prisma((p) =>
            p.user.findUnique({
              rejectOnNotFound: true,
              where: { email },
              select: { id: true, password: true },
            })
          ),
          TE.chainW((user) =>
            pipe(
              TE.fromTask<boolean, never>(verify(user.password, password)),
              TE.chain((ok) =>
                ok ? TE.right(user) : TE.left(WrondPasswordError)
              )
            )
          )
        )
      ),
      M.chainW((user) => pipe(getSession, M.chainTaskK(setUser(user)))),
      M.ichainW((cookie) =>
        pipe(
          M.redirect('/lists'),
          M.ichain(() => M.header('set-cookie', cookie)),
          M.ichain(() => M.closeHeaders()),
          M.ichain(() => M.end())
        )
      ),
      M.orElse(() => redirect('/signin'))
    )
  ),
  toHandler
);

export const signOutLoader = pipe(
  unsetUser,
  M.ichainW((cookie) =>
    pipe(
      M.redirect('/signin'),
      M.ichain(() => M.header('set-cookie', cookie)),
      M.ichain(() => M.closeHeaders()),
      M.ichain(() => M.end())
    )
  ),
  M.orElse(() => redirect('/signin')),
  toHandler
);
