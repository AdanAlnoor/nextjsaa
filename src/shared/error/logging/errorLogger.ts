import { AppError, ErrorType } from '../types'

export interface ErrorLogData {
  message: string
  type: ErrorType
  statusCode: number
  stack?: string
  context?: string
  timestamp: string
  userId?: string
  sessionId?: string
  url?: string
  userAgent?: string
}

export class ErrorLogger {
  private static instance: ErrorLogger
  private logQueue: ErrorLogData[] = []
  private isProcessing = false

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger()
    }
    return ErrorLogger.instance
  }

  async log(error: AppError | Error, additionalData?: Partial<ErrorLogData>) {
    const errorData: ErrorLogData = {
      message: error.message,
      type: error instanceof AppError ? error.type : ErrorType.UNKNOWN,
      statusCode: error instanceof AppError ? error.statusCode : 500,
      stack: error.stack,
      context: error instanceof AppError ? error.context : undefined,
      timestamp: new Date().toISOString(),
      ...additionalData
    }

    this.logQueue.push(errorData)
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', errorData)
    }

    // Process the queue
    this.processQueue()
  }

  private async processQueue() {
    if (this.isProcessing || this.logQueue.length === 0) {
      return
    }

    this.isProcessing = true

    try {
      // Send to external logging service in production
      if (process.env.NODE_ENV === 'production') {
        await this.sendToLoggingService(this.logQueue)
      }
      
      this.logQueue = []
    } catch (error) {
      console.error('Failed to send error logs:', error)
    } finally {
      this.isProcessing = false
    }
  }

  private async sendToLoggingService(logs: ErrorLogData[]) {
    // Implementation would depend on your logging service
    // Examples: Sentry, LogRocket, Winston, etc.
    
    // For now, just log to console
    console.log('Sending error logs to service:', logs)
  }
}

export const errorLogger = ErrorLogger.getInstance()