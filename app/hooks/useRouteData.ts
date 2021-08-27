import { pipe } from 'fp-ts/function';
import * as D from 'io-ts/Decoder';
import * as E from 'fp-ts/Either';
import type { These } from 'fp-ts/These';
import { useLoaderData } from 'remix';

export type RouteData<Data> = These<string, Data>;
export type LoaderDataDecoder<Data> = D.Decoder<unknown, RouteData<Data>>;
export type ActionDataDecoder<Data> = D.Decoder<unknown, RouteData<Data>>;

export function decodeRouteData<Data>(
  decoder: LoaderDataDecoder<Data>,
  data: unknown
): RouteData<Data> {
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

export function useRouteData<Data>(
  decoder: LoaderDataDecoder<Data>
): RouteData<Data> {
  const data = useLoaderData<unknown>();
  return decodeRouteData(decoder, data);
}
