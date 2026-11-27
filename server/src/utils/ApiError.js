/**
 * Standard API error class for DevSync
 * Follows error specifications in Blueprint Section 7.1 & 7.13
 */
export class ApiError extends Error {
  constructor(statusCode, code, message, details = []) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default ApiError;
