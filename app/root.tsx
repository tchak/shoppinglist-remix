import type { ReactNode } from 'react';
import {
  LinksFunction,
  LoaderFunction,
  MetaFunction,
  useRouteData,
} from 'remix';
import { Meta, Links, Scripts, LiveReload, useMatches, json } from 'remix';
import { withProfiler } from '@sentry/react';

import stylesUrl from './styles/index.css';
import { ApplicationLayout } from './components/ApplicationLayout';
import { AuthenticationLayout } from './components/AuthenticationLayout';

export const links: LinksFunction = () => {
  return [
    { rel: 'stylesheet', href: 'https://rsms.me/inter/inter.css' },
    { rel: 'stylesheet', href: 'https://unpkg.com/@reach/tooltip/styles.css' },
    { rel: 'stylesheet', href: 'https://unpkg.com/@reach/combobox/styles.css' },
    { rel: 'stylesheet', href: stylesUrl },
    {
      rel: 'apple-touch-icon',
      sizes: '180x180',
      href: '/apple-touch-icon.png',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '32x32',
      href: '/favicon-32x32.png',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '16x16',
      href: '/favicon-16x16.png',
    },
  ];
};

export const meta: MetaFunction = () => {
  return {
    viewport: 'width=device-width, initial-scale=1.0',
  };
};

export const loader: LoaderFunction = () => {
  return json(
    {
      ENV: {
        SESSION_DOMAIN: process.env['SESSION_DOMAIN'],
        COMMIT_ID: process.env['COMMIT_ID'],
        SENTRY_DSN: process.env['SENTRY_DSN'],
      },
    },
    {
      headers: {
        'cache-control': 'max-age=3600',
      },
    }
  );
};

function Document({ children }: { children: ReactNode }) {
  const { ENV } = useRouteData<{ ENV: Record<string, string> }>();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <Meta />
        <Links />
      </head>
      <body className="bg-gray-200">
        {children}

        <Scripts />
        {process.env.NODE_ENV == 'development' && <LiveReload />}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(ENV)};`,
          }}
        />
        {process.env.NODE_ENV == 'production' && (
          <script
            async
            defer
            data-domain={ENV['SESSION_DOMAIN']}
            src="https://plausible.io/js/plausible.js"
          />
        )}
      </body>
    </html>
  );
}

export default withProfiler(function App() {
  const noLayout = useMatches().some(({ handle }) => handle?.layout == false);

  return (
    <Document>
      {noLayout ? <AuthenticationLayout /> : <ApplicationLayout />}
    </Document>
  );
});

export function ErrorBoundary({ error }: { error: Error }) {
  return (
    <Document>
      <h1>App Error</h1>
      <pre>{error.message}</pre>
      <p>
        Replace this UI with what you want users to see when your app throws
        uncaught errors.
      </p>
    </Document>
  );
}
