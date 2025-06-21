export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function handleApiError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }

  if (error instanceof Error) {
    return new AppError(
      error.message,
      'UNKNOWN_ERROR',
      500
    )
  }

  return new AppError(
    'An unexpected error occurred',
    'UNKNOWN_ERROR',
    500
  )
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
} 