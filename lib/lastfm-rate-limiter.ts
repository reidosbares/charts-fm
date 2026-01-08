// Token bucket rate limiter for Last.fm API
// Implements a token bucket algorithm to respect Last.fm's rate limits

class TokenBucket {
  private tokens: number
  private capacity: number
  private refillRate: number // tokens per second
  private lastRefill: number

  constructor(capacity: number, refillRate: number) {
    this.capacity = capacity
    this.refillRate = refillRate
    this.tokens = capacity
    this.lastRefill = Date.now()
  }

  private refill(): void {
    const now = Date.now()
    const elapsed = (now - this.lastRefill) / 1000 // seconds
    const tokensToAdd = elapsed * this.refillRate
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd)
    this.lastRefill = now
  }

  /**
   * Acquire tokens, waiting if necessary
   * @param tokens Number of tokens to acquire (default: 1)
   */
  async acquire(tokens: number = 1): Promise<void> {
    this.refill()
    
    if (this.tokens >= tokens) {
      this.tokens -= tokens
      // Only log when tokens are getting low to reduce noise
      if (this.tokens < 3) {
        console.log(`[Rate Limiter] ⚠️  Low tokens: ${this.tokens.toFixed(1)}/${this.capacity} remaining`)
      }
      return
    }
    
    // Not enough tokens, wait
    const tokensNeeded = tokens - this.tokens
    const waitTime = (tokensNeeded / this.refillRate) * 1000
    console.log(`[Rate Limiter] ⏳ Rate limit: waiting ${Math.ceil(waitTime)}ms (tokens: ${this.tokens.toFixed(1)}/${this.capacity})`)
    await new Promise(resolve => setTimeout(resolve, Math.ceil(waitTime)))
    
    this.refill()
    this.tokens -= tokens
    console.log(`[Rate Limiter] ✅ Token acquired. Remaining: ${this.tokens.toFixed(1)}/${this.capacity}`)
  }

  /**
   * Try to acquire tokens without waiting
   * @param tokens Number of tokens to acquire (default: 1)
   * @returns true if tokens were acquired, false otherwise
   */
  tryAcquire(tokens: number = 1): boolean {
    this.refill()
    if (this.tokens >= tokens) {
      this.tokens -= tokens
      return true
    }
    return false
  }
}

// Create a singleton rate limiter for Last.fm API
// Configuration: 10 token capacity (allows small bursts), 2 tokens/second refill rate
// This allows bursts of up to 10 requests, then sustains at 2 requests/second
// More conservative to avoid rate limit issues since Last.fm doesn't publish clear limits
const LASTFM_RATE_LIMITER = new TokenBucket(10, 2)

/**
 * Acquire rate limit tokens before making a Last.fm API call
 * This will wait if necessary to respect rate limits
 */
export async function acquireLastFMRateLimit(tokens: number = 1): Promise<void> {
  await LASTFM_RATE_LIMITER.acquire(tokens)
}

/**
 * Check if we can make a Last.fm API call without waiting
 * @returns true if tokens are available, false otherwise
 */
export function canMakeLastFMCall(tokens: number = 1): boolean {
  return LASTFM_RATE_LIMITER.tryAcquire(tokens)
}

