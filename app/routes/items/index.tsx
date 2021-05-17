import type { LoaderFunction } from 'remix';
import { json } from 'remix';

import { withSession, requireUser } from '../../sessions';
import { autocompleteSearchTerm } from '../../lib/autocomplete.server';

export const loader: LoaderFunction = ({ request }) =>
  withSession(request, (session) =>
    requireUser(session, async (user) => {
      const url = new URL(request.url);
      const term = url.searchParams.get('term') ?? '';
      const items = await autocompleteSearchTerm(term, user.id);

      return json(items);
    })
  );

export default function ItemsIndexRoute() {
  return null;
}
