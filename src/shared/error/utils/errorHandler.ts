import { ErrorType, AppError } from '../types'

export class ErrorHandler {
  static handle(error: unknown): AppError {
    if (error instanceof AppError) {
      return error
    }

    if (error instanceof Error) {
      return new AppError(
        error.message || 'An unexpected error occurred',
        ErrorType.UNKNOWN,
        500,
        error.stack
      )
    }

    return new AppError(
      'An unexpected error occurred',
      ErrorType.UNKNOWN,
      500
    )
  }

  static async handleAsync<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      const handledError = this.handle(error)
      if (context) {
        handledError.context = context
      }
      throw handledError
    }
  }

  static handleSync<T>(
    operation: () => T,
    context?: string
  ): T {
    try {
      return operation()
    } catch (error) {
      const handledError = this.handle(error)
      if (context) {
        handledError.context = context
      }
      throw handledError
    }
  }
}