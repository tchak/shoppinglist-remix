import type { LoaderFunction } from 'remix';
import { redirect } from 'remix';

import { withSession } from '../sessions';

export const loader: LoaderFunction = ({ request }) =>
  withSession(request, async (session) => {
    session.unset('user');
    return redirect('/signin');
  });

export default function SignOut() {
  return null;
}
