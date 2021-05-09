import type { ActionFunction, LoaderFunction } from 'remix';
import { redirect } from 'remix';

import { withSession, requireUser } from '../sessions';
import { prisma } from '../db';

export const loader: LoaderFunction = () => redirect('/');

export const action: ActionFunction = async ({ request, params }) =>
  withSession(request, (session) =>
    requireUser(session, async (user) => {
      const method = request.method.toLowerCase();
      const body = new URLSearchParams(await request.text());
      const { title, checked, note } = Object.fromEntries(body);

      const item = await prisma.item.findFirst({
        select: { listId: true },
        where: { list: { users: { some: { user } } }, id: params.id },
      });
      if (!item) {
        return redirect('/');
      }

      if (method == 'put') {
        await prisma.item.updateMany({
          where: { listId: item.listId, id: params.id },
          data: { title, checked: toBoolean(checked), note },
        });
      } else if (method == 'delete') {
        await prisma.item.deleteMany({
          where: { listId: item.listId, id: params.id },
        });
      }

      return redirect(`/list/${item.listId}`);
    })
  );

export default function ItemPage() {
  return null;
}

function toBoolean(value: string | undefined): boolean | undefined {
  if (value == undefined) {
    return value;
  }
  return value == 'on';
}
