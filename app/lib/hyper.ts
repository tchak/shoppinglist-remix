import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import type { Reader } from 'fp-ts/Reader';
import * as T from 'fp-ts/Task';
import * as TE from 'fp-ts/TaskEither';
import * as L from 'fp-ts-contrib/List';
import type {
  Connection,
  CookieOptions,
  HeadersOpen,
  ResponseEnded,
  StatusOpen,
} from 'hyper-ts';
import { MediaType, Status } from 'hyper-ts';
import * as H from 'hyper-ts';
import { execMiddleware, Middleware } from 'hyper-ts/lib/Middleware';
import * as M from 'hyper-ts/lib/Middleware';
import type { BodyInit } from 'node-fetch';
import type { LoaderFunction, Request, Session, SessionStorage } from 'remix';
import { createSession, Headers, Response } from 'remix';

type Params = Parameters<LoaderFunction>[0]['params'];
type SessionOptions = { flash: boolean };

export type Action =
  | { type: 'setBody'; body: unknown }
  | { type: 'endResponse' }
  | { type: 'setStatus'; status: Status }
  | { type: 'setHeader'; name: string; value: string }
  | { type: 'clearCookie'; name: string; options: CookieOptions }
  | { type: 'setCookie'; name: string; value: string; options: CookieOptions }
  | { type: 'setSession'; name: string; value: string; options: SessionOptions }
  | { type: 'clearSession'; name: string }
  | { type: 'pipeStream'; stream: unknown };

const endResponse: Action = { type: 'endResponse' };

export class RemixConnection<S> implements Connection<S> {
  readonly _S!: S;
  constructor(
    readonly req: Request,
    readonly params: Params,
    readonly body: unknown,
    readonly session: Session = createSession({}),
    readonly actions: L.List<Action> = L.nil,
    readonly ended: boolean = false
  ) {}

  chain<T>(action: Action, ended = false): RemixConnection<T> {
    return new RemixConnection<T>(
      this.req,
      this.params,
      this.body,
      this.session,
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

  getSession(name: string): unknown {
    return this.session?.get(name);
  }

  setSession(
    name: string,
    value: string,
    options: { flash: boolean }
  ): RemixConnection<HeadersOpen> {
    return this.chain({ type: 'setSession', name, value, options });
  }

  clearSession(name: string): RemixConnection<HeadersOpen> {
    return this.chain({ type: 'clearSession', name });
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

type ResponseT = [number, Headers, Session, BodyInit | undefined];

function run(
  [status, headers, session, body]: ResponseT,
  action: Action
): ResponseT {
  switch (action.type) {
    case 'setCookie':
      //return res.cookie(action.name, action.value, action.options);
      return [status, headers, session, body];
    case 'clearCookie':
      //return res.clearCookie(action.name, action.options);
      return [status, headers, session, body];
    case 'setStatus':
      return [action.status, headers, session, body];
    case 'setHeader':
      headers.set(action.name, action.value);
      return [status, headers, session, body];
    case 'setBody':
      return [status, headers, session, action.body as BodyInit];
    case 'setSession':
      if (action.options.flash) {
        session.flash(action.name, action.value);
      } else {
        session.set(action.name, action.value);
      }
      return [status, headers, session, body];
    case 'clearSession':
      session.unset(action.name);
      return [status, headers, session, body];
    case 'pipeStream':
    case 'endResponse':
      return [status, headers, session, body];
  }
}

function fromConnection<I = StatusOpen, E = never, A = never>(
  f: (c: RemixConnection<I>) => E.Either<E, A>
) {
  return M.fromConnection((c) => f(c as unknown as RemixConnection<I>));
}

function modifyConnection<I, O, E>(
  f: (c: RemixConnection<I>) => RemixConnection<O>
): Middleware<I, O, E, void> {
  return (c) => TE.right([undefined, f(c as unknown as RemixConnection<I>)]);
}

export function session<E = never>(
  name: string,
  value: string,
  options: { flash: boolean } = { flash: false }
): Middleware<HeadersOpen, HeadersOpen, E, void> {
  return modifyConnection((c) => c.setSession(name, value, options));
}

export function clearSession<E = never>(
  name: string
): Middleware<HeadersOpen, HeadersOpen, E, void> {
  return modifyConnection((c) => c.clearSession(name));
}

export function decodeSession<E, A>(
  name: string,
  f: (input: unknown) => E.Either<E, A>
): Middleware<StatusOpen, StatusOpen, E, A> {
  return fromConnection((c) => f(c.getSession(name)));
}

function error<E>(e: E): Response {
  return new Response(JSON.stringify(e), {
    status: Status.InternalServerError,
  });
}

function execConnection<O, E>(c: Connection<O>) {
  const { actions, session } = c as RemixConnection<O>;
  const response = [Status.OK, new Headers(), session, undefined] as ResponseT;
  const [status, headers, , body] = pipe(
    actions,
    L.reduce(response, (res, action) => run(res, action))
  );
  return TE.of<E, Response>(new Response(body || '', { status, headers }));
}

function exec<I, O, E>(
  middleware: Middleware<I, O, E, void>,
  req: Request,
  params: Params,
  body: unknown
): Promise<Response> {
  return pipe(
    execMiddleware(middleware, new RemixConnection<I>(req, params, body)),
    TE.chain(execConnection),
    TE.getOrElse((e) => T.of(error(e)))
  )();
}

function execWithSession<I, O, E>(
  middleware: Middleware<I, O, E, void>,
  req: Request,
  params: Params,
  body: unknown,
  [session, commitSession]: [Session, () => Promise<string>]
): Promise<Response> {
  return pipe(
    execMiddleware(
      middleware,
      new RemixConnection<I>(req, params, body, session)
    ),
    TE.chain((c) =>
      pipe(
        execConnection(c),
        TE.chainTaskK((response) =>
          pipe(
            () => commitSession(),
            T.map((cookie) => {
              response.headers.append('set-cookie', cookie);
              return response;
            })
          )
        )
      )
    ),
    TE.getOrElse((e) => T.of(error(e)))
  )();
}

type RemixHandlerParams = Parameters<LoaderFunction>[0];

export function toHandler<E>(
  middleware: Middleware<StatusOpen, ResponseEnded, E, void>
): Reader<RemixHandlerParams, Promise<Response>> {
  return async ({ request, params }: Parameters<LoaderFunction>[0]) =>
    exec(middleware, request, params, await getBody(request));
}

export function toHandlerWithSession<E>(
  sessionStorage: SessionStorage
): (
  middleware: Middleware<StatusOpen, ResponseEnded, E, void>
) => Reader<RemixHandlerParams, Promise<Response>> {
  return (middleware: Middleware<StatusOpen, ResponseEnded, E, void>) =>
    async ({ request, params }: Parameters<LoaderFunction>[0]) =>
      execWithSession(
        middleware,
        request,
        params,
        await getBody(request),
        await getSession(request, sessionStorage)
      );
}

async function getSession(
  request: Request,
  sessionStorage: SessionStorage
): Promise<[Session, () => Promise<string>]> {
  const session = await sessionStorage.getSession(
    request.headers.get('cookie')
  );
  return [session, () => sessionStorage.commitSession(session)];
}

async function getBody(request: Request): Promise<unknown> {
  if (request.method != 'GET' && request.method != 'HEAD') {
    const contentType = request.headers.get('content-type');
    if (contentType?.startsWith(MediaType.applicationJSON)) {
      return request.json();
    } else if (contentType?.startsWith(MediaType.applicationFormURLEncoded)) {
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
export type MethodNotAllowed = typeof MethodNotAllowed;
export const JSONError = 'JSONError' as const;
export type JSONError = typeof JSONError;

export const GET = M.decodeMethod((s) =>
  s.toUpperCase() == 'get' ? E.right('GET' as const) : E.left(MethodNotAllowed)
);

export const POST = M.decodeMethod((s) =>
  s.toLowerCase() == 'post'
    ? E.right('POST' as const)
    : E.left(MethodNotAllowed)
);

export const PATCH = M.decodeMethod((s) =>
  s.toLowerCase() == 'patch'
    ? E.right('PATCH' as const)
    : E.left(MethodNotAllowed)
);

export const PUT = M.decodeMethod((s) =>
  s.toLowerCase() == 'put' ? E.right('PUT' as const) : E.left(MethodNotAllowed)
);

export const DELETE = M.decodeMethod((s) =>
  s.toLowerCase() == 'delete'
    ? E.right('DELETE' as const)
    : E.left(MethodNotAllowed)
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
