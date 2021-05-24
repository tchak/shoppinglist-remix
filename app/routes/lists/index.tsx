import type { MetaFunction, LoaderFunction, ActionFunction } from 'remix';
import { useRouteData, Link, Form, usePendingFormSubmit } from 'remix';
import { TrashIcon, ShareIcon } from '@heroicons/react/outline';
import { Tooltip } from '@reach/tooltip';

import { getListsLoader, GetListsData as RouteData } from '../../loaders';
import { listsActions } from '../../actions';

export const meta: MetaFunction = ({ data }: { data: RouteData }) => {
  return { title: `Shoppinglist (${data.lists.length})` };
};

export const loader: LoaderFunction = (params) => getListsLoader(params);
export const action: ActionFunction = (params) => listsActions(params);

export default function ListsIndexRoute() {
  const { lists } = useRouteData<RouteData>();
  const pendingForm = usePendingFormSubmit();

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
                      ({list.items.length})
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
                  disabled={!!pendingForm}
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
