import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import * as TH from 'fp-ts/These';
import * as M from 'hyper-ts/lib/Middleware';
import * as D from 'io-ts/Decoder';

import { getUser, toHandler, UnauthorizedError } from '../lib/sessions';
import { NotFoundError, prisma } from '../lib/db';
import {
  POST,
  PUT,
  DELETE,
  redirect,
  json,
  MethodNotAllowed,
} from '../lib/hyper';
import { autocompleteAddTerm, autocompleteSearchTerm } from './autocomplete';
import * as ITD from '../lib/Decoder';

const termQuery = pipe(
  D.struct({ term: D.string }),
  D.map(({ term }) => term)
);
const listQuery = pipe(
  D.struct({ list: ITD.UUID }),
  D.map(({ list }) => list)
);
const createItemBody = D.struct({ title: ITD.NonEmptyString });
const updateItemBody = D.partial({
  title: ITD.NonEmptyString,
  note: D.string,
  checked: ITD.BooleanFromString,
});
const listId = ITD.UUID;
const itemId = ITD.UUID;

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
    POST,
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
    PUT,
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
    DELETE,
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
    DELETE,
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
  M.ichainW((items) => json(items)),
  M.orElse(() => json([])),
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
  M.ichainW((item) => redirect(`/lists/${item.listId}`)),
  M.orElse((error) => {
    if (error == UnauthorizedError) {
      return redirect('/signin');
    } else if (error == MethodNotAllowed || error == NotFoundError) {
      return redirect('/');
    }
    return json(TH.left('input error'));
  }),
  toHandler
);

export const itemsAction = pipe(
  getUser,
  M.chainW((user) => clearItems(user)),
  M.ichainW((list) => redirect(`/lists/${list.id}`)),
  M.orElse((error) => {
    if (error == UnauthorizedError) {
      return redirect('/signin');
    } else if (error == MethodNotAllowed || error == NotFoundError) {
      return redirect('/');
    }
    return json(TH.left('input error'));
  }),
  toHandler
);
