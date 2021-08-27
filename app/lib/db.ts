import { PrismaClient, Prisma, PrismaPromise } from '@prisma/client';

import type { TaskEither } from 'fp-ts/TaskEither';
import type { TaskOption } from 'fp-ts/TaskOption';
import { tryCatch as TE_tryCatch } from 'fp-ts/TaskEither';
import { tryCatch as TO_tryCatch } from 'fp-ts/TaskOption';

// add prisma to the NodeJS global type
interface CustomNodeJsGlobal extends NodeJS.Global {
  _prisma: PrismaClient;
}

// Prevent multiple instances of Prisma Client in development
declare const global: CustomNodeJsGlobal;
const _prisma = global._prisma || new PrismaClient();

if (process.env.NODE_ENV === 'development') {
  global._prisma = _prisma;
}

export type PrismaError =
  | Prisma.PrismaClientKnownRequestError
  | Prisma.PrismaClientUnknownRequestError
  | Prisma.PrismaClientValidationError
  | Prisma.PrismaClientRustPanicError;

export function prisma<Data>(
  lazy: (prisma: PrismaClient) => PrismaPromise<Data>
): TaskEither<PrismaError, Data>;
export function prisma<Data>(
  lazy: (prisma: PrismaClient) => PrismaPromise<Data>[]
): TaskEither<PrismaError, Data[]>;
export function prisma<Data>(
  lazy: (prisma: PrismaClient) => PrismaPromise<Data> | PrismaPromise<Data>[]
): TaskEither<PrismaError, Data | Data[]> {
  return TE_tryCatch<PrismaError, Data | Data[]>(
    () => {
      const promise = lazy(_prisma);
      if (Array.isArray(promise)) {
        return _prisma.$transaction(promise);
      }
      return promise;
    },
    (e: unknown) => e as PrismaError
  );
}

export function prismaO<Data>(
  lazy: (prisma: PrismaClient) => PrismaPromise<Data>
): TaskOption<Data>;
export function prismaO<Data>(
  lazy: (prisma: PrismaClient) => PrismaPromise<Data>[]
): TaskOption<Data[]>;
export function prismaO<Data>(
  lazy: (prisma: PrismaClient) => PrismaPromise<Data> | PrismaPromise<Data>[]
): TaskOption<Data | Data[]> {
  return TO_tryCatch<Data | Data[]>(() => {
    const promise = lazy(_prisma);
    if (Array.isArray(promise)) {
      return _prisma.$transaction(promise);
    }
    return promise;
  });
}
