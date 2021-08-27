import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as M from 'hyper-ts/lib/Middleware';
import * as D from 'io-ts/Decoder';

import { getUser } from '../lib/sessions';
import { prisma } from '../lib/db';
import { POST, PUT, DELETE, redirect, json, toHandler } from '../lib/hyper';
import { autocompleteAddTerm, autocompleteSearchTerm } from './autocomplete';

const term = pipe(
  D.struct({ term: D.string }),
  D.map(({ term }) => term)
);
const createItemBody = D.struct({ title: D.string });
const updateItemBody = D.partial({
  title: D.string,
  note: D.string,
  checked: D.boolean,
});
const listId = D.string;
const itemId = D.string;

export const createItem = (user: { id: string }) =>
  pipe(
    POST,
    M.bindW('id', () => M.decodeParam('list', listId.decode)),
    M.bindW('body', () => M.decodeBody(createItemBody.decode)),
    M.chainTaskEitherKW(({ id, body }) =>
      pipe(
        prisma((p) =>
          p.list.findFirst({
            rejectOnNotFound: true,
            where: { id, users: { some: { user } } },
            select: { id: true, users: { select: { userId: true } } },
          })
        ),
        TE.chain((list) =>
          pipe(
            prisma((p) =>
              p.item.create({
                data: { list: { connect: { id } }, ...body },
              })
            ),
            TE.chainFirstTaskK(() => async () => {
              for (const userId of list.users.map(({ userId }) => userId)) {
                await autocompleteAddTerm(body.title, userId);
              }
            })
          )
        )
      )
    ),
    M.map((item) => `/lists/${item.listId}`)
  );

const updateItem = (user: { id: string }) =>
  pipe(
    PUT,
    M.bindW('id', () => M.decodeParam('item', itemId.decode)),
    M.bindW('body', () => M.decodeBody(updateItemBody.decode)),
    M.chainTaskEitherKW(({ id, body }) =>
      pipe(
        prisma((p) =>
          p.item.findFirst({
            rejectOnNotFound: true,
            select: { listId: true },
            where: { list: { users: { some: { user } } }, id },
          })
        ),
        TE.chain((item) =>
          pipe(
            prisma((p) =>
              p.item.updateMany({
                where: { listId: item.listId, id },
                data: body,
              })
            ),
            TE.map(() => item)
          )
        )
      )
    ),
    M.map((item) => `/lists/${item.listId}`)
  );

const deleteItem = (user: { id: string }) =>
  pipe(
    DELETE,
    M.chainW(() => M.decodeParam('item', itemId.decode)),
    M.chainTaskEitherKW((id) =>
      pipe(
        prisma((p) =>
          p.item.findFirst({
            rejectOnNotFound: true,
            select: { listId: true },
            where: { list: { users: { some: { user } } }, id },
          })
        ),
        TE.chain((item) =>
          pipe(
            prisma((p) =>
              p.item.deleteMany({ where: { listId: item.listId, id } })
            ),
            TE.map(() => item)
          )
        )
      )
    ),
    M.map((item) => `/lists/${item.listId}`)
  );

export const getItemsLoader = pipe(
  getUser,
  M.bindTo('user'),
  M.bindW('term', () => M.decodeQuery(term.decode)),
  M.chainTaskK(
    ({ term, user }) =>
      () =>
        autocompleteSearchTerm(term, user.id)
  ),
  M.ichainW((items) => json(items)),
  M.orElse(() => json([])),
  toHandler
);

export const itemActions = pipe(
  getUser,
  M.ichainW((user) =>
    pipe(
      updateItem(user),
      M.alt(() => deleteItem(user)),
      M.alt(() => M.right('/'))
    )
  ),
  M.ichain((path) => redirect(path)),
  M.orElse(() => redirect('/signup')),
  toHandler
);
