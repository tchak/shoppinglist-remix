import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as TH from 'fp-ts/These';
import * as H from 'hyper-ts-remix';
import * as M from 'hyper-ts-remix/Middleware';
import * as D from 'io-ts/Decoder';
import { NonEmptyString, UUID } from 'io-ts-types-experimental/Decoder';

import { NotFoundError, prisma, PrismaError } from '../lib/db';
import type {
  ListWithItems,
  ListWithItemsResult,
  SharedLists,
  SharedListsResult,
} from '../lib/dto';
import { getUser, toHandler, UnauthorizedError } from '../lib/sessions';
import { createItem } from './items';

const createListBody = D.struct({ title: NonEmptyString });
const updateListBody = D.struct({ title: NonEmptyString });
const listId = UUID;

const createList = (user: { id: string }) =>
  pipe(
    M.POST,
    M.chainW(() => M.decodeBody(createListBody.decode)),
    M.chainTaskEitherKW((body) =>
      prisma((p) =>
        p.list.create({
          data: {
            userId: user.id,
            users: { create: { userId: user.id } },
            ...body,
          },
        })
      )
    )
  );

const updateList = (user: { id: string }) =>
  pipe(
    M.PUT,
    M.bindW('id', () => M.decodeParam('list', listId.decode)),
    M.bindW('body', () => M.decodeBody(updateListBody.decode)),
    M.chainTaskEitherKW(({ id, body }) =>
      pipe(
        prisma((p) =>
          p.list.updateMany({
            where: { id, users: { some: { user } } },
            data: body,
          })
        ),
        TE.map(() => id)
      )
    ),
    M.map((id) => `/lists/${id}`)
  );

const deleteList = (user: { id: string }) =>
  pipe(
    M.DELETE,
    M.chainW(() => M.decodeParam('list', listId.decode)),
    M.chainTaskEitherKW((id) =>
      prisma((p) => [
        p.userList.deleteMany({ where: { list: { id, user } } }),
        p.item.deleteMany({ where: { list: { id, user } } }),
        p.list.deleteMany({ where: { id, user } }),
      ])
    ),
    M.map(() => '/lists')
  );

function getList(
  id: string,
  user: { id: string }
): TE.TaskEither<PrismaError | NotFoundError, ListWithItems> {
  return pipe(
    prisma((p) =>
      p.list.findFirst({
        where: { id },
        include: {
          users: { select: { userId: true } },
          items: { orderBy: { createdAt: 'desc' } },
        },
      })
    ),
    TE.chainFirstTaskK((list) => assignListToUser(list, user.id))
  );
}

function getLists(user: { id: string }): TE.TaskEither<never, SharedLists> {
  return pipe(
    prisma((p) =>
      p.list.findMany({
        where: { users: { some: { user } } },
        orderBy: { createdAt: 'desc' },
        include: {
          items: { where: { checked: false }, select: { checked: true } },
        },
      })
    ),
    TE.map((lists) =>
      lists.map((list) => ({
        ...list,
        isShared: list.userId != user.id,
        itemsCount: list.items.length,
      }))
    ),
    TE.orElse(() => TE.right<never, SharedLists>([]))
  );
}

function hasUser(
  list: { users: { userId: string }[] },
  userId: string
): boolean {
  return list.users.map(({ userId }) => userId).includes(userId);
}

function assignListToUser(
  list: { id: string; users: { userId: string }[] },
  userId: string
): TE.TaskEither<
  PrismaError | NotFoundError,
  { userId: string; listId: string }
> {
  return hasUser(list, userId)
    ? TE.right({ userId, listId: list.id })
    : prisma((p) => p.userList.create({ data: { userId, listId: list.id } }));
}

export const getListsLoader = pipe(
  getUser,
  M.chainTaskK(getLists),
  M.ichainW((lists: SharedListsResult) => M.sendJson(lists)),
  M.orElse(() => M.sendRedirect('/')),
  toHandler
);

export const getListLoader = pipe(
  getUser,
  M.bindTo('user'),
  M.bindW('id', () => M.decodeParam('list', listId.decode)),
  M.chainTaskK(({ id, user }) => getList(id, user)),
  M.ichainW((list: ListWithItemsResult) => M.sendJson(list)),
  M.orElse((error) => {
    if (error == UnauthorizedError) {
      return M.sendRedirect('/signin');
    }
    return M.sendRedirect('/lists');
  }),
  toHandler
);

export const listsActions = pipe(
  getUser,
  M.chainW(createList),
  M.ichainW(() => M.sendJson(TH.right({ ok: true }))),
  M.orElse((error) => {
    if (error == UnauthorizedError) {
      return M.sendRedirect('/signin');
    } else if (error == H.MethodNotAllowed || error == NotFoundError) {
      return M.sendRedirect('/');
    }
    return M.sendJson(TH.left('input error'));
  }),
  toHandler
);

export const listActions = pipe(
  getUser,
  M.chainW((user) =>
    pipe(
      createItem(user),
      M.alt(() => updateList(user)),
      M.alt(() => deleteList(user))
    )
  ),
  M.ichainW(() => M.sendJson(TH.right({ ok: true }))),
  M.orElse((error) => {
    if (error == UnauthorizedError) {
      return M.sendRedirect('/signin');
    } else if (error == H.MethodNotAllowed || error == NotFoundError) {
      return M.sendRedirect('/');
    }
    return M.sendJson(TH.left('input error'));
  }),
  toHandler
);
