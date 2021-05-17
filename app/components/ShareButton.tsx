import { useEffect, useState } from 'react';
import { ShareIcon } from '@heroicons/react/outline';
import useClipboard from 'react-use-clipboard';
import ms from 'ms';
import { Tooltip } from '@reach/tooltip';

import { Notification } from './Notification';

export function ShareButton() {
  const [isShared, { share, close }] = useShare();
  return (
    <>
      <Notification isOpen={isShared} onClose={close} text="Link copied!" />
      <Tooltip label="Share list">
        <button type="button" onClick={share}>
          <ShareIcon className="text-gray-900 h-8 w-8" />
        </button>
      </Tooltip>
    </>
  );
}

function useExpiration(ms: number): [boolean, () => void, () => void] {
  const [flag, setFlag] = useState(false);
  const on = () => setFlag(true);
  const off = () => setFlag(false);
  useEffect(() => {
    const timer = setTimeout(off, ms);
    return () => clearTimeout(timer);
  }, [ms]);
  return [flag, on, off];
}

function useShare(): [boolean, { share: () => void; close: () => void }] {
  const ttl = '5 seconds';
  const url = location.toString();
  const [, setCopied] = useClipboard(url, {
    successDuration: ms(ttl),
  });
  const [isShared, setShared, close] = useExpiration(ms(ttl));

  const share = () => {
    if (navigator.share) {
      navigator.share({ url }).then(setShared);
    } else {
      setCopied();
      setShared();
    }
  };

  return [!!isShared, { share, close }];
}
