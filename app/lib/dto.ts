import type { These } from 'fp-ts/These';
import type { Option } from 'fp-ts/Option';

import { pipe } from 'fp-ts/function';
import * as D from 'io-ts/Decoder';

import { these } from './shared';

const item = D.struct({
  id: D.string,
  title: D.string,
  checked: D.boolean,
  note: pipe(D.string, D.nullable),
});

const list = D.struct({
  id: D.string,
  title: D.string,
});

export const sharedLists = D.array(
  pipe(
    list,
    D.intersect(
      D.struct({
        isShared: D.boolean,
        itemsCount: D.number,
      })
    )
  )
);

export const listWithItems = pipe(
  list,
  D.intersect(
    D.struct({
      items: D.array(item),
    })
  )
);

export const sharedListsEither = these(D.string, sharedLists);
export const listWithItemsEither = these(D.string, listWithItems);

export type Item = D.TypeOf<typeof item>;
export type ListWithItems = D.TypeOf<typeof listWithItems>;
export type SharedLists = D.TypeOf<typeof sharedLists>;

type CredentialsDTO = { email: string; password: string };
export type SignInDTO = These<D.DecodeError, Option<CredentialsDTO>>;
export type SignUpDTO = These<D.DecodeError, Option<CredentialsDTO>>;
