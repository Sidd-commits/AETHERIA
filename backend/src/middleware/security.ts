import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

/**
 * Security headers middleware enforcing Cloudflare / OWASP standards
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(self), microphone=(self), geolocation=(), interest-cohort=()'
  );
  if (env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
}

/**
 * Simple in-memory rate limiter per IP to prevent DoS
 */
export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window

  let record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + windowMs };
    rateLimitMap.set(ip, record);
    return next();
  }

  record.count++;
  if (record.count > env.RATE_LIMIT_MAX_REQUESTS_PER_MINUTE) {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please wait before making more requests.',
      retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000)
    });
    return;
  }

  next();
}

/**
 * Global API error handling boundary
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[API Error]', err.message, err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: env.NODE_ENV === 'production' ? 'An unexpected server error occurred.' : err.message
  });
}
