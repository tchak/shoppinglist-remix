import type {
  MetaFunction,
  LoaderFunction,
  ActionFunction,
  RouteHandle,
} from 'remix';
import { Link, Form, useRouteData, usePendingFormSubmit } from 'remix';
import { UserIcon, XCircleIcon } from '@heroicons/react/solid';

import { signUpLoader, SignUpData as RouteData } from '../loaders';
import { signUpAction } from '../actions';

export const handle: RouteHandle = { layout: false };
export const meta: MetaFunction = () => ({ title: 'Sign Up' });
export const loader: LoaderFunction = (params) => signUpLoader(params);
export const action: ActionFunction = (params) => signUpAction(params);

export default function SignUpRoute() {
  const { error } = useRouteData<RouteData>();
  const pendingForm = usePendingFormSubmit();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Sign up for a new account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              to="/signin"
              className="font-medium text-green-600 hover:text-green-500"
            >
              sign in if you already have an account
            </Link>
          </p>
        </div>
        <Form className="mt-8 space-y-6" method="post" replace>
          <fieldset disabled={!!pendingForm}>
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
                  defaultValue={error?.value.email}
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
                  autoComplete="new-password"
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  defaultValue={error?.value.password}
                />
              </div>
            </div>
            {error && <Errors message={error.message} />}
          </fieldset>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <UserIcon
                  className="h-5 w-5 text-green-500 group-hover:text-green-400"
                  aria-hidden="true"
                />
              </span>
              Sign up
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
