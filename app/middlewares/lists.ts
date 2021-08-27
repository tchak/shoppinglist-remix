import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as M from 'hyper-ts/lib/Middleware';
import * as D from 'io-ts/Decoder';

import type { ListWithItems, SharedLists } from '../lib/dto';
import { getUser } from '../lib/sessions';
import { prisma, PrismaError } from '../lib/db';
import { POST, PUT, DELETE, redirect, json, toHandler } from '../lib/hyper';

import { createItem } from './items';

const createListBody = D.struct({ title: D.string });
const updateListBody = D.struct({ title: D.string });
const listId = D.string;

const createList = (user: { id: string }) =>
  pipe(
    POST,
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
    ),
    M.map(() => '/lists')
  );

const updateList = (user: { id: string }) =>
  pipe(
    PUT,
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
    DELETE,
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
): TE.TaskEither<string, ListWithItems> {
  return pipe(
    prisma((p) =>
      p.list.findFirst({
        rejectOnNotFound: true,
        where: { id },
        include: {
          users: { select: { userId: true } },
          items: { orderBy: { createdAt: 'desc' } },
        },
      })
    ),
    TE.mapLeft((error) => error.message),
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
): TE.TaskEither<PrismaError, { userId: string; listId: string } | true> {
  return hasUser(list, userId)
    ? TE.right<never, true>(true)
    : prisma((p) => p.userList.create({ data: { userId, listId: list.id } }));
}

export const getListsLoader = pipe(
  getUser,
  M.chainTaskK((user) => getLists(user)),
  M.ichainW((lists) => json(lists)),
  M.orElse(() => redirect('/signin')),
  toHandler
);

export const getListLoader = pipe(
  getUser,
  M.bindTo('user'),
  M.bindW('id', () => M.decodeParam('list', listId.decode)),
  M.chainTaskK(({ id, user }) => getList(id, user)),
  M.ichainW((list) => json(list)),
  M.orElse(() => redirect('/signin')),
  toHandler
);

export const listsActions = pipe(
  getUser,
  M.ichainW((user) =>
    pipe(
      createList(user),
      M.alt(() => M.right('/'))
    )
  ),
  M.ichain((path) => redirect(path)),
  M.orElse(() => redirect('/signin')),
  toHandler
);

export const listActions = pipe(
  getUser,
  M.ichainW((user) =>
    pipe(
      createItem(user),
      M.alt(() => updateList(user)),
      M.alt(() => deleteList(user)),
      M.alt(() => M.right('/'))
    )
  ),
  M.ichain((path) => redirect(path)),
  M.orElse(() => redirect('/signin')),
  toHandler
);
