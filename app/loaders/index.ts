import type { LoaderFunction } from 'remix';
import { json } from 'remix';

import { prisma, User } from '../db';
import { withSession, requireUser } from '../sessions';
import { autocompleteSearchTerm } from './autocomplete';

type Await<T> = T extends PromiseLike<infer U> ? U : T;
export type GetListData = NonNullable<Await<ReturnType<typeof getList>>>;
export type GetListsData = Await<ReturnType<typeof getLists>>;

export const getListsLoader: LoaderFunction = ({ request }) =>
  withSession(request, (session) =>
    requireUser(session, async (user) => getLists(user))
  );

async function getLists(user: Pick<User, 'id'>) {
  const lists = await prisma.list.findMany({
    where: { users: { some: { user } } },
    orderBy: { createdAt: 'desc' },
  });
  return lists.map((list) => ({
    ...list,
    isShared: list.userId != user.id,
  }));
}

export const getListLoader: LoaderFunction = ({
  request,
  params: { list: id },
}) =>
  withSession(request, (session) =>
    requireUser(session, async (user) => {
      const list = getList(id, user);
      if (list) {
        return list;
      }
      return '/';
    })
  );

async function getList(id: string, user: Pick<User, 'id'>) {
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
  return list;
}

export const getItemsLoader: LoaderFunction = ({ request }) =>
  withSession(request, (session) =>
    requireUser(session, async (user) => {
      const url = new URL(request.url);
      const term = url.searchParams.get('term') ?? '';
      const items = await autocompleteSearchTerm(term, user.id);

      return json(items);
    })
  );

export const signUpLoader: LoaderFunction = ({ request }) =>
  withSession(request, async (session) =>
    requireUser(
      session,
      () => '/',
      () => ({ error: session.get('error') })
    )
  );

export const signInLoader: LoaderFunction = ({ request }) =>
  withSession(request, async (session) =>
    requireUser(
      session,
      () => '/',
      () => ({ error: session.get('error') })
    )
  );

export const signOutLoader: LoaderFunction = ({ request }) =>
  withSession(request, (session) => {
    session.unset('user');
    return '/signin';
  });
