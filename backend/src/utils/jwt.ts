import jwt from 'jsonwebtoken';
import { env, requireJwtSecret } from '../config/env.js';

export function createToken(userId: string) {
  const secret = requireJwtSecret();
  const expiresIn = env.jwtExpiresIn;
  return jwt.sign({ sub: userId }, secret as jwt.Secret, { expiresIn: expiresIn as any });
}
