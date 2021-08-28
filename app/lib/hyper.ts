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
import * as H from 'hyper-ts';
import * as M from 'hyper-ts/lib/Middleware';
import * as E from 'fp-ts/Either';
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
    const url = new URL(this.req.url);
    return Object.fromEntries(url.searchParams);
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

export const MethodNotAllowed = 'MethodNotAllowed' as const;
export const JSONError = 'JSONError' as const;

export const GET = M.decodeMethod((s) =>
  s.toLowerCase() == 'get' ? E.right('GET') : E.left(MethodNotAllowed)
);

export const POST = M.decodeMethod((s) =>
  s.toLowerCase() == 'post' ? E.right('POST') : E.left(MethodNotAllowed)
);

export const PATCH = M.decodeMethod((s) =>
  s.toLowerCase() == 'patch' ? E.right('PATCH') : E.left(MethodNotAllowed)
);

export const PUT = M.decodeMethod((s) =>
  s.toLowerCase() == 'put' ? E.right('PUT') : E.left(MethodNotAllowed)
);

export const DELETE = M.decodeMethod((s) =>
  s.toLowerCase() == 'delete' ? E.right('DELETE') : E.left(MethodNotAllowed)
);

export const redirect = <E = never>(uri: string) =>
  pipe(
    M.redirect<E>(uri),
    M.ichain(() => M.closeHeaders()),
    M.ichain(() => M.end())
  );

export const json = (body: unknown) =>
  pipe(
    M.status(H.Status.OK),
    M.ichain(() => M.json(body, () => JSONError))
  );

export const notFound = pipe(
  M.status(H.Status.NotFound),
  M.ichain(() => M.closeHeaders()),
  M.ichain(() => M.end())
);
