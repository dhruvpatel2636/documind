import { Request, Response } from "express";
import multer from "multer";
import { prisma } from "../../infrastructure/database/prisma";
import { logger } from "../../infrastructure/logger";
import { BadRequestError } from "../../shared/errors/app-error";
import {
  uploadDocumentFile,
  getUserDocuments,
  getDocumentStatus,
  deleteDocument,
  getDocumentById,
  getDocumentChunks,
} from "./document.service";
import { processDocument } from "./document.processor";
import { uploadUrlSchema, chunksQuerySchema } from "./document.schema";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "text/plain"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only PDF and text files are allowed"));
  },
});

export const uploadMiddleware = upload.single("file");

export async function uploadDocument(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.userId!;
  const file = req.file;
  if (!file) throw new BadRequestError("No file provided");

  const isPdf = file.mimetype === "application/pdf";
  const type = isPdf ? "PDF" : "TEXT";

  const { url: fileUrl } = await uploadDocumentFile(
    file.buffer,
    file.originalname,
  );

  const document = await prisma.document.create({
    data: {
      userId,
      name: file.originalname,
      fileUrl,
      type,
      status: "PROCESSING",
    },
  });

  // Fire-and-forget: process in the background
  void processDocument({
    documentId: document.id,
    userId,
    fileBuffer: file.buffer,
    type,
  }).catch((err) =>
    logger.error("Async document processing failed", {
      err: err instanceof Error ? err.message : String(err),
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
      fileUrl: document.fileUrl,
      sourceUrl: document.sourceUrl,
      pageCount: document.pageCount,
      createdAt: document.createdAt,
    },
  });
}

export async function uploadUrl(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const { url, name } = uploadUrlSchema.parse(req.body);

  const document = await prisma.document.create({
    data: {
      userId,
      name: name || new URL(url).hostname,
      sourceUrl: url,
      type: "URL",
      status: "PROCESSING",
    },
  });

  void processDocument({
    documentId: document.id,
    userId,
    sourceUrl: url,
    type: "URL",
  }).catch((err) =>
    logger.error("Async URL processing failed", {
      err: err instanceof Error ? err.message : String(err),
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
      fileUrl: document.fileUrl,
      sourceUrl: document.sourceUrl,
      pageCount: document.pageCount,
      createdAt: document.createdAt,
    },
  });
}

export async function listDocuments(
  req: Request,
  res: Response,
): Promise<void> {
  const documents = await getUserDocuments(req.userId!);
  res.json({ documents });
}

export async function getStatus(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const document = await getDocumentStatus(id, req.userId!);
  res.json({ document });
}

export async function removeDocument(
  req: Request,
  res: Response,
): Promise<void> {
  await deleteDocument(req.params.id as string, req.userId!);
  res.json({ message: "Document deleted successfully" });
}

export async function getDocument(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const document = await getDocumentById(id, req.userId!);
  res.json({ document });
}

export async function listChunks(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const query = chunksQuerySchema.parse(req.query);
  const result = await getDocumentChunks(id, req.userId!, query);
  res.json(result);
}
