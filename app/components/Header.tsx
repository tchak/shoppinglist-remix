import { ClipboardCheckIcon } from '@heroicons/react/outline';
import { FormattedMessage } from 'react-intl';
import { NavLink, useMatch } from 'react-router-dom';
import { useFetcher } from 'remix';

import { ClientOnly, ShareButton } from '.';

export function Header() {
  return (
    <>
      <div className="flex items-center justify-between flex-wrap sm:flex-nowrap">
        <NavLink to="/">
          <h1 className="sr-only">
            <FormattedMessage defaultMessage="Shoppinglist" id="DcMDlY" />
          </h1>
          <ClipboardCheckIcon className="text-gray-900 h-8 w-8" />
        </NavLink>
        <div className="ml-4 flex-shrink-0">
          <HeaderAction />
        </div>
      </div>
    </>
  );
}

function HeaderAction() {
  const fetcher = useFetcher();
  const isLanding = useMatch('/');
  const isLists = useMatch('/lists');

  if (isLists) {
    return (
      <fetcher.Form method="post" action="/lists?index" replace>
        <input type="hidden" name="title" value="New Shoppinglist" />
        <button
          type="submit"
          disabled={fetcher.state != 'idle'}
          className="relative inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-500"
        >
          <FormattedMessage defaultMessage="Create new list" id="TLszpS" />
        </button>
      </fetcher.Form>
    );
  } else if (!isLanding) {
    return (
      <ClientOnly>
        <ShareButton />
      </ClientOnly>
    );
  }
  return null;
}
