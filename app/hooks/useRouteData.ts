import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import * as O from 'fp-ts/Option';
import type { These } from 'fp-ts/These';
import * as D from 'io-ts/Decoder';
import {
  useActionData as useRemixActionData,
  useLoaderData as useRemixLoaderData,
} from 'remix';

export function decodeLoaderData<Data>(
  decoder: D.Decoder<unknown, These<string, Data>>,
  data: unknown
): These<string, Data> {
  return pipe(
    decoder.decode(data),
    E.match(
      (e) => {
        throw new Error(D.draw(e));
      },
      (data) => data
    )
  );
}

export function decodeActionData<Data>(
  decoder: D.Decoder<unknown, These<string, Data>>,
  data: unknown
): O.Option<These<string, Data>> {
  if (!data) {
    return O.none;
  }
  return pipe(
    decoder.decode(data),
    E.match(
      (e) => {
        throw new Error(D.draw(e));
      },
      (data) => O.some(data)
    )
  );
}

export function useLoaderData<Data>(
  decoder: D.Decoder<unknown, These<string, Data>>
): These<string, Data> {
  const data = useRemixLoaderData<unknown>();
  return decodeLoaderData(decoder, data);
}

export function useActionData<Data>(
  decoder: D.Decoder<unknown, These<string, Data>>
): O.Option<These<string, Data>> {
  const data = useRemixActionData<unknown>();
  return decodeActionData(decoder, data);
}
