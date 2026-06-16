import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { logger } from "../../infrastructure/logger";

interface JWTPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Verifies the Bearer JWT and populates req.userId / req.userEmail.
 * Rejects with 401 if missing or invalid.
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, env.NEXTAUTH_SECRET) as JWTPayload;
    req.userId = payload.sub;
    req.userEmail = payload.email;
    next();
  } catch (error) {
    logger.warn("Auth failed", { error: (error as Error).message });
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
