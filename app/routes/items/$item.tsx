import type { ActionFunction, LoaderFunction } from 'remix';
import { redirect } from 'remix';
import * as Yup from 'yup';

import { withSession, requireUser } from '../../sessions';
import { withBody } from '../../withBody';
import { prisma } from '../../db';

const updateItemSchema = Yup.object().shape({
  title: Yup.string().optional(),
  checked: Yup.boolean().optional(),
  note: Yup.string().optional(),
});

export const loader: LoaderFunction = () => redirect('/');

export const action: ActionFunction = async ({
  request,
  params: { item: itemId },
}) =>
  withSession(request, (session) =>
    requireUser(session, (user) =>
      withBody(request, (router) =>
        router
          .put(updateItemSchema, async ({ title, checked, note }) => {
            const item = await prisma.item.findFirst({
              select: { listId: true },
              where: { list: { users: { some: { user } } }, id: itemId },
            });
            if (!item) {
              return '/';
            }
            await prisma.item.updateMany({
              where: { listId: item.listId, id: itemId },
              data: { title, checked, note },
            });
            return `/lists/${item.listId}`;
          })
          .delete(async () => {
            const item = await prisma.item.findFirst({
              select: { listId: true },
              where: { list: { users: { some: { user } } }, id: itemId },
            });
            if (!item) {
              return '/';
            }
            await prisma.item.deleteMany({
              where: { listId: item.listId, id: itemId },
            });
            return `/lists/${item.listId}`;
          })
          .error(async () => {
            const item = await prisma.item.findFirst({
              select: { listId: true },
              where: { list: { users: { some: { user } } }, id: itemId },
            });
            if (!item) {
              return '/';
            }
            return `/lists/${item.listId}`;
          })
      )
    )
  );

export default function ItemsShowRoute() {
  return null;
}
