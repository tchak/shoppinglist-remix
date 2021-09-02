import type { EntryContext } from 'remix';
import { RemixServer } from 'remix';
import { renderToString } from 'react-dom/server';
import { polyfill } from 'interweave-ssr';

polyfill();

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  const markup = renderToString(
    <RemixServer context={remixContext} url={request.url} />
  );

  responseHeaders.set('content-type', 'text/html');

  return new Response(`<!DOCTYPE html>${markup}`, {
    status: responseStatusCode,
    headers: responseHeaders,
  });
}
