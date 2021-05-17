import Fuse from 'fuse.js';
import Cache from 'lru-cache';

import index from './autocomplete/food-index.json';
import list from './autocomplete/food-list.json';

import { prisma } from '../db';

type FuseJSONIndex = { keys: string[]; records: Fuse.FuseIndexRecords };

const baseList: string[] = list as any;
const baseIndex: FuseJSONIndex = index as any;

const cache = new Cache<string, Fuse<string>>({
  max: 100,
  noDisposeOnSet: true,
  updateAgeOnGet: true,
});

async function autocompleteForUser(userId: string): Promise<Fuse<string>> {
  let fuse = cache.get(userId);
  if (!fuse) {
    const index = Fuse.parseIndex(baseIndex);
    fuse = new Fuse<string>(baseList, {}, index);
    const items = await prisma.item.findMany({
      select: { title: true },
      distinct: ['title'],
      where: { list: { users: { some: { userId } } } },
    });
    for (const { title } of items) {
      fuse.add(title);
    }
    cache.set(userId, fuse);
  }
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
