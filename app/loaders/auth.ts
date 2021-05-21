import type { LoaderFunction } from 'remix';
import type { ValidationError } from 'yup';

import { withSession, requireUser } from '../sessions';

export type SignUpData = { error: ValidationError | null };
export type SignInData = { error: ValidationError | null };

export const signUpLoader: LoaderFunction = ({ request }) =>
  withSession(request, async (session) =>
    requireUser(
      session,
      () => '/',
      (): SignUpData => ({ error: session.get('error') })
    )
  );

export const signInLoader: LoaderFunction = ({ request }) =>
  withSession(request, async (session) =>
    requireUser(
      session,
      () => '/',
      (): SignInData => ({ error: session.get('error') })
    )
  );

export const signOutLoader: LoaderFunction = ({ request }) =>
  withSession(request, (session) => {
    session.unset('user');
    return '/signin';
  });
