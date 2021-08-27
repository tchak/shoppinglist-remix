import type { LoaderFunction, ActionFunction } from 'remix';
import { useLoaderData, Link, Form, useTransition } from 'remix';
import { TrashIcon, ShareIcon } from '@heroicons/react/outline';
import { Tooltip } from '@reach/tooltip';

import { pipe } from 'fp-ts/function';
import { fold } from 'fp-ts/These';

import type { MetaFunction } from '../../lib/remix';
import type { SharedListsDTO, SharedList } from '../../lib/dto';
import { getListsLoader, listsActions } from '../../middlewares';
import { foldBoth } from '../../lib/shared';

export const meta: MetaFunction<SharedListsDTO> = ({ data }) => {
  return {
    title: foldBoth(
      () => '',
      (lists) => `Shoppinglist (${lists.length})`,
      data
    ),
  };
};

export const loader: LoaderFunction = (r) => getListsLoader(r);
export const action: ActionFunction = (r) => listsActions(r);

export default function ListsIndexRoute() {
  const lists = useLoaderData<SharedListsDTO>();

  return pipe(
    lists,
    fold(
      () => <Lists lists={[]} />,
      (lists) => <Lists lists={lists} />,
      (_, lists) => <Lists lists={lists} />
    )
  );
}

function Lists({ lists }: { lists: SharedList[] }) {
  const transition = useTransition();

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
              <Form action={`/lists/${list.id}`} method="delete" replace>
                <button
                  className="px-3 opacity-0 group-hover:opacity-100 transition duration-200 ease-in-out"
                  type="submit"
                  disabled={transition.state != 'idle'}
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
