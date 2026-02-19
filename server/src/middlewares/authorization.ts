import { Request, Response, NextFunction } from "express";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      errorCode: "UNAUTHORIZED",
      message: "Invalid or missing authentication token",
    });
  }

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      errorCode: "UNAUTHORIZED",
      message: "Invalid or missing authentication token",
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      errorCode: "UNAUTHORIZED",
      message: "Invalid or missing authentication token",
    });
  }

  // Example simple token validation
  if (token !== "token-test") {
    return res.status(403).json({
      errorCode: "FORBIDDEN",
      message: "Access to the requested tenant is not allowed",
    });
  }

  //   // Optionally attach token info to request
  //   (req as any).partnerToken = token;

  next();
}
