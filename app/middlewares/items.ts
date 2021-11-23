import { pipe } from 'fp-ts/function';
import * as T from 'fp-ts/Task';
import * as TE from 'fp-ts/TaskEither';
import * as TH from 'fp-ts/These';
import * as D from 'io-ts/Decoder';
import {
  BooleanFromString,
  NonEmptyString,
  UUID,
} from 'io-ts-types-experimental/Decoder';

import { NotFoundError, prisma } from '~/lib/db';
import * as H from '~/lib/hyper';
import { getUser, toHandler, UnauthorizedError } from '~/lib/sessions';

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
    H.POST,
    H.bindW('id', () => H.decodeParam('list', listId.decode)),
    H.bindW('body', () => H.decodeBody(createItemBody.decode)),
    H.chainTaskEitherKW(({ id, body }) =>
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
    H.PUT,
    H.bindW('id', () => H.decodeParam('item', itemId.decode)),
    H.bindW('body', () => H.decodeBody(updateItemBody.decode)),
    H.chainTaskEitherKW(({ id, body }) =>
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
    H.DELETE,
    H.chainW(() => H.decodeParam('item', itemId.decode)),
    H.chainTaskEitherKW((id) =>
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
    H.DELETE,
    H.chainW(() => H.decodeBody(listQuery.decode)),
    H.chainTaskEitherKW((id) =>
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
  H.bindTo('user'),
  H.bindW('term', () => H.decodeQuery(termQuery.decode)),
  H.chainTaskK(({ term, user }) => autocompleteSearchTerm(term, user.id)),
  H.chainW((items) => H.json(items)),
  H.orElse(() => H.json([])),
  toHandler
);

export const itemActions = pipe(
  getUser,
  H.chainW((user) =>
    pipe(
      updateItem(user),
      H.alt(() => deleteItem(user))
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

export const itemsActions = pipe(
  getUser,
  H.chainW((user) => clearItems(user)),
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
