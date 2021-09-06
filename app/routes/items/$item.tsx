import type { ActionFunction, LoaderFunction } from 'remix';
import { redirect } from 'remix';

import { itemActions } from '../../middlewares';

export const loader: LoaderFunction = () => redirect('/');
export const action: ActionFunction = (r) => itemActions(r);

export default function Items$ItemRouteComponent() {
  return null;
}
