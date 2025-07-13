import { NextResponse } from 'next/server'
import { AppError, ErrorType } from '../types'

export class ApiErrorHandler {
  static handle(error: unknown): NextResponse {
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            message: error.message,
            type: error.type,
            code: error.statusCode,
            context: error.context
          }
        },
        { status: error.statusCode }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: {
            message: error.message || 'Internal server error',
            type: ErrorType.SERVER,
            code: 500
          }
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: {
          message: 'Internal server error',
          type: ErrorType.SERVER,
          code: 500
        }
      },
      { status: 500 }
    )
  }

  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T | NextResponse> {
    try {
      return await operation()
    } catch (error) {
      if (error instanceof AppError && context) {
        error.context = context
      }
      return this.handle(error)
    }
  }
}