import type { BaseSchema } from 'yup';
import type { Request, Session, ActionFunction } from 'remix';
import * as Yup from 'yup';

import { autocompleteAddTerm } from '../loaders/autocomplete';
import { withSession, requireUser } from '../sessions';
import { prisma, User } from '../db';

export * from './auth';

export const listsActions: ActionFunction = ({ request }) =>
  withSession(request, (session) =>
    requireUser(session, async (user) => {
      switch (request.method.toLowerCase()) {
        case 'post':
          return createListAction(user, request, session);
        default:
          return '/';
      }
    })
  );

export const listActions: ActionFunction = ({
  request,
  params: { list: id },
}) =>
  withSession(request, (session) =>
    requireUser(session, async (user) => {
      switch (request.method.toLowerCase()) {
        case 'post':
          return createItemAction(id, user, request, session);
        case 'put':
          return updateListAction(id, user, request, session);
        case 'delete':
          return deleteListAction(id, user, request, session);
        default:
          return '/';
      }
    })
  );

export const itemActions: ActionFunction = ({
  request,
  params: { item: id },
}) =>
  withSession(request, (session) =>
    requireUser(session, async (user) => {
      switch (request.method.toLowerCase()) {
        case 'put':
          return updateItemAction(id, user, request, session);
        case 'delete':
          return deleteItemAction(id, user, request, session);
        default:
          return '/';
      }
    })
  );

const createListSchema = Yup.object().shape({
  title: Yup.string().required(),
});

async function createListAction(
  user: Pick<User, 'id'>,
  request: Request,
  session: Session
) {
  const { data, error } = await parseBody(request, createListSchema);

  if (data) {
    await prisma.list.create({
      data: {
        userId: user.id,
        users: { create: { userId: user.id } },
        ...data,
      },
    });
  } else if (error) {
    session.flash('error', error);
  }

  return '/';
}

const updateListSchema = Yup.object().shape({
  title: Yup.string().required(),
});

async function updateListAction(
  id: string,
  user: Pick<User, 'id'>,
  request: Request,
  session: Session
) {
  const { data, error } = await parseBody(request, updateListSchema);

  if (data) {
    await prisma.list.updateMany({
      where: { id, users: { some: { user } } },
      data,
    });
  } else if (error) {
    session.flash('error', error);
  }

  return `/lists/${id}`;
}

async function deleteListAction(
  id: string,
  user: Pick<User, 'id'>,
  request: Request,
  session: Session
) {
  await prisma.$transaction([
    prisma.userList.deleteMany({ where: { list: { id, user } } }),
    prisma.item.deleteMany({ where: { list: { id, user } } }),
    prisma.list.deleteMany({ where: { id, user } }),
  ]);

  return '/lists';
}

const createItemSchema = Yup.object().shape({
  title: Yup.string().required(),
});

async function createItemAction(
  id: string,
  user: Pick<User, 'id'>,
  request: Request,
  session: Session
) {
  const list = await prisma.list.findFirst({
    where: { id, users: { some: { user } } },
    select: { id: true, users: { select: { userId: true } } },
  });
  if (!list) {
    return '/';
  }

  const { data, error } = await parseBody(request, createItemSchema);

  if (data) {
    await prisma.item.create({ data: { list: { connect: { id } }, ...data } });
    for (const userId of list.users.map(({ userId }) => userId)) {
      await autocompleteAddTerm(data.title, userId);
    }
  } else if (error) {
    session.flash('error', error);
  }

  return `/lists/${id}`;
}

const updateItemSchema = Yup.object().shape({
  title: Yup.string().optional(),
  checked: Yup.boolean().optional(),
  note: Yup.string().optional(),
});

async function updateItemAction(
  id: string,
  user: Pick<User, 'id'>,
  request: Request,
  session: Session
) {
  const item = await prisma.item.findFirst({
    select: { listId: true },
    where: { list: { users: { some: { user } } }, id },
  });
  if (!item) {
    return '/';
  }

  const { data, error } = await parseBody(request, updateItemSchema);

  if (data) {
    await prisma.item.updateMany({ where: { listId: item.listId, id }, data });
  } else if (error) {
    session.flash('error', error);
  }

  return `/lists/${item.listId}`;
}

async function deleteItemAction(
  id: string,
  user: Pick<User, 'id'>,
  request: Request,
  session: Session
) {
  const item = await prisma.item.findFirst({
    select: { listId: true },
    where: { list: { users: { some: { user } } }, id },
  });
  if (!item) {
    return '/';
  }

  await prisma.item.deleteMany({ where: { listId: item.listId, id } });

  return `/lists/${item.listId}`;
}

export async function parseBody<Input, Output>(
  request: Request,
  schema: BaseSchema<Input, any, Output>
): Promise<{ data?: Output; error?: Yup.ValidationError }> {
  const params = new URLSearchParams(await request.text());
  const body = Object.fromEntries(params);
  return schema.validate(body).then(
    (data) => ({ data }),
    (error) => ({ error })
  );
}
