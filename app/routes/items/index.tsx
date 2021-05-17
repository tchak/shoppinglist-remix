import type { LoaderFunction } from 'remix';
import { json } from 'remix';

import { withSession, requireUser } from '../../sessions';
import food from '../../data/food.server';

export const loader: LoaderFunction = ({ request }) =>
  withSession(request, (session) =>
    requireUser(session, () => {
      const url = new URL(request.url);
      const term = url.searchParams.get('term');
      const items = term ? food.search(term).map((result) => result.item) : [];

      return json(items);
    })
  );

export default function ItemsRoute() {
  return null;
}
