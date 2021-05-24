import type { LoaderFunction, Session } from 'remix';
import { json } from 'remix';
import type { ValidationError } from 'yup';

import { prisma, User } from '../db';
import { withSession, requireUser } from '../sessions';
import { autocompleteSearchTerm } from './autocomplete';

type Await<T> = T extends PromiseLike<infer U> ? U : T;
export type GetListData = NonNullable<Await<ReturnType<typeof getList>>>;
export type GetListsData = Await<ReturnType<typeof getLists>>;

export * from './auth';

export const getListsLoader: LoaderFunction = ({ request }) =>
  withSession(request, (session) =>
    requireUser(session, async (user) => {
      return getLists(user, session);
    })
  );

export const getListLoader: LoaderFunction = ({
  request,
  params: { list: id },
}) =>
  withSession(request, (session) =>
    requireUser(session, async (user) => {
      const list = getList(id, user, session);
      if (list) {
        return list;
      }
      return '/';
    })
  );

export const getItemsLoader: LoaderFunction = ({ request }) =>
  withSession(request, (session) =>
    requireUser(session, async (user) => {
      const url = new URL(request.url);
      const term = url.searchParams.get('term') ?? '';
      const items = await autocompleteSearchTerm(term, user.id);

      return json(items);
    })
  );

async function getLists(user: Pick<User, 'id'>, session: Session) {
  const lists = await prisma.list.findMany({
    where: { users: { some: { user } } },
    orderBy: { createdAt: 'desc' },
    include: {
      items: { where: { checked: false }, select: { checked: true } },
    },
  });

  const error = session.get('error') as ValidationError | null;

  return {
    lists: lists.map((list) => ({
      ...list,
      isShared: list.userId != user.id,
    })),
    error,
  };
}

async function getList(id: string, user: Pick<User, 'id'>, session: Session) {
  const list = await prisma.list.findFirst({
    where: { id },
    include: {
      users: { select: { userId: true } },
      items: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!list) {
    return null;
  }

  const userIds = list.users.map(({ userId }) => userId);
  if (!userIds.includes(user.id)) {
    await prisma.userList.create({
      data: { userId: user.id, listId: list.id },
    });
  }

  const error = session.get('error') as ValidationError | null;

  return { list, error };
}
