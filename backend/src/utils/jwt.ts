import jwt from 'jsonwebtoken';

export function createToken(userId: string) {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ sub: userId }, secret as jwt.Secret, { expiresIn: expiresIn as any });
}
