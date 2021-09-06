import { hash as argonHash, verify as argonVerify } from 'argon2';
import type { Task } from 'fp-ts/Task';

export function verify(hash: string, plain: string): Task<boolean> {
  return () => argonVerify(hash, plain);
}

export function hash(plain: string): Task<string> {
  return () => argonHash(plain);
}
