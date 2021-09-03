import { pipe } from 'fp-ts/function';
import type { These } from 'fp-ts/These';
import type { Option } from 'fp-ts/Option';
import * as E from 'fp-ts/Either';
import * as D from 'io-ts/Decoder';

const sum = D.sum('_tag');
const leftLiteral = D.literal('Left');
const rightLiteral = D.literal('Right');
const bothLiteral = D.literal('Both');
const noneLiteral = D.literal('None');
const someLiteral = D.literal('Some');

export function option<A>(
  value: D.Decoder<unknown, A>
): D.Decoder<unknown, Option<A>> {
  return sum({
    None: D.struct({
      _tag: noneLiteral,
    }),
    Some: D.struct({
      _tag: someLiteral,
      value,
    }),
  });
}

export function either<E, A>(
  left: D.Decoder<unknown, E>,
  right: D.Decoder<unknown, A>
): D.Decoder<unknown, E.Either<E, A>> {
  return sum({
    Left: D.struct({
      _tag: leftLiteral,
      left,
    }),
    Right: D.struct({
      _tag: rightLiteral,
      right,
    }),
  });
}

export function these<E, A>(
  left: D.Decoder<unknown, E>,
  right: D.Decoder<unknown, A>
): D.Decoder<unknown, These<E, A>> {
  return sum({
    Left: D.struct({
      _tag: leftLiteral,
      left,
    }),
    Right: D.struct({
      _tag: rightLiteral,
      right,
    }),
    Both: D.struct({
      _tag: bothLiteral,
      left,
      right,
    }),
  });
}

export function decoderOf<A>(value: A): D.Decoder<unknown, A> {
  return { decode: () => E.right(value) };
}

export function withFallback<A>(
  decoder: D.Decoder<unknown, A>,
  a: A
): D.Decoder<unknown, A> {
  return D.alt(() => decoderOf(a))(decoder);
}

export const BooleanFromString: D.Decoder<unknown, boolean> = pipe(
  D.literal('true', 'false'),
  D.map((s) => s === 'true')
);