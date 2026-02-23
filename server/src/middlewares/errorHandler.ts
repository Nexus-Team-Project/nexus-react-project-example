import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (err instanceof AppError) {
    const body: { errorCode: string; message: string; details?: string } = {
      errorCode: err.errorCode,
      message: err.message,
    };
    if (err.details !== undefined) body.details = err.details;
    res.status(err.statusCode).json(body);
    return;
  }

  console.error(err);
  res.status(500).json({
    errorCode: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred",
  });
}
