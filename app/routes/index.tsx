import type { MetaFunction, LoaderFunction, ActionFunction } from 'remix';
import { useRouteData, redirect, Link, useSubmit } from 'remix';
import { TrashIcon, ShareIcon } from '@heroicons/react/outline';
import { Tooltip } from '@reach/tooltip';
import * as Yup from 'yup';

import { withSession, requireUser } from '../sessions';
import { withBody } from '../withBody';
import { prisma, List } from '../db';

type RouteData = (List & { isShared: boolean })[];

const createListSchema = Yup.object().shape({
  title: Yup.string().required(),
});

function useListsData(): [RouteData, { deleteList: (id: string) => void }] {
  const data = useRouteData<RouteData>();
  const submit = useSubmit();
  const deleteList = (id: string) =>
    submit({}, { action: `/list/${id}`, method: 'delete', replace: true });

  return [data, { deleteList }];
}

export const meta: MetaFunction = () => {
  return {
    title: 'Shoppinglist',
  };
};

export const loader: LoaderFunction = ({ request }) =>
  withSession(request, (session) =>
    requireUser(
      session,
      async (user): Promise<RouteData> => {
        const lists = await prisma.list.findMany({
          where: { users: { some: { user } } },
          orderBy: { createAt: 'desc' },
        });
        return lists.map((list) => ({
          ...list,
          isShared: list.userId != user.id,
        }));
      }
    )
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

            return redirect('/');
          })
          .error((error) => {
            session.flash('error', error);
            return redirect('/');
          })
      )
    )
  );

export default function Index() {
  const [lists, { deleteList }] = useListsData();

  return (
    <ul className="divide-y divide-gray-200">
      {lists.map((list) => (
        <li key={list.id} className="group py-4 flex">
          <div className="ml-3 flex-grow">
            <div className="text-sm font-medium text-gray-900">
              <Link to={`list/${list.id}`}>
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
            <button
              className="px-3 opacity-0 group-hover:opacity-100 transition duration-200 ease-in-out"
              type="button"
              data-list-item-control
              onClick={() => deleteList(list.id)}
            >
              <TrashIcon className="hover:text-red-500 h-5 w-5" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
