import type { MetaFunction as R_MetaFunction } from 'remix';

export type MetaFunction<Data = void> = (
  args: Omit<Parameters<R_MetaFunction>[0], 'data'> & { data: Data }
) => Record<string, string>;
