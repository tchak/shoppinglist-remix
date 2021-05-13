import type { MetaFunction, LoaderFunction } from 'remix';
import { redirect, Link } from 'remix';
import { FormattedMessage } from 'react-intl';

import { withSession, requireUser } from '../sessions';

export const meta: MetaFunction = () => {
  return { title: 'Shoppinglist' };
};

export const loader: LoaderFunction = ({ request }) =>
  withSession(request, (session) =>
    requireUser(
      session,
      () => redirect('/lists'),
      () => null
    )
  );

export default function Index() {
  return (
    <div className="bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
        <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
          <span className="block">
            <FormattedMessage defaultMessage="Simple" id="D+cOTU" />
          </span>
          <span className="block text-green-600">
            <FormattedMessage defaultMessage="Shoppinglist" id="DcMDlY" />
          </span>
        </h2>
        <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
          <div className="inline-flex rounded-md shadow">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              <FormattedMessage defaultMessage="Get started" id="/aBLH2" />
            </Link>
          </div>
          <div className="ml-3 inline-flex rounded-md shadow"></div>
        </div>
      </div>
    </div>
  );
}
