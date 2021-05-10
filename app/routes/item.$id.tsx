import type { ActionFunction, LoaderFunction } from 'remix';
import { redirect } from 'remix';
import * as Yup from 'yup';

import { withSession, requireUser } from '../sessions';
import { withBody } from '../withBody';
import { prisma } from '../db';

const updateItemSchema = Yup.object().shape({
  title: Yup.string().optional(),
  checked: Yup.boolean().optional(),
  note: Yup.string().optional(),
});

export const loader: LoaderFunction = () => redirect('/');

export const action: ActionFunction = async ({ request, params }) =>
  withSession(request, (session) =>
    requireUser(session, (user) =>
      withBody(request, (router) =>
        router
          .put(updateItemSchema, async ({ title, checked, note }) => {
            const item = await prisma.item.findFirst({
              select: { listId: true },
              where: { list: { users: { some: { user } } }, id: params.id },
            });
            if (!item) {
              return redirect('/');
            }
            console.log('checked', checked);
            await prisma.item.updateMany({
              where: { listId: item.listId, id: params.id },
              data: { title, checked, note },
            });
            return redirect(`/list/${item.listId}`);
          })
          .delete(async () => {
            const item = await prisma.item.findFirst({
              select: { listId: true },
              where: { list: { users: { some: { user } } }, id: params.id },
            });
            if (!item) {
              return redirect('/');
            }
            await prisma.item.deleteMany({
              where: { listId: item.listId, id: params.id },
            });
            return redirect(`/list/${item.listId}`);
          })
          .error(async () => {
            const item = await prisma.item.findFirst({
              select: { listId: true },
              where: { list: { users: { some: { user } } }, id: params.id },
            });
            if (!item) {
              return redirect('/');
            }
            return redirect(`/list/${item.listId}`);
          })
      )
    )
  );

export default function ItemPage() {
  return null;
}
