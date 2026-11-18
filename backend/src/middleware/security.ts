import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_RATE_LIMIT_ENTRIES = 5000;
let lastCleanup = Date.now();

/**
 * Periodically purge expired rate limit entries to prevent memory exhaustion
 */
function cleanupExpiredRecords(now: number): void {
  if (now - lastCleanup < 60 * 1000 && rateLimitMap.size < MAX_RATE_LIMIT_ENTRIES) {
    return;
  }
  lastCleanup = now;

  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }

  // If still above ceiling after purging expired, eject oldest entries (FIFO eviction)
  if (rateLimitMap.size >= MAX_RATE_LIMIT_ENTRIES) {
    const toRemove = rateLimitMap.size - Math.floor(MAX_RATE_LIMIT_ENTRIES * 0.75);
    let removed = 0;
    for (const key of rateLimitMap.keys()) {
      rateLimitMap.delete(key);
      removed++;
      if (removed >= toRemove) break;
    }
  }
}

/**
 * For testing purposes: clear all in-memory rate limits
 */
export function resetRateLimitMap(): void {
  rateLimitMap.clear();
}

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

  cleanupExpiredRecords(now);

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
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.status || err.statusCode || 500;
  if (status === 413) {
    res.status(413).json({
      error: 'Payload Too Large',
      message: 'Request entity exceeds 100kb payload size limit.'
    });
    return;
  }
  console.error('[API Error]', err.message, err.stack);
  res.status(status).json({
    error: status === 500 ? 'Internal Server Error' : err.name || 'Request Error',
    message:
      (process.env.NODE_ENV || env.NODE_ENV) === 'production' && status === 500
        ? 'An unexpected server error occurred.'
        : err.message
  });
}
