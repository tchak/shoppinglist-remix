import { constant, pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as TH from 'fp-ts/These';
import * as M from 'hyper-ts/lib/Middleware';
import * as D from 'io-ts/Decoder';
import * as DE from 'io-ts/DecodeError';
import * as FS from 'io-ts/FreeSemigroup';

import { prisma, PrismaError } from '../lib/db';
import { hash, verify } from '../lib/argon2.server';
import { getUser, toHandler } from '../lib/sessions';
import {
  POST,
  redirect,
  json,
  clearSession,
  session,
  MethodNotAllowed,
} from '../lib/hyper';

const RegExpEmail =
  /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i;

export interface ValidEmailBrand {
  readonly ValidPasswordBrand: unique symbol;
}
export type ValidEmail = string & ValidEmailBrand;

const validEmail = (email: string): email is ValidEmail =>
  RegExpEmail.test(email);

export interface ValidPasswordBrand {
  readonly ValidPasswordBrand: unique symbol;
}
export type ValidPassword = string & ValidPasswordBrand;

const validPassword = (password: string): password is ValidPassword =>
  password.length >= 6;

const password = pipe(
  D.string,
  D.refine(validPassword, 'should be at least 6 characters')
);
const email = pipe(D.string, D.refine(validEmail, 'should be a valid email'));
const signUpBody = D.struct({ email, password });
const signInBody = D.struct({ email, password });

const WrondPasswordError = 'WrondPasswordError' as const;
type WrondPasswordError = typeof WrondPasswordError;

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
          TE.chain((password) =>
            prisma((p) =>
              p.user.create({
                data: { email, password },
                select: { id: true },
              })
            )
          )
        )
      ),
      M.ichainW((user) =>
        pipe(
          M.redirect('/lists'),
          M.ichain(() => session('user', user.id)),
          M.ichain(() => M.closeHeaders()),
          M.ichain(() => M.end())
        )
      ),
      M.orElse((error) => {
        if (error == MethodNotAllowed) {
          return redirect('/');
        }
        return json(TH.left(drawError(error)));
      })
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
      M.ichainW((user) =>
        pipe(
          M.redirect('/lists'),
          M.ichain(() => session('user', user.id)),
          M.ichain(() => M.closeHeaders()),
          M.ichain(() => M.end())
        )
      ),
      M.orElse((error) => {
        if (error == MethodNotAllowed) {
          return redirect('/');
        }
        return json(TH.left(drawError(error)));
      })
    )
  ),
  toHandler
);

export const signOutLoader = pipe(
  M.redirect('/signin'),
  M.ichain(() => clearSession('user')),
  M.ichain(() => M.closeHeaders()),
  M.ichain(() => M.end()),
  toHandler
);

function drawError(
  error: D.DecodeError | WrondPasswordError | PrismaError
): string {
  switch (error) {
    case WrondPasswordError:
      return 'wrong password';
    case PrismaError:
      return 'wrong email';
    default:
      return drawDecodeError(error);
  }
}

function drawDecodeError(error: D.DecodeError): string {
  return pipe(
    error,
    FS.fold(
      (error) =>
        pipe(
          error,
          DE.fold({
            Key: (key, _, error) => `${key}: ${drawDecodeError(error)}`,
            Leaf: (_, error) => error,
            Lazy: constant(''),
            Wrap: constant(''),
            Index: constant(''),
            Member: constant(''),
          })
        ),
      (left, right) => `${drawDecodeError(left)}, ${drawDecodeError(right)}`
    )
  );
}
