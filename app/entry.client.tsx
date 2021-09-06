import * as Sentry from '@sentry/react';
import { Integrations } from '@sentry/tracing';
import ReactDOM from 'react-dom';
import { RemixBrowser } from 'remix';

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

ReactDOM.hydrate(<RemixBrowser />, document);
