import type { List, Item, User } from '@prisma/client';
import type { These } from 'fp-ts/These';
import type { Option } from 'fp-ts/Option';
import type { DecodeError } from 'io-ts/Decoder';

export type ListWithItems = List & {
  items: Item[];
  users: { userId: string }[];
};

export type SharedList = List & {
  isShared: boolean;
  itemsCount: number;
};

export type { List, Item, User };

type CredentialsDTO = { email: string; password: string };
export type SignInDTO = These<DecodeError, Option<CredentialsDTO>>;
export type SignUpDTO = These<DecodeError, Option<CredentialsDTO>>;

export type SharedListsDTO = These<never, SharedList[]>;
export type ListDTO = These<never, ListWithItems>;
