import type { LoaderFunction } from 'remix';

import { getItemsLoader } from '../../loaders';

export const loader: LoaderFunction = (params) => getItemsLoader(params);

export default function ItemsIndexRoute() {
  return null;
}
