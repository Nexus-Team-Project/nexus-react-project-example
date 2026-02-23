import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";
import logger from "../logger";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (err instanceof AppError) {
    const logMeta = {
      errorCode: err.errorCode,
      statusCode: err.statusCode,
      details: err.details,
      path: req.path,
      method: req.method,
    };
    if (err.statusCode >= 500) {
      logger.error(err.message, { ...logMeta, stack: err.stack });
    } else {
      logger.warn(err.message, logMeta);
    }
    const body: { errorCode: string; message: string; details?: string } = {
      errorCode: err.errorCode,
      message: err.message,
    };
    if (err.details !== undefined) body.details = err.details;
    res.status(err.statusCode).json(body);
    return;
  }

  logger.error("Unhandled error", {
    err,
    path: req.path,
    method: req.method,
    stack: err instanceof Error ? err.stack : undefined,
  });
  res.status(500).json({
    errorCode: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred",
  });
}
