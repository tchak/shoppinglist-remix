import {
  PrismaClient as PrismaClientClass,
  PrismaPromise,
} from '@prisma/client';

import * as TE from 'fp-ts/TaskEither';

type PrismaClient = PrismaClientClass<{ rejectOnNotFound: true }, never, true>;

export const PrismaError = 'PrismaError' as const;
export type PrismaError = typeof PrismaError;

// add prisma to the NodeJS global type
interface CustomNodeJsGlobal extends NodeJS.Global {
  _prisma: PrismaClient;
}

// Prevent multiple instances of Prisma Client in development
declare const global: CustomNodeJsGlobal;
const _prisma =
  global._prisma || new PrismaClientClass({ rejectOnNotFound: true });

if (process.env.NODE_ENV === 'development') {
  global._prisma = _prisma;
}

export function prisma<Data>(
  lazy: (prisma: PrismaClient) => PrismaPromise<Data>
): TE.TaskEither<PrismaError, Data>;
export function prisma<Data>(
  lazy: (prisma: PrismaClient) => PrismaPromise<Data>[]
): TE.TaskEither<PrismaError, Data[]>;
export function prisma<Data>(
  lazy: (prisma: PrismaClient) => PrismaPromise<Data> | PrismaPromise<Data>[]
): TE.TaskEither<PrismaError, Data | Data[]> {
  return TE.tryCatch<PrismaError, Data | Data[]>(
    () => {
      const promise = lazy(_prisma);
      if (Array.isArray(promise)) {
        return _prisma.$transaction(promise);
      }
      return promise;
    },
    () => PrismaError
  );
}
