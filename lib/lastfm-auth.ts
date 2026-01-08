// Last.fm Authentication utilities
// Based on: https://www.last.fm/api/authspec

import crypto from 'crypto'
import { acquireLastFMRateLimit } from './lastfm-rate-limiter'

const LASTFM_API_BASE = 'https://ws.audioscrobbler.com/2.0/'
const LASTFM_AUTH_URL = 'https://www.last.fm/api/auth'

/**
 * Generate MD5 hash for API signature
 * According to Last.fm spec: md5(sorted_params + secret)
 */
function generateApiSignature(
  params: Record<string, string>,
  secret: string
): string {
  // Sort parameters alphabetically by key
  const sortedKeys = Object.keys(params).sort()
  
  // Concatenate in format: key1value1key2value2...
  const paramString = sortedKeys
    .map(key => `${key}${params[key]}`)
    .join('')
  
  // Append secret
  const stringToHash = paramString + secret
  
  // Generate MD5 hash
  return crypto.createHash('md5').update(stringToHash, 'utf8').digest('hex')
}

/**
 * Get the Last.fm authorization URL
 * User should be redirected here to authorize the application
 */
export function getLastFMAuthUrl(apiKey: string): string {
  return `${LASTFM_AUTH_URL}/?api_key=${apiKey}`
}

/**
 * Create a Last.fm session from an authentication token
 * This is called after user authorizes and we receive the token
 */
export async function createLastFMSession(
  token: string,
  apiKey: string,
  apiSecret: string
): Promise<{ sessionKey: string; username: string }> {
  // Acquire rate limit token before making the request
  await acquireLastFMRateLimit(1)
  
  const params: Record<string, string> = {
    method: 'auth.getSession',
    api_key: apiKey,
    token: token,
  }

  // Generate API signature
  const apiSig = generateApiSignature(params, apiSecret)
  params.api_sig = apiSig

  // Build query string
  const queryParams = new URLSearchParams({
    ...params,
    format: 'json',
  })

  const response = await fetch(`${LASTFM_API_BASE}?${queryParams}`)

  // Handle rate limiting (HTTP 429)
  if (response.status === 429) {
    throw new Error(`Last.fm API rate limit exceeded: ${response.statusText}`)
  }

  if (!response.ok) {
    throw new Error(`Last.fm API error: ${response.statusText}`)
  }

  const data = await response.json()

  if (data.error) {
    throw new Error(`Last.fm API error: ${data.message || data.error}`)
  }

  return {
    sessionKey: data.session.key,
    username: data.session.name,
  }
}

/**
 * Retry a function with exponential backoff, handling rate limits
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 4,
  initialDelay: number = 2000
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      
      // Don't retry on certain errors (authentication, invalid parameters)
      if (error.message?.includes('Invalid API key') || 
          error.message?.includes('Invalid session key') ||
          error.message?.includes('Invalid method') ||
          error.message?.includes('Invalid parameters')) {
        throw error
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error
      }
      
      // For rate limit errors (429), use much longer backoff
      const isRateLimit = error.status === 429 || error.message?.includes('429') || error.message?.includes('rate limit')
      const baseDelay = isRateLimit ? initialDelay * 2.5 : initialDelay
      
      // Calculate delay with exponential backoff:
      // Normal errors: 2s, 4s, 8s, 16s
      // Rate limit errors: 5s, 12.5s, 31.25s, 78.125s
      const delay = baseDelay * Math.pow(2, attempt)
      console.warn(`[Last.fm API] ⚠️  Call failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${(delay / 1000).toFixed(1)}s:`, error.message)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError || new Error('Unknown error in retry logic')
}

/**
 * Make an authenticated Last.fm API call
 * Requires session key from createLastFMSession
 * Includes retry logic for transient errors
 */
export async function authenticatedLastFMCall(
  method: string,
  sessionKey: string,
  apiKey: string,
  apiSecret: string,
  additionalParams: Record<string, string> = {}
): Promise<any> {
  // Acquire rate limit token before making the request
  await acquireLastFMRateLimit(1)
  
  return retryWithBackoff(async () => {
    const params: Record<string, string> = {
      method,
      api_key: apiKey,
      sk: sessionKey, // Session key
      ...additionalParams,
    }

    // Generate API signature
    const apiSig = generateApiSignature(params, apiSecret)
    params.api_sig = apiSig

    // Build query string
    const queryParams = new URLSearchParams({
      ...params,
      format: 'json',
    })

    const response = await fetch(`${LASTFM_API_BASE}?${queryParams}`)

    // Handle rate limiting (HTTP 429)
    if (response.status === 429) {
      const error: any = new Error(`Last.fm API rate limit exceeded: ${response.statusText}`)
      error.status = 429
      throw error
    }

    if (!response.ok) {
      throw new Error(`Last.fm API error: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(`Last.fm API error: ${data.message || data.error}`)
    }

    return data
  })
}

