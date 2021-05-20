import { redirect, Response } from 'remix';
import { prisma, List, Item } from '../db';

export async function getLists(user: {
  id: string;
}): Promise<(List & { isShared: boolean })[]> {
  const lists = await prisma.list.findMany({
    where: { users: { some: { user } } },
    orderBy: { createdAt: 'desc' },
  });
  return lists.map((list) => ({
    ...list,
    isShared: list.userId != user.id,
  }));
}

export async function getList(
  id: string,
  user: { id: string }
): Promise<(List & { items: Item[] }) | Response> {
  const list = await prisma.list.findFirst({
    where: { id },
    include: {
      users: { select: { userId: true } },
      items: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!list) {
    return redirect('/');
  }
  const userIds = list.users.map(({ userId }) => userId);
  if (!userIds.includes(user.id)) {
    await prisma.userList.create({
      data: { userId: user.id, listId: list.id },
    });
  }
  return list;
}
