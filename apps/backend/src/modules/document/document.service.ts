import { prisma } from "../../infrastructure/database/prisma";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
  publicIdFromUrl,
} from "../../infrastructure/storage/cloudinary";
import { logger } from "../../infrastructure/logger";
import { NotFoundError } from "../../shared/errors/app-error";

/**
 * Service layer for document CRUD operations.
 * Background ingestion lives in ./document.processor.
 */

export async function uploadDocumentFile(
  buffer: Buffer,
  filename: string,
): Promise<{ url: string; publicId: string }> {
  return uploadToCloudinary(buffer, filename);
}

export async function getUserDocuments(userId: string) {
  return prisma.document.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      fileUrl: true,
      sourceUrl: true,
      type: true,
      status: true,
      pageCount: true,
      createdAt: true,
      _count: { select: { chunks: true } },
    },
  });
}

export async function getDocumentStatus(documentId: string, userId: string) {
  const doc = await prisma.document.findFirst({
    where: { id: documentId, userId },
    select: {
      id: true,
      name: true,
      status: true,
      type: true,
      pageCount: true,
      createdAt: true,
    },
  });
  if (!doc) throw new NotFoundError("Document");
  return doc;
}

export async function deleteDocument(
  documentId: string,
  userId: string,
): Promise<void> {
  const doc = await prisma.document.findFirst({
    where: { id: documentId, userId },
    select: { id: true, fileUrl: true },
  });
  if (!doc) throw new NotFoundError("Document");

  // Remove DB row first (chunks cascade). The Cloudinary asset is best-effort:
  // a failed cleanup shouldn't block the user-facing delete.
  await prisma.document.delete({ where: { id: documentId } });

  if (doc.fileUrl) {
    const publicId = publicIdFromUrl(doc.fileUrl);
    if (publicId) {
      try {
        await deleteFromCloudinary(publicId);
      } catch (error) {
        logger.warn("Failed to delete Cloudinary asset", {
          documentId,
          publicId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}

/**
 * Full document detail (including fileUrl/sourceUrl) for preview.
 */
export async function getDocumentById(documentId: string, userId: string) {
  const doc = await prisma.document.findFirst({
    where: { id: documentId, userId },
    select: {
      id: true,
      name: true,
      fileUrl: true,
      sourceUrl: true,
      type: true,
      status: true,
      pageCount: true,
      createdAt: true,
      _count: { select: { chunks: true } },
    },
  });
  if (!doc) throw new NotFoundError("Document");
  return doc;
}

/**
 * Paginated chunks for a document, ordered by chunk index.
 * Used by the preview UI to inspect what was actually embedded.
 */
export async function getDocumentChunks(
  documentId: string,
  userId: string,
  options: { page: number; limit: number },
) {
  // Ownership check — fail before counting/listing
  const doc = await prisma.document.findFirst({
    where: { id: documentId, userId },
    select: { id: true },
  });
  if (!doc) throw new NotFoundError("Document");

  const { page, limit } = options;
  const skip = (page - 1) * limit;

  const [chunks, total] = await Promise.all([
    prisma.documentChunk.findMany({
      where: { documentId },
      orderBy: { chunkIndex: "asc" },
      skip,
      take: limit,
      select: {
        id: true,
        chunkIndex: true,
        pageNumber: true,
        content: true,
        tokenCount: true,
      },
    }),
    prisma.documentChunk.count({ where: { documentId } }),
  ]);

  return {
    chunks,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + chunks.length < total,
    },
  };
}
