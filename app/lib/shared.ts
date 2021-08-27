import { pipe } from 'fp-ts/function';
import * as TH from 'fp-ts/These';
import * as O from 'fp-ts/Option';

export function foldNullable<A, B>(
  fa: (a: A) => B,
  option: O.Option<A>
): B | null {
  return pipe(option, O.map(fa), O.toNullable);
}

export function foldBoth<E, A, B>(
  fe: () => B,
  fa: (a: A) => B,
  these: TH.These<E, A>
): B {
  return pipe(these, TH.getRight, O.fold(fe, fa));
}

export function foldError<E, A, B>(
  fe: (e: E) => B,
  these: TH.These<E, A>
): B | null {
  return pipe(these, TH.getLeft, O.map(fe), O.toNullable);
}

export function foldDefaultValue<E, A>(
  f: (a: A) => string,
  these: TH.These<E, O.Option<A>>
): string {
  return pipe(
    these,
    TH.getRight,
    O.chain((a) => a),
    O.map(f),
    O.getOrElse(() => '')
  );
}
