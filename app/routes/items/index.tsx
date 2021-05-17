import type { LoaderFunction } from 'remix';
import { json } from 'remix';

import { withSession, requireUser } from '../../sessions';
import { autocompleteForUser } from '../../lib/autocomplete.server';

export const loader: LoaderFunction = ({ request }) =>
  withSession(request, (session) =>
    requireUser(session, async (user) => {
      const url = new URL(request.url);
      const term = url.searchParams.get('term');
      const items = await autocomplete(term, user.id);

      return json(items);
    })
  );

export default function ItemsIndexRoute() {
  return null;
}

async function autocomplete(term: string | null, userId: string) {
  if (term) {
    return (await autocompleteForUser(userId))
      .search(term, { limit: 6 })
      .map((result) => result.item);
  }
  return [];
}
