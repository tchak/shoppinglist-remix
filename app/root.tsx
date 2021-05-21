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
import { useLocation, Outlet } from 'react-router-dom';
import { XCircleIcon } from '@heroicons/react/solid';

import stylesUrl from './styles/index.css';

import { withLocale } from './sessions';
import { getIntlMessages, DEFAULT_LOCALE } from './intl';

import { ApplicationOutlet } from './components/ApplicationOutlet';
import { Progress } from './components/Progress';

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

function Document({
  locale = DEFAULT_LOCALE,
  pendingLocation = false,
  ENV = {},
  children,
}: {
  pendingLocation?: boolean;
  ENV?: Record<string, string>;
  locale?: string;
  children: ReactNode;
}) {
  return (
    <html lang={locale}>
      <head>
        <meta charSet="utf-8" />
        <Meta />
        <Links />
      </head>
      <body className="bg-gray-200">
        <Progress isAnimating={pendingLocation} />
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
  const pendingLocation = usePendingLocation();
  const { locale, ENV, messages } = useRouteData<RouteData>();
  const noLayout = useMatches().some(({ handle }) => handle?.layout == false);

  return (
    <Document pendingLocation={!!pendingLocation} locale={locale} ENV={ENV}>
      <IntlProvider locale={locale} messages={messages}>
        {noLayout ? <Outlet /> : <ApplicationOutlet />}
      </IntlProvider>
    </Document>
  );
}

export function ErrorBoundary({ error }: { error: Error }) {
  return (
    <Document>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto mt-10">
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <XCircleIcon
                  className="h-5 w-5 text-red-400"
                  aria-hidden="true"
                />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Application Error
                </h3>
                <div className="mt-2 text-sm text-red-700">{error.message}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
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
