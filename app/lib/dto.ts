import { pipe } from 'fp-ts/function';
import * as D from 'io-ts/Decoder';
import * as ITD from 'io-ts-types-experimental/Decoder';

const item = pipe(
  D.struct({
    id: D.string,
    title: D.string,
    checked: D.boolean,
    note: pipe(D.string, D.nullable),
  }),
  D.readonly
);

const list = pipe(
  D.struct({
    id: D.string,
    title: D.string,
  }),
  D.readonly
);

export const sharedLists = pipe(
  list,
  D.intersect(
    D.struct({
      isShared: D.boolean,
      itemsCount: D.number,
    })
  ),
  D.readonly,
  D.array,
  D.readonly
);

export const listWithItems = pipe(
  list,
  D.intersect(
    D.struct({
      items: pipe(item, D.array, D.readonly),
    })
  ),
  D.readonly
);

export const sharedListsDecoder = ITD.these(D.string, sharedLists);
export const listWithItemsDecoder = ITD.these(D.string, listWithItems);
export const signInDecoder = ITD.these(
  D.string,
  D.struct({ email: D.string, password: D.string })
);
export const signUpDecoder = ITD.these(
  D.string,
  D.struct({ email: D.string, password: D.string })
);

export type Item = D.TypeOf<typeof item>;
export type ListWithItems = D.TypeOf<typeof listWithItems>;
export type SharedLists = D.TypeOf<typeof sharedLists>;
