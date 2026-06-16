import { Request, Response, NextFunction, RequestHandler } from "express";

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

/**
 * Wraps an async route handler so that any rejected promise is forwarded
 * to Express's error middleware. Removes try/catch boilerplate from every
 * controller while preserving full type inference.
 *
 *   router.get("/foo", asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(fn: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
