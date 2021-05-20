import { useState } from 'react';
import type {
  MetaFunction,
  LoaderFunction,
  ActionFunction,
  Response,
} from 'remix';
import { useRouteData, useSubmit } from 'remix';
import * as Yup from 'yup';

import { withSession, requireUser } from '../../sessions';
import { withBody } from '../../withBody';
import { prisma, List, Item } from '../../db';
import { autocompleteAddTerm } from '../../lib/autocomplete.server';
import { getList } from '../../loaders';

import { ListTitle } from '../../components/ListTitle';
import { AddItemCombobox } from '../../components/AddItemCombobox';
import {
  ActiveItemsList,
  CheckedOffItemsList,
} from '../../components/ItemsList';
import { ItemDetailDialog } from '../../components/ItemDetailDialog';
import { useRefetchOnWindowFocus } from '../_refetch';

type RouteData = List & { items: Item[] };

const createItemSchema = Yup.object().shape({
  title: Yup.string().required(),
});

const updateListSchema = Yup.object().shape({
  title: Yup.string().required(),
});

function useListMutations() {
  const submit = useSubmit();

  const updateListTitle = (title: string) =>
    submit({ title }, { replace: true, method: 'put' });
  const updateItemTitle = (id: string, title: string) =>
    submit({ title }, { action: `/items/${id}`, replace: true, method: 'put' });
  const updateItemNote = (id: string, note: string) =>
    submit({ note }, { action: `/items/${id}`, replace: true, method: 'put' });
  const addItem = (title: string) =>
    submit({ title }, { replace: true, method: 'post' });
  const toggleItem = (id: string, checked: boolean) =>
    submit(
      { checked: checked == true ? 'true' : 'false' },
      { action: `/items/${id}`, replace: true, method: 'put' }
    );
  const deleteItem = (id: string) =>
    submit({}, { action: `/items/${id}`, replace: true, method: 'delete' });

  return {
    updateListTitle,
    updateItemTitle,
    updateItemNote,
    addItem,
    toggleItem,
    deleteItem,
  };
}

export const meta: MetaFunction = ({ data }: { data: RouteData }) => {
  return { title: data.title };
};

export const loader: LoaderFunction = ({ request, params: { list: listId } }) =>
  withSession(request, (session) =>
    requireUser(
      session,
      async (user): Promise<RouteData | Response> => getList(listId, user)
    )
  );

export const action: ActionFunction = async ({
  request,
  params: { list: listId },
}) =>
  withSession(request, (session) =>
    requireUser(session, (user) =>
      withBody(request, (router) =>
        router
          .post(createItemSchema, async ({ title }) => {
            const list = await prisma.list.findFirst({
              where: { id: listId, users: { some: { user } } },
              select: { id: true, users: { select: { userId: true } } },
            });
            if (!list) {
              return '/';
            }
            await prisma.item.create({
              data: { list: { connect: { id: listId } }, title },
            });
            for (const userId of list.users.map(({ userId }) => userId)) {
              await autocompleteAddTerm(title, userId);
            }

            return `/lists/${listId}`;
          })
          .put(updateListSchema, async ({ title }) => {
            await prisma.list.updateMany({
              where: { id: listId, users: { some: { user } } },
              data: { title },
            });
            return `/lists/${listId}`;
          })
          .delete(async () => {
            await prisma.$transaction([
              prisma.userList.deleteMany({
                where: { list: { id: listId, user } },
              }),
              prisma.item.deleteMany({
                where: { list: { id: listId, user } },
              }),
              prisma.list.deleteMany({ where: { id: listId, user } }),
            ]);
            return '/lists';
          })
          .error((error) => {
            session.flash('error', error);
            return `/lists/${listId}`;
          })
      )
    )
  );

export default function ListsShowRoute() {
  const [openItem, setOpenItem] = useState<Item | undefined>();
  const list = useRouteData<RouteData>();
  const {
    updateListTitle,
    updateItemTitle,
    updateItemNote,
    addItem,
    toggleItem,
    deleteItem,
  } = useListMutations();
  useRefetchOnWindowFocus();

  const onOpen = (id: string) =>
    setOpenItem(list.items.find((item) => item.id == id));
  const onClose = () => setOpenItem(undefined);
  const items = list.items.filter(({ checked }) => !checked);
  const checkedItems = list.items.filter(({ checked }) => checked);

  return (
    <div>
      <ListTitle
        title={list.title}
        onChange={(title) => updateListTitle(title)}
      />

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

      {openItem && (
        <ItemDetailDialog
          item={openItem}
          onChangeTitle={(title: string) => updateItemTitle(openItem.id, title)}
          onChangeNote={(note: string) => updateItemNote(openItem.id, note)}
          onDismiss={onClose}
        />
      )}
    </div>
  );
}
