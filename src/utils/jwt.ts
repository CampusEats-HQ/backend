import jwt from 'jsonwebtoken';
import { AuthPayload } from '../types';

const SECRET = process.env.JWT_SECRET as string;

export function signToken(payload: AuthPayload, expiresIn = '7d'): string {
  return jwt.sign(payload, SECRET, { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, SECRET) as AuthPayload;
}
