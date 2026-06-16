import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.middleware";
import { asyncHandler } from "../../shared/middleware/async-handler";
import {
  uploadDocument,
  uploadUrl,
  listDocuments,
  getStatus,
  removeDocument,
  getDocument,
  listChunks,
  uploadMiddleware,
} from "./document.controller";

const router = Router();

router.use(authenticate);

router.post("/upload", uploadMiddleware, asyncHandler(uploadDocument));
router.post("/upload-url", asyncHandler(uploadUrl));
router.get("/", asyncHandler(listDocuments));
router.get("/:id", asyncHandler(getDocument));
router.get("/:id/status", asyncHandler(getStatus));
router.get("/:id/chunks", asyncHandler(listChunks));
router.delete("/:id", asyncHandler(removeDocument));

export { router as documentRouter };
