import { Link, useMatch } from 'react-router-dom';
import { LogoutIcon, StarIcon, HeartIcon } from '@heroicons/react/outline';

export function Footer() {
  const isLanding = useMatch('/');

  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto py-12 px-4 overflow-hidden sm:px-6 lg:px-8">
        <div className="mt-8 flex justify-center space-x-6">
          <a
            href="https://twitter.com/tchak13"
            className="text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">Twitter</span>
            <HeartIcon className="h-5 w-5" />
          </a>

          <a
            href="https://github.com/tchak/shoppinglist-remix"
            className="text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">GitHub</span>
            <StarIcon className="h-5 w-5" />
          </a>

          {!isLanding && (
            <Link to="/signout" className="text-gray-400 hover:text-gray-500">
              <span className="sr-only">Sign Out</span>
              <LogoutIcon className="h-5 w-5" />
            </Link>
          )}
        </div>

        <p className="mt-8 text-center text-base text-gray-400">
          &copy; 2021 Tchak
        </p>
      </div>
    </div>
  );
}
