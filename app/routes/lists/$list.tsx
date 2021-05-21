import { useState, useMemo, useEffect } from 'react';
import type { MetaFunction, LoaderFunction, ActionFunction } from 'remix';
import { useRouteData, useSubmit } from 'remix';
import { useDebouncedCallback } from 'use-debounce';
import ms from 'ms';
import fetchRetry from 'fetch-retry';

import { getListLoader, GetListData as RouteData } from '../../loaders';
import { listActions } from '../../actions';

import { ListTitle } from '../../components/ListTitle';
import { AddItemCombobox } from '../../components/AddItemCombobox';
import {
  ActiveItemsList,
  CheckedOffItemsList,
} from '../../components/ItemsList';
import { ItemDetailDialog } from '../../components/ItemDetailDialog';
import { useRefetchOnWindowFocus, useRefetch } from '../_refetch';

export const meta: MetaFunction = ({ data }: { data: RouteData }) => {
  return { title: data.list.title };
};

export const loader: LoaderFunction = (params) => getListLoader(params);
export const action: ActionFunction = (params) => listActions(params);

export default function ListsShowRoute() {
  useRefetchOnWindowFocus();

  const { list } = useRouteData<RouteData>();
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

      {item && <ItemDetailDialog item={item} onDismiss={closeItem} />}
    </div>
  );
}

function useSelectedItem(
  items: RouteData['list']['items']
): [RouteData['list']['items'][0] | null, (id: string) => void, () => void] {
  const [itemId, setItemId] = useState<string>();
  const item = useMemo(
    () => items.find((item) => item.id == itemId) ?? null,
    [itemId, items]
  );
  const openItem = (id: string) => setItemId(id);
  const closeItem = () => setItemId(undefined);

  return [item, openItem, closeItem];
}

function useItems(list: RouteData['list']) {
  const submit = useSubmit();
  const refetch = useDebouncedCallback(useRefetch(), ms('5 seconds'));
  const [items, setItems] = useState(list.items);
  const [item, openItem, closeItem] = useSelectedItem(list.items);

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
      fetchItem(id, 'put', body).finally(() => refetch());
      setItems((items) =>
        items.map((item) => (item.id == id ? { ...item, checked } : item))
      );
    },
    deleteItem: (id: string) => {
      fetchItem(id, 'delete').finally(() => refetch());
      setItems((items) => items.filter((item) => item.id != id));
    },
  };
}

const fetchWithRetry = fetchRetry(fetch);

function fetchItem(
  id: string,
  method: 'put' | 'delete',
  body?: URLSearchParams
) {
  const url = new URL(`/items/${id}`, location.toString());
  url.searchParams.set('_data', 'routes/items/$item');
  return fetchWithRetry(url.toString(), {
    method,
    body,
    retries: 3,
    retryDelay: (attempt) => Math.pow(2, attempt) * 1000,
  });
}
