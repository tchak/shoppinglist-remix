import type { ActionFunction, LoaderFunction } from 'remix';
import { redirect } from 'remix';

import { itemActions } from '../../actions';

export const loader: LoaderFunction = () => redirect('/');
export const action: ActionFunction = (params) => itemActions(params);

export default function ItemsShowRoute() {
  return null;
}
