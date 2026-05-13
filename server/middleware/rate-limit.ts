const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function enforceRateLimit(ip: string, key: string, limit: number, windowMs: number) {
  const bucketKey = `${ip}:${key}`;
  const now = Date.now();
  const bucket = rateBuckets.get(bucketKey);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return;
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    const error = new Error("RATE_LIMITED") as Error & { status?: number };
    error.status = 429;
    throw error;
  }
}
