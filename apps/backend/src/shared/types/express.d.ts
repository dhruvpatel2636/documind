/**
 * Global type augmentation for Express Request.
 *
 * Lets every route handler access `req.userId` / `req.userEmail` once the
 * `authenticate` middleware has populated them — no more `AuthenticatedRequest`
 * casting in each controller.
 *
 * This is an ambient declaration file (no imports/exports), so it's picked
 * up automatically by TypeScript via the `include` glob in tsconfig.json.
 */
declare namespace Express {
  interface Request {
    userId?: string;
    userEmail?: string;
  }
}
