import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest } from "../types";
import logger from "../lib/logger";

interface JWTPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) throw new Error("NEXTAUTH_SECRET not configured");

    const payload = jwt.verify(token, secret) as JWTPayload;
    req.userId = payload.sub;
    req.userEmail = payload.email;
    next();
  } catch (error) {
    logger.warn("Auth failed", { error: (error as Error).message });
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
