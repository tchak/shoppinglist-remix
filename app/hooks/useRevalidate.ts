import { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export function useRevalidate() {
  const navigate = useNavigate();
  return () => navigate('.', { replace: true });
}

export function useRevalidateOnWindowFocus() {
  const shouldRefetch = useRef(false);
  const isVisible = usePageVisible();
  const revalidate = useRevalidate();

  useEffect(() => {
    if (isVisible && shouldRefetch.current) {
      revalidate();
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
