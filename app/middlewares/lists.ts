import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as TH from 'fp-ts/These';
import * as D from 'io-ts/Decoder';
import { NonEmptyString, UUID } from 'io-ts-types-experimental/Decoder';

import { NotFoundError, prisma, PrismaError } from '~/lib/db';
import type { ListWithItems, SharedLists } from '~/lib/dto';
import * as H from '~/lib/hyper';
import { getUser, toHandler, UnauthorizedError } from '~/lib/sessions';

import { createItem } from './items';

const createListBody = D.struct({ title: NonEmptyString });
const updateListBody = D.struct({ title: NonEmptyString });
const listId = UUID;

const createList = (user: { id: string }) =>
  pipe(
    H.POST,
    H.chainW(() => H.decodeBody(createListBody.decode)),
    H.chainTaskEitherKW((body) =>
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
    H.PUT,
    H.bindW('id', () => H.decodeParam('list', listId.decode)),
    H.bindW('body', () => H.decodeBody(updateListBody.decode)),
    H.chainTaskEitherKW(({ id, body }) =>
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
    H.map((id) => `/lists/${id}`)
  );

const deleteList = (user: { id: string }) =>
  pipe(
    H.DELETE,
    H.chainW(() => H.decodeParam('list', listId.decode)),
    H.chainTaskEitherKW((id) =>
      prisma((p) => p.list.deleteMany({ where: { id, user } }))
    ),
    H.map(() => '/lists')
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
  H.chainTaskK((user) => getLists(user)),
  H.chainW(H.json),
  H.orElse(() => H.redirect('/')),
  toHandler
);

export const getListLoader = pipe(
  getUser,
  H.bindTo('user'),
  H.bindW('id', () => H.decodeParam('list', listId.decode)),
  H.chainTaskK(({ id, user }) => getList(id, user)),
  H.chainW(H.json),
  H.orElse((error) => {
    if (error == UnauthorizedError) {
      return H.redirect('/signin');
    }
    return H.redirect('/lists');
  }),
  toHandler
);

export const listsActions = pipe(
  getUser,
  H.chainW(createList),
  H.chainW(() => H.json(TH.right({ ok: true }))),
  H.orElse((error) => {
    if (error == UnauthorizedError) {
      return H.redirect('/signin');
    } else if (error == H.MethodNotAllowed || error == NotFoundError) {
      return H.redirect('/');
    }
    return H.json(TH.left('input error'));
  }),
  toHandler
);

export const listActions = pipe(
  getUser,
  H.chainW((user) =>
    pipe(
      createItem(user),
      H.alt(() => updateList(user)),
      H.alt(() => deleteList(user))
    )
  ),
  H.chainW(() => H.json(TH.right({ ok: true }))),
  H.orElse((error) => {
    if (error == UnauthorizedError) {
      return H.redirect('/signin');
    } else if (error == H.MethodNotAllowed || error == NotFoundError) {
      return H.redirect('/');
    }
    return H.json(TH.left('input error'));
  }),
  toHandler
);
