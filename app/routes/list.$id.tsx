import type { LoaderFunction } from 'remix';
import { redirect } from 'remix';

export const loader: LoaderFunction = ({ params }) =>
  redirect(`/lists/${params.id}`);

export default function ListShow() {
  return null;
}
