// Logger for records calculation performance tracking
import { appendFile, mkdir } from 'fs/promises'
import { join } from 'path'

interface LogEntry {
  timestamp: string
  step: string
  duration: number
  details?: string
}

// Only log to console if explicitly enabled via environment variable
const ENABLE_CONSOLE_LOGGING = process.env.ENABLE_RECORDS_CALCULATION_LOGS === 'true'

class RecordsCalculationLogger {
  private logs: LogEntry[] = []
  private startTime: number = Date.now()
  private logFile: string | null = null
  private calculationType: 'full' | 'incremental' = 'full'
  private entriesChecked: number = 0
  private recordsUpdated: number = 0

  constructor(groupId: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    this.logFile = join(process.cwd(), 'logs', `records-calculation-${groupId}-${timestamp}.log`)
    this.startTime = Date.now()
    // Write initial log entry immediately to verify file writing works
    this.writeInitialLog().catch((err) => {
      console.error(`[RecordsLogger] Failed to write initial log:`, err)
    })
  }

  private async writeInitialLog() {
    const message = `[${new Date().toISOString()}] Records calculation logger initialized\n`
    try {
      await mkdir(join(process.cwd(), 'logs'), { recursive: true })
      await appendFile(this.logFile!, message, 'utf-8')
    } catch (error) {
      console.error(`[RecordsLogger] Failed to write initial log to ${this.logFile}:`, error)
    }
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms.toFixed(2)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  setCalculationType(type: 'full' | 'incremental') {
    this.calculationType = type
  }

  setEntriesChecked(count: number) {
    this.entriesChecked = count
  }

  incrementRecordsUpdated() {
    this.recordsUpdated++
  }

  async log(step: string, duration: number, details?: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      step,
      duration,
      details,
    }
    this.logs.push(entry)

    const message = `[${entry.timestamp}] ${step} - ${this.formatDuration(duration)}${details ? ` - ${details}` : ''}`
    
    // Console output (only if enabled)
    if (ENABLE_CONSOLE_LOGGING) {
      console.log(message)
    }

    // File output (always enabled for performance analysis)
    try {
      await mkdir(join(process.cwd(), 'logs'), { recursive: true })
      await appendFile(this.logFile!, message + '\n', 'utf-8')
    } catch (error) {
      // Always log file write errors to console for debugging
      console.error(`[RecordsLogger] Failed to write to log file ${this.logFile}:`, error)
    }
  }

  async logStart(step: string, details?: string) {
    const start = Date.now()
    return {
      end: async (endDetails?: string) => {
        const duration = Date.now() - start
        await this.log(step, duration, endDetails || details)
        return duration
      },
    }
  }

  async logSummary() {
    const totalDuration = Date.now() - this.startTime
    const summary = [
      '\n=== RECORDS CALCULATION SUMMARY ===',
      `Total Duration: ${this.formatDuration(totalDuration)}`,
      `Steps: ${this.logs.length}`,
      `Calculation Type: ${this.calculationType}`,
      ...(this.calculationType === 'incremental' ? [`Entries Checked: ${this.entriesChecked}`] : []),
      `Records Updated: ${this.recordsUpdated}`,
      '\nBreakdown:',
      ...this.logs.map((log, idx) => 
        `${idx + 1}. ${log.step}: ${this.formatDuration(log.duration)}${log.details ? ` (${log.details})` : ''}`
      ),
      '================================\n',
    ].join('\n')

    if (ENABLE_CONSOLE_LOGGING) {
      console.log(summary)
    }
    
    if (this.logFile) {
      try {
        await appendFile(this.logFile!, summary, 'utf-8')
        if (ENABLE_CONSOLE_LOGGING) {
          console.log(`\nFull log saved to: ${this.logFile}`)
        }
      } catch (error) {
        if (ENABLE_CONSOLE_LOGGING) {
          console.error('Failed to write summary to log file:', error)
        }
      }
    }
  }

  getLogs(): LogEntry[] {
    return this.logs
  }

  getLogFile(): string | null {
    return this.logFile
  }
}

export { RecordsCalculationLogger }

