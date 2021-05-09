import type { ReactNode } from 'react';
import {
  LinksFunction,
  LoaderFunction,
  MetaFunction,
  useRouteData,
} from 'remix';
import { Meta, Links, Scripts, LiveReload, useMatches } from 'remix';
import { Outlet } from 'react-router-dom';

import stylesUrl from './styles/index.css';
import { AuthenticatedLayout } from './components/AuthenticatedLayout';

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
  return { domain: process.env['SESSION_DOMAIN'] };
};

function Document({ children }: { children: ReactNode }) {
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
        {process.env.NODE_ENV === 'development' && <LiveReload />}
      </body>
    </html>
  );
}

export default function App() {
  const { domain } = useRouteData<{ domain: string }>();
  const matches = useMatches();
  const noLayout = matches.some(({ handle }) => handle?.layout == false);
  return (
    <Document>
      {noLayout ? (
        <Outlet />
      ) : (
        <AuthenticatedLayout>
          <Outlet />
        </AuthenticatedLayout>
      )}
      {process.env.NODE_ENV === 'production' && <Plausible domain={domain} />}
    </Document>
  );
}

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

function Plausible({ domain }: { domain?: string }) {
  return (
    <script
      async
      defer
      data-domain={domain}
      src="https://plausible.io/js/plausible.js"
    />
  );
}
