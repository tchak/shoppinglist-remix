import { constant, pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as TH from 'fp-ts/These';
import * as DE from 'io-ts/DecodeError';
import * as D from 'io-ts/Decoder';
import * as FS from 'io-ts/FreeSemigroup';
import { Email, NonEmptyString } from 'io-ts-types-experimental/Decoder';

import { hash, verify } from '~/lib/argon2.server';
import { prisma } from '~/lib/db';
import * as H from '~/lib/hyper';
import { getUser, toHandler } from '~/lib/sessions';

export interface ValidPasswordBrand {
  readonly ValidPasswordBrand: unique symbol;
}
export type ValidPassword = string & ValidPasswordBrand;

const validPassword = (password: string): password is ValidPassword =>
  password.length >= 6;

const password = pipe(
  NonEmptyString,
  D.refine(validPassword, 'should be at least 6 characters')
);
const signUpBody = D.struct({ email: Email, password });
const signInBody = D.struct({ email: Email, password });

const WrongEmailError = 'WrongEmailError' as const;
type WrongEmailError = typeof WrongEmailError;
const WrongPasswordError = 'WrongPasswordError' as const;
type WrongPasswordError = typeof WrongPasswordError;

export const signUpLoader = pipe(
  getUser,
  H.chainW(() => H.redirect('/')),
  H.orElse(() => H.json(null)),
  toHandler
);

export const signUpAction = pipe(
  getUser,
  H.chain(() => H.redirect('/')),
  H.orElse(() =>
    pipe(
      H.POST,
      H.chainW(() => H.decodeBody(signUpBody.decode)),
      H.chainTaskEitherKW(createUserForAuthentication),
      H.chainW((user) =>
        pipe(
          H.redirect('/lists'),
          H.chain(() => H.session('user', user.id))
        )
      ),
      H.orElse((error) => {
        if (error == H.MethodNotAllowed) {
          return H.redirect('/');
        }
        return H.json(TH.left(drawError(error)));
      })
    )
  ),
  toHandler
);

export const signInLoader = pipe(
  getUser,
  H.chainW(() => H.redirect('/')),
  H.orElse(() => H.json(null)),
  toHandler
);

export const signInAction = pipe(
  getUser,
  H.chain(() => H.redirect('/')),
  H.orElse(() =>
    pipe(
      H.POST,
      H.chainW(() => H.decodeBody(signInBody.decode)),
      H.chainTaskEitherKW(findUserForAuthentication),
      H.chainW((user) =>
        pipe(
          H.redirect('/lists'),
          H.chain(() => H.session('user', user.id))
        )
      ),
      H.orElse((error) => {
        if (error == H.MethodNotAllowed) {
          return H.redirect('/');
        }
        return H.json(TH.left(drawError(error)));
      })
    )
  ),
  toHandler
);

export const signOutLoader = pipe(
  H.redirect('/signin'),
  H.chain(() => H.clearSession('user')),
  toHandler
);

function createUserForAuthentication({
  email,
  password,
}: D.TypeOf<typeof signUpBody>) {
  return pipe(
    TE.fromTask<string, never>(hash(password)),
    TE.chain((password) =>
      prisma((p) =>
        p.user.create({
          data: { email, password },
          select: { id: true },
        })
      )
    ),
    TE.mapLeft(() => WrongEmailError)
  );
}

function findUserForAuthentication({
  email,
  password,
}: D.TypeOf<typeof signInBody>) {
  return pipe(
    prisma((p) =>
      p.user.findUnique({
        where: { email },
        select: { id: true, password: true },
      })
    ),
    TE.mapLeft(() => WrongEmailError),
    TE.chainW((user) =>
      pipe(
        TE.fromTask<boolean, never>(verify(user.password, password)),
        TE.chain((ok) => (ok ? TE.right(user) : TE.left(WrongPasswordError)))
      )
    )
  );
}

function drawError(
  error: D.DecodeError | WrongEmailError | WrongPasswordError
): string {
  switch (error) {
    case WrongPasswordError:
      return 'wrong password';
    case WrongEmailError:
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
