import { ReactNode, useRef, useEffect } from 'react';
import {
  LinksFunction,
  LoaderFunction,
  MetaFunction,
  useRouteData,
} from 'remix';
import {
  Meta,
  Links,
  Scripts,
  LiveReload,
  useMatches,
  json,
  usePendingLocation,
} from 'remix';
import { withProfiler } from '@sentry/react';
import { IntlProvider } from 'react-intl';
import { useLocation } from 'react-router-dom';

import stylesUrl from './styles/index.css';
import { ApplicationLayout } from './components/ApplicationLayout';
import { AuthenticationLayout } from './components/AuthenticationLayout';
import { Progress } from './components/Progress';
import { withLocale } from './sessions';
import { getIntlMessages } from './lib/intl';

type RouteData = {
  ENV: Record<string, string>;
  locale: string;
  messages: Record<string, string>;
};

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
    title: 'Shoppinglist',
    viewport: 'width=device-width, initial-scale=1.0',
    description: 'A simple shoppinglist app',
    'og:url': 'https://shoppinglist.tchak.dev/',
    'og:type': 'website',
    'og:title': 'Shoppinglist',
    'og:description': 'A simple shoppinglist app',
    'og:image': 'https://shoppinglist.tchak.dev/og-image.png',
    'twitter:card': 'summary_large_image',
    'twitter:domain': 'shoppinglist.tchak.dev',
    'twitter:url': 'https://shoppinglist.tchak.dev/',
    'twitter:title': 'Shoppinglist',
    'twitter:description': 'A simple shoppinglist app',
    'twitter:image': 'https://shoppinglist.tchak.dev/og-image.png',
  };
};

export const loader: LoaderFunction = ({ request }) =>
  withLocale(request, (locale) =>
    json(
      {
        locale,
        messages: getIntlMessages(locale),
        ENV: {
          APP_DOMAIN: process.env['APP_DOMAIN'],
          COMMIT_ID: process.env['COMMIT_ID'],
          SENTRY_DSN: process.env['SENTRY_DSN'],
        },
      },
      {
        headers: {
          'cache-control': 'max-age=600',
        },
      }
    )
  );

function Document({ children }: { children: ReactNode }) {
  const { ENV, locale } = useRouteData<RouteData>();
  const pendingLocation = usePendingLocation();

  return (
    <html lang={locale}>
      <head>
        <meta charSet="utf-8" />
        <Meta />
        <Links />
      </head>
      <body className="bg-gray-200">
        <Progress isAnimating={!!pendingLocation} />
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
            data-domain={ENV['APP_DOMAIN']}
            src="https://plausible.io/js/plausible.js"
          />
        )}
      </body>
    </html>
  );
}

export function App() {
  useTemporaryScrollManagement();
  const { locale, messages } = useRouteData<RouteData>();
  const noLayout = useMatches().some(({ handle }) => handle?.layout == false);

  return (
    <Document>
      <IntlProvider locale={locale} messages={messages}>
        {noLayout ? <AuthenticationLayout /> : <ApplicationLayout />}
      </IntlProvider>
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

export default withProfiler(App);

function useTemporaryScrollManagement() {
  const location = useLocation();
  const locations = useRef<Set<string>>();

  if (!locations.current) {
    locations.current = new Set();
    locations.current.add(location.key);
  }

  useEffect(() => {
    const wasWeirdHistoryBug = location.key === 'default';
    if (wasWeirdHistoryBug || locations.current?.has(location.key)) return;
    locations.current?.add(location.key);
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
    });
  }, [location]);
}
