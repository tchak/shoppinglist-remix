import Fuse from 'fuse.js';
import Cache from 'lru-cache';

import { pipe } from 'fp-ts/function';
import { fromNullable, getOrElse } from 'fp-ts/Option';
import { map } from 'fp-ts/TaskEither';

import index from '../data/food-index.json';
import list from '../data/food-list.json';

import { prisma } from '../lib/db';

type FuseJSONIndex = { keys: string[]; records: Fuse.FuseIndexRecords };

const baseList: string[] = list as any;
const baseIndex: FuseJSONIndex = index as any;

const cache = new Cache<string, Fuse<string>>({
  max: 100,
  noDisposeOnSet: true,
  updateAgeOnGet: true,
});

function getFuse(userId: string): Fuse<string> {
  return pipe(
    fromNullable(cache.get(userId)),
    getOrElse(() => {
      const index = Fuse.parseIndex(baseIndex);
      return new Fuse<string>(baseList, {}, index);
    })
  );
}

async function autocompleteForUser(userId: string): Promise<Fuse<string>> {
  const fuse = getFuse(userId);

  await pipe(
    prisma((p) =>
      p.item.findMany({
        select: { title: true },
        distinct: ['title'],
        where: { list: { users: { some: { userId } } } },
      })
    ),
    map((items) => {
      for (const { title } of items) {
        fuse.add(title);
      }
      cache.set(userId, fuse);
    })
  )();

  return fuse;
}

export async function autocompleteSearchTerm(
  term: string,
  userId: string
): Promise<string[]> {
  const fuse = await autocompleteForUser(userId);
  return fuse.search(term, { limit: 6 }).map((result) => result.item);
}

export async function autocompleteAddTerm(
  term: string,
  userId: string
): Promise<void> {
  const fuse = await autocompleteForUser(userId);
  fuse.add(term);
}
