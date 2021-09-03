import type { LoaderFunction, ActionFunction, MetaFunction } from 'remix';
import { Link, Form, useTransitions } from 'remix';
import { TrashIcon, ShareIcon } from '@heroicons/react/outline';
import { Tooltip } from '@reach/tooltip';

import { pipe } from 'fp-ts/function';
import * as TH from 'fp-ts/These';

import { SharedLists, sharedListsDecoder } from '../../lib/dto';
import { getListsLoader, listsActions } from '../../middlewares';
import { decodeRouteData, useRouteData } from '../../hooks/useRouteData';

export const meta: MetaFunction = ({ data }) => {
  return {
    title: pipe(
      decodeRouteData(sharedListsDecoder, data),
      TH.match(
        (error) => `Error ${error}`,
        (lists) => `Shoppinglist (${lists.length})`,
        (_, lists) => `Shoppinglist (${lists.length})`
      )
    ),
  };
};

export const loader: LoaderFunction = (r) => getListsLoader(r);
export const action: ActionFunction = (r) => listsActions(r);

export default function ListsIndexRouteComponent() {
  return pipe(
    useRouteData(sharedListsDecoder),
    TH.match(
      () => <SharedListsComponent lists={[]} />,
      (lists) => <SharedListsComponent lists={lists} />,
      (_, lists) => <SharedListsComponent lists={lists} />
    )
  );
}

function SharedListsComponent({ lists }: { lists: SharedLists }) {
  const transitions = useTransitions();

  return (
    <ul className="divide-y divide-gray-200">
      {lists.map((list) => (
        <li key={list.id} className="group py-4 flex">
          <div className="ml-3 flex-grow">
            <div className="text-sm font-medium text-gray-900">
              <Link to={`${list.id}`}>
                <div className="flex items-center">
                  <div>
                    {list.title}{' '}
                    <span className="text-xs text-gray-400">
                      ({list.itemsCount})
                    </span>
                  </div>

                  {list.isShared && (
                    <Tooltip label="Shared list">
                      <span>
                        <ShareIcon className="ml-2 h-4 w-4 text-gray-400" />
                      </span>
                    </Tooltip>
                  )}
                </div>
              </Link>
            </div>
          </div>
          {!list.isShared && (
            <Tooltip label="Delete list">
              <Form
                action={`/lists/${list.id}`}
                submissionKey={`${list.id}-delete`}
                method="delete"
                replace
              >
                <button
                  className="px-3 opacity-0 group-hover:opacity-100 transition duration-200 ease-in-out"
                  type="submit"
                  disabled={
                    transitions.get(`${list.id}-delete`)?.state == 'submitting'
                  }
                >
                  <TrashIcon className="hover:text-red-500 h-5 w-5" />
                </button>
              </Form>
            </Tooltip>
          )}
        </li>
      ))}
    </ul>
  );
}
