import * as A from 'fp-ts/Array';
import { pipe } from 'fp-ts/function';
import type { IO } from 'fp-ts/IO';
import * as O from 'fp-ts/Option';
import * as T from 'fp-ts/Task';
import * as TE from 'fp-ts/TaskEither';
import Cache from 'lru-cache';
import { matchSorter } from 'match-sorter';

import list from '../data/food-list.json';
import { prisma } from '../lib/db';

type Store = [Set<string>, string[]];
const cache = new Cache<string, Store>({
  max: 100,
  noDisposeOnSet: true,
  updateAgeOnGet: true,
});

function getStore(userId: string): O.Option<Store> {
  return O.fromNullable(cache.get(userId));
}

function setStore(userId: string, set: Set<string>): IO<void> {
  return () => cache.set(userId, [set, [...set]]);
}

function modifyStore(
  store: Store,
  f: (add: (term: string) => void) => void
): Store {
  return pipe(store, ([set]) => {
    f((term: string) => set.add(term));
    return [set, [...set]];
  });
}

function getUserStore(userId: string): T.Task<Store> {
  return pipe(
    getStore(userId),
    O.match(
      () => {
        const set = new Set(list);
        return pipe(
          prisma((p) =>
            p.item.findMany({
              select: { title: true },
              distinct: ['title'],
              where: {
                list: { users: { some: { userId } } },
                title: { notIn: [...set] },
              },
            })
          ),
          TE.chainIOK((items) => {
            for (const { title } of items) {
              set.add(title);
            }
            return setStore(userId, set);
          }),
          TE.match(
            () => [set, [...set]],
            () => [set, [...set]]
          )
        );
      },
      (store) => T.of(store)
    )
  );
}

export function autocompleteSearchTerm(
  term: string,
  userId: string
): T.Task<string[]> {
  return pipe(
    getUserStore(userId),
    T.map(([, store]) => matchSorter(store, term)),
    T.map((items) => pipe(items, A.takeLeft(8)))
  );
}

export function autocompleteAddTerm(
  term: string,
  userId: string
): T.Task<void> {
  return pipe(
    getUserStore(userId),
    T.map((store) => modifyStore(store, (add) => add(term))),
    T.chainIOK(([set]) => setStore(userId, set))
  );
}
