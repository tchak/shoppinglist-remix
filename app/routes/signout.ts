import type { LoaderFunction } from 'remix';

import { signOutLoader } from '../loaders';

export const loader: LoaderFunction = (params) => signOutLoader(params);

export default function SignOutRoute() {
  return null;
}
