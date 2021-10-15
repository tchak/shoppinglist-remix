import {
  PrismaClient as PrismaClientClass,
  PrismaPromise,
} from '@prisma/client';
import * as TE from 'fp-ts/TaskEither';

type PrismaClient = PrismaClientClass<{ rejectOnNotFound: true }, never, true>;

export const PrismaError = 'PrismaError' as const;
export type PrismaError = typeof PrismaError;
export const NotFoundError = 'NotFoundError' as const;
export type NotFoundError = typeof NotFoundError;

// add prisma to the NodeJS global type
interface CustomNodeJsGlobal extends NodeJS.Global {
  __prisma: PrismaClient;
}

// Prevent multiple instances of Prisma Client in development
declare const global: CustomNodeJsGlobal;
const prismaClient =
  global.__prisma || new PrismaClientClass({ rejectOnNotFound: true });

if (process.env.NODE_ENV === 'development') {
  global.__prisma = prismaClient;
}

type PrismaTask<Data> = TE.TaskEither<PrismaError | NotFoundError, Data>;

export function prisma<Data>(
  fn: (prisma: PrismaClient) => PrismaPromise<Data>
): PrismaTask<Data> {
  return TE.tryCatch<PrismaError | NotFoundError, Data>(
    () => fn(prismaClient),
    (e) => {
      if ((e as { name: string }).name == 'NotFoundError') {
        return NotFoundError;
      }
      return PrismaError;
    }
  );
}
