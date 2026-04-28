import { Request, Response, NextFunction } from "express";
import logger from "../logger";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    logger.warn("Missing Authorization header", { path: req.path, method: req.method });
    return res.status(401).json({
      errorCode: "UNAUTHORIZED",
      message: "Invalid or missing authentication token",
    });
  }

  if (!authHeader.startsWith("Bearer ")) {
    logger.warn("Malformed Authorization header", { path: req.path, method: req.method });
    return res.status(401).json({
      errorCode: "UNAUTHORIZED",
      message: "Invalid or missing authentication token",
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    logger.warn("Empty token in Authorization header", { path: req.path, method: req.method });
    return res.status(401).json({
      errorCode: "UNAUTHORIZED",
      message: "Invalid or missing authentication token",
    });
  }

  // Example simple token validation
  if (token !== "token-test") {
    logger.warn("Invalid token rejected", { path: req.path, method: req.method });
    return res.status(403).json({
      errorCode: "FORBIDDEN",
      message: "Access to the requested tenant is not allowed",
    });
  }

  //   // Optionally attach token info to request
  //   (req as any).partnerToken = token;

  next();
}
