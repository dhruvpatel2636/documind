import { Response, NextFunction } from "express";
import { z } from "zod";
import multer from "multer";
import { AuthenticatedRequest } from "../types";
import {
  processDocument,
  uploadDocumentFile,
  getUserDocuments,
  deleteDocument,
} from "../services/documentService";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import logger from "../lib/logger";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "text/plain"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and text files are allowed"));
    }
  },
});

export const uploadMiddleware = upload.single("file");

const urlSchema = z.object({
  url: z.string().url(),
  name: z.string().min(1).max(255).optional(),
});

export async function uploadDocument(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.userId!;
    const file = req.file;

    if (!file) throw new AppError(400, "No file provided");

    const isPdf = file.mimetype === "application/pdf";
    const type = isPdf ? "PDF" : "TEXT";

    // Upload to Cloudinary
    const { url: fileUrl } = await uploadDocumentFile(
      file.buffer,
      file.originalname,
    );

    // Create document record
    const document = await prisma.document.create({
      data: {
        userId,
        name: file.originalname,
        fileUrl,
        type,
        status: "PROCESSING",
      },
    });

    // Process async (don't await - return immediately)
    processDocument({
      documentId: document.id,
      userId,
      fileBuffer: file.buffer,
      type,
    }).catch((err) =>
      logger.error("Async document processing failed", {
        err,
        documentId: document.id,
      }),
    );

    res.status(201).json({
      message: "Document uploaded and processing started",
      document: {
        id: document.id,
        name: document.name,
        status: document.status,
        type: document.type,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function uploadUrl(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.userId!;
    const { url, name } = urlSchema.parse(req.body);

    const document = await prisma.document.create({
      data: {
        userId,
        name: name || new URL(url).hostname,
        sourceUrl: url,
        type: "URL",
        status: "PROCESSING",
      },
    });

    processDocument({
      documentId: document.id,
      userId,
      sourceUrl: url,
      type: "URL",
    }).catch((err) =>
      logger.error("Async URL processing failed", {
        err,
        documentId: document.id,
      }),
    );

    res.status(201).json({
      message: "URL submitted and processing started",
      document: {
        id: document.id,
        name: document.name,
        status: document.status,
        type: document.type,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function listDocuments(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const documents = await getUserDocuments(req.userId!);
    res.json({ documents });
  } catch (error) {
    next(error);
  }
}

export async function getDocumentStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const doc = await prisma.document.findFirst({
      where: { id, userId: req.userId! },
      select: {
        id: true,
        name: true,
        status: true,
        type: true,
        pageCount: true,
        createdAt: true,
      },
    });
    if (!doc) throw new AppError(404, "Document not found");
    res.json({ document: doc });
  } catch (error) {
    next(error);
  }
}

export async function removeDocument(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await deleteDocument(req.params.id as string, req.userId!);
    res.json({ message: "Document deleted successfully" });
  } catch (error) {
    next(error);
  }
}
