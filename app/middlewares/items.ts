import { pipe } from 'fp-ts/function';
import * as T from 'fp-ts/Task';
import * as TE from 'fp-ts/TaskEither';
import * as TH from 'fp-ts/These';
import * as H from 'hyper-ts-remix';
import * as M from 'hyper-ts-remix/Middleware';
import * as D from 'io-ts/Decoder';
import {
  BooleanFromString,
  NonEmptyString,
  UUID,
} from 'io-ts-types-experimental/Decoder';

import { NotFoundError, prisma } from '../lib/db';
import { getUser, toHandler, UnauthorizedError } from '../lib/sessions';
import { autocompleteAddTerm, autocompleteSearchTerm } from './autocomplete';

const termQuery = pipe(
  D.struct({ term: D.string }),
  D.map(({ term }) => term)
);
const listQuery = pipe(
  D.struct({ list: UUID }),
  D.map(({ list }) => list)
);
const createItemBody = D.struct({ title: NonEmptyString });
const updateItemBody = D.partial({
  title: NonEmptyString,
  note: D.string,
  checked: BooleanFromString,
});
const listId = UUID;
const itemId = UUID;

const findItem = (id: string, user: { id: string }) =>
  prisma((p) =>
    p.item.findFirst({
      select: { id: true, listId: true },
      where: { list: { users: { some: { user } } }, id },
    })
  );

const findList = (id: string, user: { id: string }) =>
  prisma((p) =>
    p.list.findFirst({
      where: { id, users: { some: { user } } },
      select: { id: true, users: { select: { userId: true } } },
    })
  );

export const createItem = (user: { id: string }) =>
  pipe(
    M.POST,
    M.bindW('id', () => M.decodeParam('list', listId.decode)),
    M.bindW('body', () => M.decodeBody(createItemBody.decode)),
    M.chainTaskEitherKW(({ id, body }) =>
      pipe(
        findList(id, user),
        TE.chain((list) =>
          pipe(
            prisma((p) =>
              p.item.create({
                data: { list: { connect: { id } }, ...body },
              })
            ),
            TE.chainFirstTaskK(() =>
              T.sequenceArray(
                list.users.map(({ userId }) =>
                  autocompleteAddTerm(body.title, userId)
                )
              )
            ),
            TE.map(() => `/lists/${id}`)
          )
        )
      )
    )
  );

const updateItem = (user: { id: string }) =>
  pipe(
    M.PUT,
    M.bindW('id', () => M.decodeParam('item', itemId.decode)),
    M.bindW('body', () => M.decodeBody(updateItemBody.decode)),
    M.chainTaskEitherKW(({ id, body }) =>
      pipe(
        findItem(id, user),
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
    )
  );

const deleteItem = (user: { id: string }) =>
  pipe(
    M.DELETE,
    M.chainW(() => M.decodeParam('item', itemId.decode)),
    M.chainTaskEitherKW((id) =>
      pipe(
        findItem(id, user),
        TE.chain((item) =>
          pipe(
            prisma((p) =>
              p.item.deleteMany({ where: { listId: item.listId, id } })
            ),
            TE.map(() => item)
          )
        )
      )
    )
  );

const clearItems = (user: { id: string }) =>
  pipe(
    M.DELETE,
    M.chainW(() => M.decodeBody(listQuery.decode)),
    M.chainTaskEitherKW((id) =>
      pipe(
        findList(id, user),
        TE.chain((list) =>
          pipe(
            prisma((p) =>
              p.item.deleteMany({ where: { listId: list.id, checked: true } })
            ),
            TE.map(() => list)
          )
        )
      )
    )
  );

export const getItemsLoader = pipe(
  getUser,
  M.bindTo('user'),
  M.bindW('term', () => M.decodeQuery(termQuery.decode)),
  M.chainTaskK(({ term, user }) => autocompleteSearchTerm(term, user.id)),
  M.ichainW((items) => M.sendJson(items)),
  M.orElse(() => M.sendJson([])),
  toHandler
);

export const itemActions = pipe(
  getUser,
  M.chainW((user) =>
    pipe(
      updateItem(user),
      M.alt(() => deleteItem(user))
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

export const itemsActions = pipe(
  getUser,
  M.chainW((user) => clearItems(user)),
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
