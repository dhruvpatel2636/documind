import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  uploadDocument,
  uploadUrl,
  listDocuments,
  getDocumentStatus,
  removeDocument,
  uploadMiddleware,
} from "../controllers/documentController";

const router = Router();

router.use(authenticate);

router.post("/upload", uploadMiddleware, uploadDocument);
router.post("/upload-url", uploadUrl);
router.get("/", listDocuments);
router.get("/:id/status", getDocumentStatus);
router.delete("/:id", removeDocument);

export default router;
