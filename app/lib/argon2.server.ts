import type { Task } from 'fp-ts/Task';

import { hash as argonHash, verify as argonVerify } from 'argon2';

export function verify(hash: string, plain: string): Task<boolean> {
  return () => argonVerify(hash, plain);
}

export function hash(plain: string): Task<string> {
  return () => argonHash(plain);
}
