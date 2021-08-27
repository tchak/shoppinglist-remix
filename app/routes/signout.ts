import type { LoaderFunction } from 'remix';

import { signOutLoader } from '../middlewares';

export const loader: LoaderFunction = (r) => signOutLoader(r);

export default function SignOutRoute() {
  return null;
}
