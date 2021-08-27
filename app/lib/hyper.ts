import type { Request, LoaderFunction } from 'remix';
import type { BodyInit } from 'node-fetch';
import type {
  Connection,
  CookieOptions,
  HeadersOpen,
  ResponseEnded,
  StatusOpen,
} from 'hyper-ts';
import { Headers, Response } from 'remix';
import { MediaType, Status } from 'hyper-ts';
import { Middleware, execMiddleware } from 'hyper-ts/lib/Middleware';
import { pipe } from 'fp-ts/function';
import { match } from 'fp-ts/Either';
import * as L from 'fp-ts-contrib/List';
import type { Reader } from 'fp-ts/Reader';

type Params = Parameters<LoaderFunction>[0]['params'];

export type Action =
  | { type: 'setBody'; body: unknown }
  | { type: 'endResponse' }
  | { type: 'setStatus'; status: Status }
  | { type: 'setHeader'; name: string; value: string }
  | { type: 'clearCookie'; name: string; options: CookieOptions }
  | { type: 'setCookie'; name: string; value: string; options: CookieOptions }
  | { type: 'pipeStream'; stream: unknown };

const endResponse: Action = { type: 'endResponse' };

export class RemixConnection<S> implements Connection<S> {
  readonly _S!: S;
  constructor(
    readonly req: Request,
    readonly params: Params,
    readonly body: unknown,
    readonly actions: L.List<Action> = L.nil,
    readonly ended: boolean = false
  ) {}

  chain<T>(action: Action, ended = false): RemixConnection<T> {
    return new RemixConnection<T>(
      this.req,
      this.params,
      this.body,
      L.cons(action, this.actions),
      ended
    );
  }

  getRequest(): any {
    return this.req;
  }

  getBody(): unknown {
    return this.body;
  }

  getHeader(name: string): unknown {
    return this.req.headers.get(name);
  }

  getParams(): unknown {
    return this.params;
  }

  getQuery(): unknown {
    return this.req.url;
  }

  getOriginalUrl(): string {
    return this.req.url;
  }

  getMethod(): string {
    return this.req.method;
  }

  setCookie(
    name: string,
    value: string,
    options: CookieOptions
  ): RemixConnection<HeadersOpen> {
    return this.chain({ type: 'setCookie', name, value, options });
  }

  clearCookie(
    name: string,
    options: CookieOptions
  ): RemixConnection<HeadersOpen> {
    return this.chain({ type: 'clearCookie', name, options });
  }

  setHeader(name: string, value: string): RemixConnection<HeadersOpen> {
    return this.chain({ type: 'setHeader', name, value });
  }

  setStatus(status: Status): RemixConnection<HeadersOpen> {
    return this.chain({ type: 'setStatus', status });
  }

  setBody(body: unknown): RemixConnection<ResponseEnded> {
    return this.chain({ type: 'setBody', body }, true);
  }

  pipeStream(stream: unknown): RemixConnection<ResponseEnded> {
    return this.chain({ type: 'pipeStream', stream }, true);
  }

  endResponse(): RemixConnection<ResponseEnded> {
    return this.chain(endResponse, true);
  }
}

type ResponseT = [number, Headers, BodyInit | undefined];

function run([status, headers, body]: ResponseT, action: Action): ResponseT {
  switch (action.type) {
    case 'setCookie':
      //return res.cookie(action.name, action.value, action.options);
      return [status, headers, body];
    case 'clearCookie':
      //return res.clearCookie(action.name, action.options);
      return [status, headers, body];
    case 'setStatus':
      return [action.status, headers, body];
    case 'setHeader':
      headers.set(action.name, action.value);
      return [status, headers, body];
    case 'setBody':
      return [status, headers, action.body as BodyInit];
    case 'pipeStream':
    case 'endResponse':
      return [status, headers, body];
  }
}

function error<E>(e: E): Response {
  return new Response(JSON.stringify(e), {
    status: Status.InternalServerError,
  });
}

function exec<I, O, E>(
  middleware: Middleware<I, O, E, void>,
  req: Request,
  params: Params,
  body: unknown
): Promise<Response> {
  return execMiddleware(
    middleware,
    new RemixConnection<I>(req, params, body)
  )().then((e) =>
    pipe(
      e,
      match(
        (e) => error(e),
        (c) => {
          const { actions } = c as RemixConnection<O>;
          const response = [Status.OK, new Headers(), undefined] as ResponseT;
          const [status, headers, body] = pipe(
            actions,
            L.reduce(response, (res, action) => run(res, action))
          );
          return new Response(body || '', { status, headers });
        }
      )
    )
  );
}

type RemixHandlerParams = Parameters<LoaderFunction>[0];

export function toHandler<E>(
  middleware: Middleware<StatusOpen, ResponseEnded, E, void>
): Reader<RemixHandlerParams, Promise<Response>> {
  return async ({ request, params }: Parameters<LoaderFunction>[0]) =>
    exec(middleware, request, params, await body(request));
}

async function body(request: Request): Promise<unknown> {
  if (request.method != 'GET' && request.method != 'HEAD') {
    switch (request.headers.get('content-type')) {
      case MediaType.applicationJSON:
        return request.json();
      case MediaType.applicationFormURLEncoded:
        return parseFormURLEncoded(await request.text());
    }
    return request.text();
  }
  return null;
}

function parseFormURLEncoded(body: string): unknown {
  const params = new URLSearchParams(body);
  return Object.fromEntries(params);
}

import { Status as H_Status } from 'hyper-ts';
import {
  decodeMethod,
  redirect as M_redirect,
  json as M_json,
  ichain,
  status,
  closeHeaders,
  end,
} from 'hyper-ts/lib/Middleware';
import { left, right } from 'fp-ts/Either';

export const MethodNotAllowed = 'MethodNotAllowed' as const;
export const JSONError = 'JSONError' as const;

export const GET = decodeMethod((s) =>
  s.toLowerCase() === 'get' ? right('GET') : left(MethodNotAllowed)
);

export const POST = decodeMethod((s) =>
  s.toLowerCase() === 'post' ? right('POST') : left(MethodNotAllowed)
);

export const PATCH = decodeMethod((s) =>
  s.toLowerCase() === 'patch' ? right('PATCH') : left(MethodNotAllowed)
);

export const PUT = decodeMethod((s) =>
  s.toLowerCase() === 'put' ? right('PUT') : left(MethodNotAllowed)
);

export const DELETE = decodeMethod((s) =>
  s.toLowerCase() === 'delete' ? right('DELETE') : left(MethodNotAllowed)
);

export const redirect = <E = never>(uri: string) =>
  pipe(
    M_redirect<E>(uri),
    ichain(() => closeHeaders()),
    ichain(() => end())
  );

export const json = (body: unknown) =>
  pipe(
    status(H_Status.OK),
    ichain(() => M_json(body, () => JSONError))
  );

export const notFound = pipe(
  status(H_Status.NotFound),
  ichain(() => closeHeaders()),
  ichain(() => end())
);
