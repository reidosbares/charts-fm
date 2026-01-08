// Logger for Last.fm API responses and errors
import { appendFile, mkdir } from 'fs/promises'
import { join } from 'path'

interface LastFMAPILogEntry {
  timestamp: string
  username: string
  method: string
  requestType: 'authenticated' | 'unauthenticated'
  statusCode?: number
  success: boolean
  error?: string
  responseBody?: any
  requestParams?: Record<string, string>
}

class LastFMAPILogger {
  private logs: LastFMAPILogEntry[] = []
  private logFile: string | null = null

  constructor(groupId?: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = groupId 
      ? `lastfm-api-${groupId}-${timestamp}.log`
      : `lastfm-api-${timestamp}.log`
    this.logFile = join(process.cwd(), 'logs', filename)
    this.writeInitialLog().catch((err) => {
      console.error(`[LastFMAPILogger] Failed to write initial log:`, err)
    })
  }

  private async writeInitialLog() {
    const message = `[${new Date().toISOString()}] Last.fm API Logger initialized\n`
    try {
      await mkdir(join(process.cwd(), 'logs'), { recursive: true })
      await appendFile(this.logFile!, message, 'utf-8')
      console.log(`[LastFMAPILogger] Log file: ${this.logFile}`)
    } catch (error) {
      console.error(`[LastFMAPILogger] Failed to write initial log to ${this.logFile}:`, error)
    }
  }

  logRequest(
    username: string,
    method: string,
    requestType: 'authenticated' | 'unauthenticated',
    requestParams?: Record<string, string>
  ): LastFMAPILogEntry {
    const entry: LastFMAPILogEntry = {
      timestamp: new Date().toISOString(),
      username,
      method,
      requestType,
      success: false,
      requestParams: requestParams ? { ...requestParams } : undefined, // Remove sensitive data
    }

    // Remove sensitive parameters from logging
    if (entry.requestParams) {
      if (entry.requestParams.api_key) entry.requestParams.api_key = '[REDACTED]'
      if (entry.requestParams.api_sig) entry.requestParams.api_sig = '[REDACTED]'
      if (entry.requestParams.sk) entry.requestParams.sk = '[REDACTED]'
    }

    this.logs.push(entry)
    return entry
  }

  async logResponse(
    entry: LastFMAPILogEntry,
    statusCode: number,
    responseBody: any,
    error?: string
  ) {
    entry.statusCode = statusCode
    entry.success = !error && statusCode >= 200 && statusCode < 300
    entry.error = error
    entry.responseBody = responseBody

    const logMessage = this.formatLogEntry(entry)
    
    // Always log to console for errors
    if (!entry.success) {
      console.error(`[LastFMAPILogger] ❌ API Error for ${entry.username}:`, logMessage)
    }

    // Write to file
    try {
      await mkdir(join(process.cwd(), 'logs'), { recursive: true })
      await appendFile(this.logFile!, logMessage + '\n\n', 'utf-8')
    } catch (error) {
      console.error(`[LastFMAPILogger] Failed to write to log file ${this.logFile}:`, error)
    }
  }

  private formatLogEntry(entry: LastFMAPILogEntry): string {
    const lines = [
      `[${entry.timestamp}] Last.fm API Call`,
      `Username: ${entry.username}`,
      `Method: ${entry.method}`,
      `Request Type: ${entry.requestType}`,
      `Status Code: ${entry.statusCode ?? 'N/A'}`,
      `Success: ${entry.success}`,
    ]

    if (entry.requestParams) {
      lines.push(`Request Params: ${JSON.stringify(entry.requestParams, null, 2)}`)
    }

    if (entry.error) {
      lines.push(`Error: ${entry.error}`)
    }

    if (entry.responseBody) {
      lines.push(`Response Body: ${JSON.stringify(entry.responseBody, null, 2)}`)
    }

    return lines.join('\n')
  }

  async logSummary() {
    const summary = [
      '\n=== LAST.FM API LOG SUMMARY ===',
      `Total API Calls: ${this.logs.length}`,
      `Successful: ${this.logs.filter(l => l.success).length}`,
      `Failed: ${this.logs.filter(l => !l.success).length}`,
      '\nFailed Calls:',
      ...this.logs
        .filter(l => !l.success)
        .map((log, idx) => 
          `${idx + 1}. ${log.username} - ${log.method} - ${log.error || 'Unknown error'}`
        ),
      '================================\n',
    ].join('\n')

    console.log(summary)
    
    if (this.logFile) {
      try {
        await appendFile(this.logFile!, summary, 'utf-8')
        console.log(`\nFull log saved to: ${this.logFile}`)
      } catch (error) {
        console.error('Failed to write summary to log file:', error)
      }
    }
  }

  getLogFile(): string | null {
    return this.logFile
  }
}

// Singleton instance for chart generation
let globalLogger: LastFMAPILogger | null = null

export function getLastFMAPILogger(groupId?: string): LastFMAPILogger {
  if (!globalLogger) {
    globalLogger = new LastFMAPILogger(groupId)
  }
  return globalLogger
}

export function resetLastFMAPILogger() {
  globalLogger = null
}

export { LastFMAPILogger }

