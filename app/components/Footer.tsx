import { HeartIcon, LogoutIcon, StarIcon } from '@heroicons/react/outline';
import { Tooltip } from '@reach/tooltip';
import { FormattedMessage, useIntl } from 'react-intl';
import { Link, useMatch } from 'react-router-dom';

export function Footer() {
  const intl = useIntl();
  const isLanding = useMatch('/');

  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto py-12 px-4 overflow-hidden sm:px-6 lg:px-8">
        <div className="mt-8 flex justify-center space-x-6">
          <Tooltip label="Twitter">
            <a
              href="https://twitter.com/tchak13"
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Twitter</span>
              <HeartIcon className="h-5 w-5" />
            </a>
          </Tooltip>
          <Tooltip label="GitHub">
            <a
              href="https://github.com/tchak/shoppinglist-remix"
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">GitHub</span>
              <StarIcon className="h-5 w-5" />
            </a>
          </Tooltip>

          {!isLanding && (
            <Tooltip
              label={intl.formatMessage({
                defaultMessage: 'Sign Out',
                id: 'F62y+K',
              })}
            >
              <Link to="/signout" className="text-gray-400 hover:text-gray-500">
                <span className="sr-only">
                  <FormattedMessage defaultMessage="Sign Out" id="F62y+K" />
                </span>
                <LogoutIcon className="h-5 w-5" />
              </Link>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}
