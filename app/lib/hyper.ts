import type { Either } from 'fp-ts/Either';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import * as J from 'fp-ts/Json';
import type { Reader } from 'fp-ts/Reader';
import type { ReaderTaskEither } from 'fp-ts/ReaderTaskEither';
import * as RTE from 'fp-ts/ReaderTaskEither';
import * as T from 'fp-ts/Task';
import * as TE from 'fp-ts/TaskEither';
import type { LoaderFunction, Session, SessionStorage } from 'remix';
import { createSession } from 'remix';

export * from 'fp-ts/ReaderTaskEither';

export enum MediaType {
  applicationFormURLEncoded = 'application/x-www-form-urlencoded',
  applicationJSON = 'application/json',
  applicationJavascript = 'application/javascript',
  applicationOctetStream = 'application/octet-stream',
  applicationXML = 'application/xml',
  imageGIF = 'image/gif',
  imageJPEG = 'image/jpeg',
  imagePNG = 'image/png',
  multipartFormData = 'multipart/form-data',
  textCSV = 'text/csv',
  textHTML = 'text/html',
  textPlain = 'text/plain',
  textXML = 'text/xml',
}

export enum Status {
  Continue = 100,
  SwitchingProtocols = 101,
  Processing = 102,
  EarlyHints = 103,
  OK = 200,
  Created = 201,
  Accepted = 202,
  NonAuthoritativeInformation = 203,
  NoContent = 204,
  ResetContent = 205,
  PartialContent = 206,
  MultiStatus = 207,
  AlreadyReported = 208,
  IMUsed = 226,
  MultipleChoices = 300,
  MovedPermanently = 301,
  Found = 302,
  SeeOther = 303,
  NotModified = 304,
  UseProxy = 305,
  SwitchProxy = 306,
  TemporaryRedirect = 307,
  PermanentRedirect = 308,
  BadRequest = 400,
  Unauthorized = 401,
  PaymentRequired = 402,
  Forbidden = 403,
  NotFound = 404,
  MethodNotAllowed = 405,
  NotAcceptable = 406,
  ProxyAuthenticationRequired = 407,
  RequestTimeout = 408,
  Conflict = 409,
  Gone = 410,
  LengthRequired = 411,
  PreconditionFailed = 412,
  PayloadTooLarge = 413,
  URITooLong = 414,
  UnsupportedMediaType = 415,
  RangeNotSatisfiable = 416,
  ExpectationFailed = 417,
  Teapot = 418,
  MisdirectedRequest = 421,
  UnprocessableEntity = 422,
  Locked = 423,
  FailedDependency = 424,
  TooEarly = 425,
  UpgradeRequired = 426,
  PreconditionRequired = 428,
  TooManyRequests = 429,
  RequestHeaderFieldsTooLarge = 431,
  UnavailableForLegalReasons = 451,
  InternalServerError = 500,
  NotImplemented = 501,
  BadGateway = 502,
  ServiceUnavailable = 503,
  GatewayTimeout = 504,
  HTTPVersionNotSupported = 505,
  VariantAlsoNegotiates = 506,
  InsufficientStorage = 507,
  LoopDetected = 508,
  NotExtended = 510,
  NetworkAuthenticationRequired = 511,
}

export const MethodNotAllowed = 'MethodNotAllowed' as const;
export type MethodNotAllowed = typeof MethodNotAllowed;
export const JSONError = 'JSONError' as const;
export type JSONError = typeof JSONError;

type Params = Parameters<LoaderFunction>[0]['params'];
export type SessionOptions = { flash: boolean };
export type Body = BodyInit | null | void;

export type Middleware<E, A> = ReaderTaskEither<Connection, E, A>;

export class Connection {
  constructor(
    readonly request: Request,
    readonly params: Params,
    readonly session: Session = createSession()
  ) {}

  status = Status.OK;
  headers = new Headers();

  getRequest(): Request {
    return this.request;
  }

  async getBody(): Promise<unknown> {
    return getBody(this.request);
  }

  getHeader(name: string): unknown {
    return this.request.headers.get(name);
  }

  getParams(): unknown {
    return this.params;
  }

  getQuery(): unknown {
    const url = new URL(this.request.url);
    return parseFormData(url.searchParams);
  }

  getOriginalUrl(): string {
    return this.request.url;
  }

  getMethod(): string {
    return this.request.method;
  }

  getSession(name: string): unknown {
    return this.session.get(name);
  }

  setSession(name: string, value: string, options: { flash: boolean }): this {
    if (options.flash) {
      this.session.flash(name, value);
    } else {
      this.session.set(name, value);
    }
    return this;
  }

  clearSession(name: string): this {
    this.session.unset(name);
    return this;
  }

  // setCookie(name: string, value: string, options: any): this {
  //   return this;
  // }

  // clearCookie(name: string, options: any): this {
  //   return this;
  // }

  setHeader(name: string, value: string): this {
    this.headers.set(name, value);
    return this;
  }

  setStatus(status: Status): this {
    this.status = status;
    return this;
  }
}

function error<E>(e: E): Response {
  return new Response(JSON.stringify(e), {
    status: Status.InternalServerError,
  });
}

function exec<E>(
  middleware: Middleware<E, Body>,
  request: Request,
  params: Params
): Promise<Response> {
  const connection = new Connection(request, params);
  return pipe(
    middleware(connection),
    TE.chain((body) =>
      TE.of<E, Response>(
        new Response(body || '', {
          status: connection.status,
          headers: connection.headers,
        })
      )
    ),
    TE.getOrElse((e) => T.of(error(e)))
  )();
}

function execWithSession<E>(
  middleware: Middleware<E, Body>,
  request: Request,
  params: Params,
  session: SessionAccessor
): Promise<Response> {
  const connection = new Connection(request, params, session.get());
  return pipe(
    middleware(connection),
    TE.chain((body) =>
      pipe(
        TE.of<E, Response>(
          new Response(body || '', {
            status: connection.status,
            headers: connection.headers,
          })
        ),
        TE.chainTaskK((response) =>
          pipe(
            () => session.commit(),
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
  middleware: Middleware<E, Body>
): Reader<RemixHandlerParams, Promise<Response>> {
  return async ({ request, params }: Parameters<LoaderFunction>[0]) =>
    exec(middleware, request, params);
}

export function toHandlerWithSession<E>(
  sessionStorage: SessionStorage
): (
  middleware: Middleware<E, Body>
) => Reader<RemixHandlerParams, Promise<Response>> {
  return (middleware: Middleware<E, Body>) =>
    async ({ request, params }: Parameters<LoaderFunction>[0]) =>
      execWithSession(
        middleware,
        request,
        params,
        await getSession(request, sessionStorage)
      );
}

type SessionAccessor = { get: () => Session; commit: () => Promise<string> };

async function getSession(
  request: Request,
  sessionStorage: SessionStorage
): Promise<SessionAccessor> {
  const session = await sessionStorage.getSession(
    request.headers.get('cookie')
  );
  return {
    get: () => session,
    commit: () => sessionStorage.commitSession(session),
  };
}

async function getBody(request: Request): Promise<unknown> {
  if (request.method != 'GET' && request.method != 'HEAD') {
    const contentType = request.headers.get('content-type');
    if (contentType?.startsWith(MediaType.applicationJSON)) {
      return request.json();
    } else if (contentType?.startsWith(MediaType.applicationFormURLEncoded)) {
      return parseFormData(await request.formData());
    }
    return request.text();
  }
  return null;
}

function parseFormData(
  formData: URLSearchParams | FormData
): Record<string, string | string[]> {
  const data: Record<string, string | string[]> = {};
  formData.forEach((value, key) => {
    if (typeof value != 'string') {
      return;
    }
    if (!Reflect.has(data, key)) {
      data[key] = value;
      return;
    }
    if (!Array.isArray(data[key])) {
      data[key] = [data[key] as string];
    }
    (data[key] as string[]).push(value);
  });
  return data;
}

const isUnknownRecord = (u: unknown): u is Record<string, unknown> =>
  u !== null && typeof u === 'object';

const _fromEither =
  <E, A>(cb: (c: Connection) => Either<E, A>) =>
  (c: Connection) =>
    TE.fromEither(cb(c));

export function decodeParam<E, A>(
  name: string,
  f: (input: unknown) => Either<E, A>
): Middleware<E, A> {
  return _fromEither((c) => {
    const params = c.getParams();
    return f(isUnknownRecord(params) ? params[name] : undefined);
  });
}

export function decodeParams<E, A>(
  f: (input: unknown) => Either<E, A>
): Middleware<E, A> {
  return _fromEither((c) => f(c.getParams()));
}

export function decodeQuery<E, A>(
  f: (input: unknown) => Either<E, A>
): Middleware<E, A> {
  return _fromEither((c) => f(c.getQuery()));
}

export function decodeBody<E, A>(
  f: (input: unknown) => Either<E, A>
): Middleware<E, A> {
  return (c) => async () => {
    try {
      return f(await c.getBody());
    } catch {
      return f(undefined);
    }
  };
}

export function decodeMethod<E, A>(
  f: (method: string) => Either<E, A>
): Middleware<E, A> {
  return _fromEither((c) => f(c.getMethod()));
}

export function decodeHeader<E, A>(
  name: string,
  f: (input: unknown) => Either<E, A>
): Middleware<E, A> {
  return _fromEither((c) => f(c.getHeader(name)));
}

export function decodeSession<E, A>(
  name: string,
  f: (input: unknown) => Either<E, A>
): Middleware<E, A> {
  return _fromEither((c) => f(c.getSession(name)));
}

export function status<E = never>(status: Status): Middleware<E, void> {
  return (c) => {
    c.setStatus(status);
    return TE.of(undefined);
  };
}

export function header<E = never>(
  name: string,
  value: string
): Middleware<E, void> {
  return (c) => {
    c.setHeader(name, value);
    return TE.of(undefined);
  };
}

export function session<E = never>(
  name: string,
  value: string
): Middleware<E, void> {
  return (c) => {
    c.setSession(name, value, { flash: false });
    return TE.of(undefined);
  };
}

export function flash<E = never>(
  name: string,
  value: string
): Middleware<E, void> {
  return (c) => {
    c.setSession(name, value, { flash: true });
    return TE.of(undefined);
  };
}

export function clearSession<E = never>(name: string): Middleware<E, void> {
  return (c) => {
    c.clearSession(name);
    return TE.of(undefined);
  };
}

export function contentType<E = never>(
  mediaType: MediaType
): Middleware<E, void> {
  return header('Content-Type', mediaType);
}

export function send<E = never>(body: string | Buffer): Middleware<E, Body> {
  return RTE.of(body);
}

export function redirect<E = never>(uri: string): Middleware<E, Body> {
  return pipe(
    status(Status.Found),
    RTE.chain(() => header('Location', uri))
  );
}

export function json(
  body: unknown,
  options?: { status?: Status }
): Middleware<JSONError, Body> {
  return pipe(
    RTE.fromEither<unknown, string, Connection>(J.stringify(body)),
    RTE.mapLeft(() => JSONError),
    RTE.chain((json) =>
      pipe(
        status(options?.status ?? Status.OK),
        RTE.chain(() => contentType<JSONError>(MediaType.applicationJSON)),
        RTE.chain(() => send(json))
      )
    )
  );
}

export const GET = decodeMethod((s) =>
  s.toUpperCase() == 'get' ? E.right('GET' as const) : E.left(MethodNotAllowed)
);

export const POST = decodeMethod((s) =>
  s.toLowerCase() == 'post'
    ? E.right('POST' as const)
    : E.left(MethodNotAllowed)
);

export const PATCH = decodeMethod((s) =>
  s.toLowerCase() == 'patch'
    ? E.right('PATCH' as const)
    : E.left(MethodNotAllowed)
);

export const PUT = decodeMethod((s) =>
  s.toLowerCase() == 'put' ? E.right('PUT' as const) : E.left(MethodNotAllowed)
);

export const DELETE = decodeMethod((s) =>
  s.toLowerCase() == 'delete'
    ? E.right('DELETE' as const)
    : E.left(MethodNotAllowed)
);
