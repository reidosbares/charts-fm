// Logger for group recommendations debugging
import { writeFile, appendFile, mkdir } from 'fs/promises'
import { join } from 'path'

interface LogEntry {
  timestamp: string
  stage: string
  message: string
  data?: any
}

class RecommendationsLogger {
  private logs: LogEntry[] = []
  private startTime: number = Date.now()
  private logFile: string | null = null

  constructor(userId: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    this.logFile = join(process.cwd(), 'logs', `recommendations-${userId}-${timestamp}.log`)
    this.startTime = Date.now()
  }

  async log(stage: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      stage,
      message,
      data,
    }
    this.logs.push(entry)

    const dataStr = data ? `\n  Data: ${JSON.stringify(data, null, 2)}` : ''
    const logMessage = `[${entry.timestamp}] [${stage}] ${message}${dataStr}\n`
    
    // Console output
    console.log(logMessage)

    // File output
    try {
      await mkdir(join(process.cwd(), 'logs'), { recursive: true })
      await appendFile(this.logFile!, logMessage, 'utf-8')
    } catch (error) {
      // Silently fail if file writing fails
      console.error('Failed to write to log file:', error)
    }
  }

  async logSummary() {
    const totalDuration = Date.now() - this.startTime
    const summary = [
      '\n=== RECOMMENDATIONS SUMMARY ===',
      `Total Duration: ${(totalDuration / 1000).toFixed(2)}s`,
      `Log Entries: ${this.logs.length}`,
      '\nBreakdown:',
      ...this.logs.map((log, idx) => 
        `${idx + 1}. [${log.stage}] ${log.message}`
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

  getLogs(): LogEntry[] {
    return this.logs
  }
}

export { RecommendationsLogger }

