import type { ActionFunction } from 'remix';
import * as Yup from 'yup';

import { withSession, requireUser } from '../sessions';
import { prisma } from '../db';
import { hash, verify } from './argon2.server';
import { parseBody } from './index';

const signUpSchema = Yup.object().shape({
  email: Yup.string().email().required(),
  password: Yup.string().min(6).required(),
});

export const signUpAction: ActionFunction = ({ request }) =>
  withSession(request, (session) =>
    requireUser(
      session,
      () => '/',
      async () => {
        const { data, error } = await parseBody(request, signUpSchema);

        if (data) {
          const user = await prisma.user.create({
            data: { email: data.email, password: await hash(data.password) },
          });
          session.set('user', user.id);
          return '/';
        } else if (error) {
          session.flash('error', error);
          session.unset('user');
          return '/signin';
        }
      }
    )
  );

const signInSchema = Yup.object().shape({
  email: Yup.string().email().required(),
  password: Yup.string().min(6).required(),
});

export const signInAction: ActionFunction = ({ request }) =>
  withSession(request, (session) =>
    requireUser(
      session,
      () => '/',
      async () => {
        const { data, error } = await parseBody(request, signInSchema);

        if (data) {
          const user = await prisma.user.findUnique({
            where: { email: data.email },
          });

          if (user && (await verify(user.password, data.password))) {
            session.set('user', user.id);
          } else {
            const error = new Yup.ValidationError(
              'Wrong email or password',
              data
            );
            session.flash('error', error);
            session.unset('user');
            return '/signin';
          }
          return '/';
        } else if (error) {
          session.flash('error', error);
          session.unset('user');
          return '/signin';
        }
      }
    )
  );
