import { useCallback, useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import type { ActionFunction, LoaderFunction } from 'remix';
import { redirect, useSubmit } from 'remix';

export const loader: LoaderFunction = () => redirect('/');

export const action: ActionFunction = async ({ request }) => {
  const body = new URLSearchParams(await request.text());
  return redirect(String(body.get('path')));
};

export default function RefetchRoute() {
  return null;
}

export function useRefetch(path?: string) {
  const location = useLocation();
  const submit = useSubmit();
  return () =>
    submit(
      { path: path ?? location.pathname },
      { method: 'post', action: '/_refetch', replace: true }
    );
}

export function useRefetchOnWindowFocus() {
  const shouldRefetch = useRef(false);
  const isVisible = usePageVisible();
  const refetch = useRefetch();

  useEffect(() => {
    if (isVisible && shouldRefetch.current) {
      refetch();
    }
    shouldRefetch.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);
}

function usePageVisible() {
  const [isVisible, setVisible] = useState(isDocumentVisible());
  const onFocus = useCallback(() => {
    setVisible(isDocumentVisible());
  }, []);
  useEffect(() => setupEventListeners(onFocus), [onFocus]);

  return isVisible;
}

function isDocumentVisible(): boolean {
  if (typeof document === 'undefined') {
    return true;
  }

  return [undefined, 'visible', 'prerender'].includes(document.visibilityState);
}

function setupEventListeners(onFocus: () => void) {
  if (window && window?.addEventListener) {
    // Listen to visibillitychange and focus
    window.addEventListener('visibilitychange', onFocus, false);
    window.addEventListener('focus', onFocus, false);

    return () => {
      // Be sure to unsubscribe if a new handler is set
      window.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }
}
