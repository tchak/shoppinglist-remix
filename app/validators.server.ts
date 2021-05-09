import { isEmail, minLength } from 'class-validator';

export function validateEmail(email: string): boolean {
  return isEmail(email);
}

export function validatePassword(password: string): boolean {
  return minLength(password, 6);
}
