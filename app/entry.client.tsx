import ReactDOM from 'react-dom';
import { RemixBrowser } from 'remix';
import * as Sentry from '@sentry/react';
import { Integrations } from '@sentry/tracing';

interface CustomBrowserWindow extends Window {
  ENV: Record<string, string>;
}

declare const window: CustomBrowserWindow;

Sentry.init({
  enabled: !!window.ENV['SENTRY_DSN'],
  dsn: window.ENV['SENTRY_DSN'],
  release: window.ENV['COMMIT_ID'],
  integrations: [new Integrations.BrowserTracing()],
  tracesSampleRate: 1.0,
});

// @types/react-dom says the 2nd argument to ReactDOM.hydrate() must be a
// `Element | DocumentFragment | null` but React 16 allows you to pass the
// `document` object as well. This is a bug in @types/react-dom that we can
// safely ignore for now.
// @ts-expect-error
ReactDOM.hydrate(<RemixBrowser />, document);
