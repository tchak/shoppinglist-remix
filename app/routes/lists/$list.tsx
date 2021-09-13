import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import type { Option } from 'fp-ts/Option';
import * as O from 'fp-ts/Option';
import * as A from 'fp-ts/ReadonlyArray';
import * as TH from 'fp-ts/These';
import * as D from 'io-ts/Decoder';
import { BooleanFromString } from 'io-ts-types-experimental/Decoder';
import { useMemo, useState } from 'react';
import type { ActionFunction, LoaderFunction, MetaFunction } from 'remix';
import { useSubmit, useTransition, useTransitions } from 'remix';

import {
  ActiveItemsList,
  AddItemCombobox,
  CheckedOffItemsList,
  ItemDetailDialog,
  ListTitle,
} from '../../components';
import { useRevalidateOnWindowFocus } from '../../hooks/useRevalidate';
import { decodeLoaderData, useLoaderData } from '../../hooks/useRouteData';
import { Item, ListWithItems, listWithItemsDecoder } from '../../lib/dto';
import { getListLoader, listActions } from '../../middlewares';

export const meta: MetaFunction = ({ data }) => {
  return {
    title: pipe(
      decodeLoaderData(listWithItemsDecoder, data),
      TH.match(
        () => '',
        ({ title }) => title,
        (_, { title }) => title
      )
    ),
  };
};

export const loader: LoaderFunction = (r) => getListLoader(r);
export const action: ActionFunction = (r) => listActions(r);

export default function Lists$ListRouteComponent() {
  useRevalidateOnWindowFocus();
  return pipe(
    useLoaderData(listWithItemsDecoder),
    TH.match(
      () => <div>List not found</div>,
      (list) => <ListWithItemsComponent list={list} />,
      (_, list) => <ListWithItemsComponent list={list} />
    )
  );
}

function ListWithItemsComponent({ list }: { list: ListWithItems }) {
  const [items, createItem] = useItems(list);
  const [item, openItem, closeItem] = useSelectedItem(items);
  const isChecked = useCheckedItem();
  const activeItems = items.filter((item) => !isChecked(item));
  const checkedItems = items.filter((item) => isChecked(item));

  return (
    <div>
      <ListTitle list={list} />
      <AddItemCombobox onSelect={createItem} />
      <ActiveItemsList items={activeItems} onOpen={openItem} />
      <CheckedOffItemsList list={list} items={checkedItems} onOpen={openItem} />
      {pipe(
        item,
        O.match(
          () => null,
          (item) => <ItemDetailDialog item={item} onDismiss={closeItem} />
        )
      )}
    </div>
  );
}

function useCheckedItem() {
  const transitions = useTransitions();
  return (item: { id: string; checked: boolean }) => {
    const transition = transitions.get(`${item.id}-toggle`);
    if (transition?.state == 'submitting') {
      return pipe(
        BooleanFromString.decode(transition.formData.get('checked')),
        E.getOrElse(() => false)
      );
    }
    return item.checked;
  };
}

function useSelectedItem(
  items: readonly Item[]
): [Option<Item>, (id: string) => void, () => void] {
  const [itemId, setItemId] = useState<string>();
  const item = useMemo(
    () =>
      pipe(
        items,
        A.findFirst((item) => item.id == itemId)
      ),
    [itemId, items]
  );
  const openItem = (id: string) => setItemId(id);
  const closeItem = () => setItemId(undefined);

  return [item, openItem, closeItem];
}

function useItems(
  list: ListWithItems
): [ListWithItems['items'], (title: string) => void] {
  const submit = useSubmit('item-create');
  const transition = useTransition('item-create');

  return [
    transition.state == 'submitting'
      ? [
          {
            id: '-1',
            title: pipe(
              D.string.decode(transition.formData.get('title')),
              E.getOrElse(() => '')
            ),
            checked: true,
            note: '',
          },
          ...list.items,
        ]
      : list.items,
    (title: string) => submit({ title }, { replace: true, method: 'post' }),
  ];
}
