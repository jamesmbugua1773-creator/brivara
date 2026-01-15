import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize user input to prevent XSS attacks
 * Cleans HTML and strips dangerous scripts
 */
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return DOMPurify.sanitize(input, { 
      ALLOWED_TAGS: [], // Strip all HTML
      ALLOWED_ATTR: [] 
    });
  }
  
  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item));
  }
  
  if (input && typeof input === 'object') {
    const sanitized: any = {};
    for (const key in input) {
      if (input.hasOwnProperty(key)) {
        sanitized[key] = sanitizeInput(input[key]);
      }
    }
    return sanitized;
  }
  
  return input;
}

/**
 * Middleware to sanitize all request inputs
 * Applies to body, query, and params
 */
export function sanitizeMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeInput(req.query);
  }
  
  if (req.params) {
    req.params = sanitizeInput(req.params);
  }
  
  next();
}

/**
 * Validate and sanitize wallet addresses
 */
export function validateWalletAddress(address: string, network: 'BEP20' | 'TRC20'): boolean {
  if (!address || typeof address !== 'string') return false;
  
  // Remove any whitespace
  address = address.trim();
  
  if (network === 'BEP20') {
    // Ethereum/BSC address format: 0x followed by 40 hex characters
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
  
  if (network === 'TRC20') {
    // TRON address format: T followed by 33 alphanumeric characters
    return /^T[a-zA-Z0-9]{33}$/.test(address);
  }
  
  return false;
}

/**
 * Validate transaction ID format
 */
export function validateTxId(txId: string): boolean {
  if (!txId || typeof txId !== 'string') return false;
  
  // Transaction IDs are typically 64-66 hex characters (with optional 0x prefix)
  return /^(0x)?[a-fA-F0-9]{64,66}$/.test(txId.trim());
}

/**
 * Sanitize and validate email
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  
  // Basic email validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim().toLowerCase());
}

/**
 * Prevent SQL injection in raw strings
 */
export function escapeSqlString(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input.replace(/'/g, "''")
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\0/g, '\\0');
}

/**
 * Rate limit key generation helper
 * Combines IP with optional user ID for stricter limiting
 */
export function generateRateLimitKey(req: Request, userId?: string): string {
  const ip = (req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown') as string;
  return userId ? `${ip}:${userId}` : ip;
}

/**
 * Detect and block common attack patterns
 */
export function detectAttackPatterns(input: string): boolean {
  if (typeof input !== 'string') return false;
  
  const patterns = [
    /<script/i,                    // XSS attempts
    /javascript:/i,                // JavaScript protocol
    /on\w+\s*=/i,                  // Event handlers
    /eval\(/i,                     // Code evaluation
    /union\s+select/i,             // SQL injection
    /drop\s+table/i,               // SQL injection
    /delete\s+from/i,              // SQL injection
    /insert\s+into/i,              // SQL injection
    /update\s+.+set/i,             // SQL injection
    /\.\.[/\\]/,                  // Path traversal (../ or ..\)
    /\0/,                          // Null byte injection
    /%00/i,                        // Null byte (encoded)
  ];
  
  return patterns.some(pattern => pattern.test(input));
}

/**
 * Security headers middleware
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Disable caching for sensitive endpoints
  if (req.path.includes('/api/auth') || req.path.includes('/api/wallet')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
}
