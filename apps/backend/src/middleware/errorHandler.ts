import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import logger from "../lib/logger";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true,
  ) {
    super(message);
    this.name = "AppError";
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation error",
      details: err.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
    return;
  }

  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error("Non-operational error", { error: err, path: req.path });
    }
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  logger.error("Unhandled error", {
    error: err,
    path: req.path,
    method: req.method,
  });
  res.status(500).json({ error: "Internal server error" });
}

export function notFound(req: Request, res: Response): void {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
}
