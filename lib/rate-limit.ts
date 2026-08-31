import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

export type RateLimitPolicy = {
  name: string;
  limit: number;
  windowSeconds: number;
  blockSeconds?: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

function requestAddress(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return (forwarded?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown').toLowerCase();
}

function bucketKey(request: Request, policy: RateLimitPolicy, discriminator?: string): string {
  const raw = `${policy.name}|${requestAddress(request)}|${(discriminator || '').trim().toLowerCase()}`;
  return createHash('sha256').update(raw).digest('hex');
}

function hashBucketKey(policy: RateLimitPolicy, identifier: string): string {
  return createHash('sha256').update(`${policy.name}|${identifier.trim().toLowerCase()}`).digest('hex');
}

export async function enforceRateLimit(
  request: Request,
  policy: RateLimitPolicy,
  discriminator?: string,
): Promise<RateLimitResult> {
  return enforceRateLimitForKey(policy, bucketKey(request, policy, discriminator));
}

export async function enforceIdentifierRateLimit(
  policy: RateLimitPolicy,
  identifier: string,
): Promise<RateLimitResult> {
  return enforceRateLimitForKey(policy, hashBucketKey(policy, identifier));
}

async function enforceRateLimitForKey(
  policy: RateLimitPolicy,
  key: string,
): Promise<RateLimitResult> {
  const now = new Date();
  const windowMs = policy.windowSeconds * 1000;
  const blockMs = (policy.blockSeconds ?? policy.windowSeconds) * 1000;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const existing = await tx.rateLimitBucket.findUnique({ where: { key } });
          if (existing?.blockedUntil && existing.blockedUntil > now) {
            return {
              allowed: false,
              limit: policy.limit,
              remaining: 0,
              retryAfterSeconds: Math.max(1, Math.ceil((existing.blockedUntil.getTime() - now.getTime()) / 1000)),
            };
          }

          const expired = !existing || now.getTime() - existing.windowStart.getTime() >= windowMs;
          const count = expired ? 1 : existing.count + 1;
          const blockedUntil = count > policy.limit ? new Date(now.getTime() + blockMs) : null;
          await tx.rateLimitBucket.upsert({
            where: { key },
            update: {
              windowStart: expired ? now : existing!.windowStart,
              count,
              blockedUntil,
            },
            create: { key, windowStart: now, count, blockedUntil },
          });

          return {
            allowed: count <= policy.limit,
            limit: policy.limit,
            remaining: Math.max(0, policy.limit - count),
            retryAfterSeconds: count <= policy.limit ? 0 : Math.max(1, Math.ceil(blockMs / 1000)),
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (attempt < 2 && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        continue;
      }
      throw error;
    }
  }

  throw new Error('Rate limit transaction failed');
}
