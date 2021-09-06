import { ShareIcon } from '@heroicons/react/outline';
import { Tooltip } from '@reach/tooltip';
import ms from 'ms';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import useClipboard from 'react-use-clipboard';

import { Notification } from '.';

export function ShareButton() {
  const [isShared, { share, close }] = useShare();
  const intl = useIntl();

  return (
    <>
      <Notification
        isOpen={isShared}
        onClose={close}
        text={intl.formatMessage({
          defaultMessage: 'Link copied!',
          id: '/vCdX1',
        })}
      />
      <Tooltip
        label={intl.formatMessage({
          defaultMessage: 'Share list',
          id: 'Zfhxw8',
        })}
      >
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
