import type { LoaderFunction, ActionFunction } from 'remix';
import { useState, useMemo, useEffect } from 'react';
import { useLoaderData, useSubmit } from 'remix';
import { useDebouncedCallback } from 'use-debounce';
import ms from 'ms';
import fetchRetry from 'fetch-retry';

import type { Task } from 'fp-ts/Task';
import type { Option } from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';
import { chain, fromIO } from 'fp-ts/Task';
import { fold } from 'fp-ts/These';
import { findFirst } from 'fp-ts/Array';

import type { MetaFunction } from '../../lib/remix';
import type { Item, ListWithItems, ListDTO } from '../../lib/dto';
import { getListLoader, listActions } from '../../middlewares';
import { foldBoth, foldNullable } from '../../lib/shared';

import { ListTitle } from '../../components/ListTitle';
import { AddItemCombobox } from '../../components/AddItemCombobox';
import {
  ActiveItemsList,
  CheckedOffItemsList,
} from '../../components/ItemsList';
import { ItemDetailDialog } from '../../components/ItemDetailDialog';
import { useRefetchOnWindowFocus, useRefetch } from '../_refetch';

export const meta: MetaFunction<ListDTO> = ({ data }) => {
  return {
    title: foldBoth(
      () => '',
      ({ title }) => title,
      data
    ),
  };
};

export const loader: LoaderFunction = (r) => getListLoader(r);
export const action: ActionFunction = (r) => listActions(r);

export default function ListsShowRoute() {
  useRefetchOnWindowFocus();
  const list = useLoaderData<ListDTO>();

  return pipe(
    list,
    fold(
      () => <div>List not found</div>,
      (list) => <ListItems list={list} />,
      (_, list) => <ListItems list={list} />
    )
  );
}

function ListItems({ list }: { list: ListWithItems }) {
  const {
    item,
    items,
    openItem,
    closeItem,
    createItem,
    toggleItem,
    deleteItem,
  } = useItems(list);
  const activeItems = useMemo(
    () => items.filter(({ checked }) => !checked),
    [items]
  );
  const checkedItems = useMemo(
    () => items.filter(({ checked }) => checked),
    [items]
  );

  return (
    <div>
      <ListTitle list={list} />
      <AddItemCombobox onSelect={createItem} />

      <ActiveItemsList
        items={activeItems}
        onToggle={toggleItem}
        onRemove={deleteItem}
        onOpen={openItem}
      />

      <CheckedOffItemsList
        items={checkedItems}
        onToggle={toggleItem}
        onRemove={deleteItem}
        onOpen={openItem}
      />

      {foldNullable(
        (item) => (
          <ItemDetailDialog item={item} onDismiss={closeItem} />
        ),
        item
      )}
    </div>
  );
}

function useSelectedItem(
  items: Item[]
): [Option<Item>, (id: string) => void, () => void] {
  const [itemId, setItemId] = useState<string>();
  const item = useMemo(
    () =>
      pipe(
        items,
        findFirst((item) => item.id == itemId)
      ),
    [itemId, items]
  );
  const openItem = (id: string) => setItemId(id);
  const closeItem = () => setItemId(undefined);

  return [item, openItem, closeItem];
}

function useItems(list: ListWithItems) {
  const submit = useSubmit();
  const refetch = useDebouncedCallback(useRefetch(), ms('5 seconds'));
  const [items, setItems] = useState(list.items);
  const [item, openItem, closeItem] = useSelectedItem(items);

  useEffect(() => {
    setItems(list.items);
  }, [list]);

  return {
    item,
    items,
    openItem,
    closeItem,
    createItem: (title: string) =>
      submit({ title }, { replace: true, method: 'post' }),
    toggleItem: (id: string, checked: boolean) => {
      const body = new URLSearchParams({ checked: String(checked) });
      pipe(
        fetchItem(id, 'put', body),
        chain(() => fromIO(refetch))
      )();
      setItems((items) =>
        items.map((item) => (item.id == id ? { ...item, checked } : item))
      );
    },
    deleteItem: (id: string) => {
      pipe(
        fetchItem(id, 'delete'),
        chain(() => fromIO(refetch))
      )();
      setItems((items) => items.filter((item) => item.id != id));
    },
  };
}

const fetchWithRetry = fetchRetry(fetch);

function fetchItem(
  id: string,
  method: 'put' | 'delete',
  body?: URLSearchParams
): Task<boolean> {
  return () => {
    const url = new URL(`/items/${id}`, location.toString());
    url.searchParams.set('_data', 'routes/items/$item');
    return fetchWithRetry(url.toString(), {
      method,
      body,
      retries: 3,
      retryDelay: (attempt) => Math.pow(2, attempt) * 1000,
    }).then(
      (response) => response.ok,
      () => false
    );
  };
}
