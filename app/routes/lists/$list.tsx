import { useState, useMemo } from 'react';
import type { MetaFunction, LoaderFunction, ActionFunction } from 'remix';
import { useRouteData, useSubmit } from 'remix';

import { getListLoader, GetListData as RouteData } from '../../loaders';
import { listActions } from '../../actions';

import { ListTitle } from '../../components/ListTitle';
import { AddItemCombobox } from '../../components/AddItemCombobox';
import {
  ActiveItemsList,
  CheckedOffItemsList,
} from '../../components/ItemsList';
import { ItemDetailDialog } from '../../components/ItemDetailDialog';
import { useRefetchOnWindowFocus } from '../_refetch';

export const meta: MetaFunction = ({ data }: { data: RouteData }) => {
  return { title: data.title };
};

export const loader: LoaderFunction = (params) => getListLoader(params);
export const action: ActionFunction = (params) => listActions(params);

export default function ListsShowRoute() {
  const data = useRouteData<RouteData>();
  useRefetchOnWindowFocus();

  const { addItem, toggleItem, deleteItem } = useItemMutations();

  const [item, onOpen, onClose] = useItem(data.items);
  const items = data.items.filter(({ checked }) => !checked);
  const checkedItems = data.items.filter(({ checked }) => checked);

  return (
    <div>
      <ListTitle list={data} />
      <AddItemCombobox onSelect={(title) => addItem(title)} />

      <ActiveItemsList
        items={items}
        onToggle={toggleItem}
        onRemove={deleteItem}
        onOpen={onOpen}
      />

      <CheckedOffItemsList
        items={checkedItems}
        onToggle={toggleItem}
        onRemove={deleteItem}
        onOpen={onOpen}
      />

      {item && <ItemDetailDialog item={item} onDismiss={onClose} />}
    </div>
  );
}

function useItem(
  items: RouteData['items']
): [RouteData['items'][0] | null, (id: string) => void, () => void] {
  const [itemId, setItemId] = useState<string>();
  const item = useMemo(
    () => items.find((item) => item.id == itemId) ?? null,
    [itemId, items]
  );
  const open = (id: string) => setItemId(id);
  const close = () => setItemId(undefined);

  return [item, open, close];
}

function useItemMutations() {
  const submit = useSubmit();

  const addItem = (title: string) =>
    submit({ title }, { replace: true, method: 'post' });
  const toggleItem = (id: string, checked: boolean) =>
    submit(
      { checked: checked == true ? 'true' : 'false' },
      { action: `/items/${id}`, replace: true, method: 'put' }
    );
  const deleteItem = (id: string) =>
    submit({}, { action: `/items/${id}`, replace: true, method: 'delete' });

  return { addItem, toggleItem, deleteItem };
}
