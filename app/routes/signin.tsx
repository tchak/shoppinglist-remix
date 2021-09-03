import type {
  RouteHandle,
  LoaderFunction,
  MetaFunction,
  ActionFunction,
} from 'remix';
import { Link, Form, useTransition } from 'remix';
import { LockClosedIcon, XCircleIcon } from '@heroicons/react/solid';
import { pipe, constNull, constUndefined } from 'fp-ts/function';
import * as TH from 'fp-ts/These';
import * as O from 'fp-ts/Option';

import { signInDecoder } from '../lib/dto';
import { signInLoader, signInAction } from '../middlewares';
import { useActionData } from '../hooks/useRouteData';

export const handle: RouteHandle = { layout: false };
export const meta: MetaFunction = () => ({ title: 'Sign In' });
export const loader: LoaderFunction = (r) => signInLoader(r);
export const action: ActionFunction = (r) => signInAction(r);

export default function SignInRouteComponent() {
  const data = useActionData(signInDecoder, 'signin');
  const transition = useTransition('signin');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              to="/signup"
              className="font-medium text-green-600 hover:text-green-500"
            >
              create an account
            </Link>
          </p>
        </div>
        <Form
          submissionKey="signin"
          className="mt-8 space-y-6"
          method="post"
          replace
        >
          <fieldset disabled={transition.state == 'submitting'}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email-address" className="sr-only">
                  Email address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="username"
                  autoCapitalize="off"
                  autoCorrect="off"
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  defaultValue={pipe(
                    data,
                    O.match(constUndefined, (data) =>
                      pipe(
                        data,
                        TH.match(
                          constUndefined,
                          ({ email }) => email,
                          (_, { email }) => email
                        )
                      )
                    )
                  )}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  defaultValue={pipe(
                    data,
                    O.match(constUndefined, (data) =>
                      pipe(
                        data,
                        TH.match(
                          constUndefined,
                          ({ password }) => password,
                          (_, { password }) => password
                        )
                      )
                    )
                  )}
                />
              </div>
            </div>
            {pipe(
              data,
              O.match(constNull, (data) =>
                pipe(
                  data,
                  TH.match(
                    (error) => <Errors message={error} />,
                    constNull,
                    (error) => <Errors message={error} />
                  )
                )
              )
            )}
          </fieldset>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <LockClosedIcon
                  className="h-5 w-5 text-green-500 group-hover:text-green-400"
                  aria-hidden="true"
                />
              </span>
              Sign in
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}

function Errors({ message }: { message: string }) {
  return (
    <div className="rounded-md bg-red-50 p-4 mt-5">
      <div className="flex">
        <div className="flex-shrink-0">
          <XCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">{message}</h3>
        </div>
      </div>
    </div>
  );
}
