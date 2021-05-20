import type { MetaFunction, LoaderFunction, ActionFunction } from 'remix';
import { useRouteData, Link, useSubmit } from 'remix';
import { TrashIcon, ShareIcon } from '@heroicons/react/outline';
import { Tooltip } from '@reach/tooltip';
import * as Yup from 'yup';

import { withSession, requireUser } from '../../sessions';
import { withBody } from '../../withBody';
import { prisma, List } from '../../db';
import { getLists } from '../../loaders';

type RouteData = (List & { isShared: boolean })[];

const createListSchema = Yup.object().shape({
  title: Yup.string().required(),
});

export const meta: MetaFunction = ({ data }) => {
  return { title: `Shoppinglist (${data.length})` };
};

export const loader: LoaderFunction = ({ request }) =>
  withSession(request, (session) =>
    requireUser(session, async (user): Promise<RouteData> => getLists(user))
  );

export const action: ActionFunction = ({ request }) =>
  withSession(request, (session) =>
    requireUser(session, (user) =>
      withBody(request, (router) =>
        router
          .post(createListSchema, async ({ title }) => {
            await prisma.list.create({
              data: {
                userId: user.id,
                users: { create: { userId: user.id } },
                title,
              },
            });

            return '/';
          })
          .error((error) => {
            session.flash('error', error);
            return '/';
          })
      )
    )
  );

export default function ListsIndexRoute() {
  const lists = useRouteData<RouteData>();
  const submit = useSubmit();
  const deleteList = (id: string) =>
    submit({}, { action: `/lists/${id}`, method: 'delete', replace: true });

  return (
    <ul className="divide-y divide-gray-200">
      {lists.map((list) => (
        <li key={list.id} className="group py-4 flex">
          <div className="ml-3 flex-grow">
            <div className="text-sm font-medium text-gray-900">
              <Link to={`${list.id}`}>
                <div className="flex items-center">
                  {list.title}
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
              <button
                className="px-3 opacity-0 group-hover:opacity-100 transition duration-200 ease-in-out"
                type="button"
                data-list-item-control
                onClick={() => deleteList(list.id)}
              >
                <TrashIcon className="hover:text-red-500 h-5 w-5" />
              </button>
            </Tooltip>
          )}
        </li>
      ))}
    </ul>
  );
}
