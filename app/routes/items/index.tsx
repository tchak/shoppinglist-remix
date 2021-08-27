import type { LoaderFunction } from 'remix';

import { getItemsLoader } from '../../middlewares';

export const loader: LoaderFunction = (r) => getItemsLoader(r);

export default function ItemsIndexRouteComponent() {
  return null;
}
