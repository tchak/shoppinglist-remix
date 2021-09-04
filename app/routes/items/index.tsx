import type { ActionFunction, LoaderFunction } from 'remix';

import { getItemsLoader, itemsAction } from '../../middlewares';

export const loader: LoaderFunction = (r) => getItemsLoader(r);
export const action: ActionFunction = (r) => itemsAction(r);

export default function ItemsIndexRouteComponent() {
  return null;
}
