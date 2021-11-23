import type { ActionFunction, LoaderFunction } from 'remix';

import { getItemsLoader, itemsActions } from '~/middlewares';

export const loader: LoaderFunction = (r) => getItemsLoader(r);
export const action: ActionFunction = (r) => itemsActions(r);

export default function ItemsIndexRouteComponent() {
  return null;
}
