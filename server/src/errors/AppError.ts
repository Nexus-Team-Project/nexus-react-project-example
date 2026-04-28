export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details?: string;

  constructor(statusCode: number, errorCode: string, message: string, details?: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    // Fixes instanceof checks when TypeScript compiles class inheritance targeting ES5
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
