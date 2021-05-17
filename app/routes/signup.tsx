import type {
  MetaFunction,
  LoaderFunction,
  ActionFunction,
  RouteHandle,
} from 'remix';
import {
  redirect,
  Link,
  Form,
  useRouteData,
  usePendingFormSubmit,
} from 'remix';
import { UserIcon, XCircleIcon } from '@heroicons/react/solid';
import * as Yup from 'yup';

import { hash } from '../lib/argon2.server';
import { withSession, requireUser } from '../sessions';
import { prisma } from '../db';
import { withBody } from '../withBody';

type RouteData = {
  error?: Yup.ValidationError;
};

const signUpSchema = Yup.object().shape({
  email: Yup.string().email().required(),
  password: Yup.string().min(6).required(),
});

export const handle: RouteHandle = { layout: false };

export const meta: MetaFunction = () => {
  return {
    title: 'Sign Up',
  };
};

export const loader: LoaderFunction = ({ request }) =>
  withSession(request, async (session) =>
    requireUser(
      session,
      () => redirect('/'),
      () => ({ error: session.get('error') })
    )
  );

export const action: ActionFunction = ({ request }) =>
  withSession(request, (session) =>
    requireUser(
      session,
      () => redirect('/'),
      () =>
        withBody(request, (router) =>
          router
            .post(signUpSchema, async ({ email, password }) => {
              const user = await prisma.user.create({
                data: { email, password: await hash(password) },
              });
              session.set('user', user.id);
              return redirect('/');
            })
            .error((error) => {
              session.flash('error', error);
              session.unset('user');
              return redirect('/signin');
            })
        )
    )
  );

export default function SignUpRoute() {
  const { error } = useRouteData<RouteData>();
  const pendingForm = usePendingFormSubmit();

  return (
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
      <Form className="mt-8 space-y-6" method="post" noValidate={true}>
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
                required
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
                required
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
          {/* <div className="mt-2 text-sm text-red-700">
            <ul className="list-disc pl-5 space-y-1"></ul>
          </div> */}
        </div>
      </div>
    </div>
  );
}
