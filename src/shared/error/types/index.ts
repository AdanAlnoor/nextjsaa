export enum ErrorType {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER = 'SERVER',
  NETWORK = 'NETWORK',
  UNKNOWN = 'UNKNOWN'
}

export class AppError extends Error {
  public readonly type: ErrorType
  public readonly statusCode: number
  public readonly isOperational: boolean
  public context?: string
  public stack?: string

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    statusCode: number = 500,
    stack?: string,
    isOperational: boolean = true
  ) {
    super(message)
    
    this.type = type
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.stack = stack

    Object.setPrototypeOf(this, AppError.prototype)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: string) {
    super(message, ErrorType.VALIDATION, 400)
    this.context = context
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', context?: string) {
    super(message, ErrorType.AUTHENTICATION, 401)
    this.context = context
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', context?: string) {
    super(message, ErrorType.AUTHORIZATION, 403)
    this.context = context
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', context?: string) {
    super(message, ErrorType.NOT_FOUND, 404)
    this.context = context
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', context?: string) {
    super(message, ErrorType.CONFLICT, 409)
    this.context = context
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', context?: string) {
    super(message, ErrorType.RATE_LIMIT, 429)
    this.context = context
  }
}

export class ServerError extends AppError {
  constructor(message: string = 'Internal server error', context?: string) {
    super(message, ErrorType.SERVER, 500)
    this.context = context
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network error', context?: string) {
    super(message, ErrorType.NETWORK, 503)
    this.context = context
  }
}