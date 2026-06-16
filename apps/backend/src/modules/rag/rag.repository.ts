import { prisma } from "../../infrastructure/database/prisma";

const TOP_K = 5;
const SIMILARITY_THRESHOLD = 0.3;

export interface ChunkWithScore {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  pageNumber: number | null;
  similarity: number;
  document: {
    id: string;
    name: string;
    type: string;
  };
}

interface RawChunkResult {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  pageNumber: number | null;
  similarity: number;
  docId: string;
  docName: string;
  docType: string;
}

function mapRaw(r: RawChunkResult): ChunkWithScore {
  return {
    id: r.id,
    documentId: r.documentId,
    content: r.content,
    chunkIndex: r.chunkIndex,
    pageNumber: r.pageNumber,
    similarity: Number(r.similarity),
    document: { id: r.docId, name: r.docName, type: r.docType },
  };
}

/**
 * pgvector cosine-similarity nearest-neighbor search over the user's chunks.
 * Optionally narrow to a subset of documents.
 */
export async function searchChunks(
  embedding: number[],
  userId: string,
  documentIds?: string[],
): Promise<ChunkWithScore[]> {
  const vectorLiteral = `[${embedding.join(",")}]`;

  if (documentIds && documentIds.length > 0) {
    const rows = (await prisma.$queryRawUnsafe(
      `
      SELECT
        dc.id,
        dc."documentId",
        dc.content,
        dc."chunkIndex",
        dc."pageNumber",
        1 - (dc.embedding <=> $1::vector) AS similarity,
        d.id AS "docId",
        d.name AS "docName",
        d.type AS "docType"
      FROM document_chunks dc
      JOIN documents d ON d.id = dc."documentId"
      WHERE d."userId" = $2
        AND d.status = 'READY'
        AND d.id = ANY($4::text[])
        AND 1 - (dc.embedding <=> $1::vector) > ${SIMILARITY_THRESHOLD}
      ORDER BY dc.embedding <=> $1::vector
      LIMIT $3
      `,
      vectorLiteral,
      userId,
      TOP_K,
      documentIds,
    )) as RawChunkResult[];
    return rows.map(mapRaw);
  }

  const rows = (await prisma.$queryRawUnsafe(
    `
    SELECT
      dc.id,
      dc."documentId",
      dc.content,
      dc."chunkIndex",
      dc."pageNumber",
      1 - (dc.embedding <=> $1::vector) AS similarity,
      d.id AS "docId",
      d.name AS "docName",
      d.type AS "docType"
    FROM document_chunks dc
    JOIN documents d ON d.id = dc."documentId"
    WHERE d."userId" = $2
      AND d.status = 'READY'
      AND 1 - (dc.embedding <=> $1::vector) > ${SIMILARITY_THRESHOLD}
    ORDER BY dc.embedding <=> $1::vector
    LIMIT $3
    `,
    vectorLiteral,
    userId,
    TOP_K,
  )) as RawChunkResult[];

  return rows.map(mapRaw);
}

/**
 * Insert a document chunk with its embedding. Raw SQL because Prisma doesn't
 * yet support pgvector column types natively.
 */
export async function insertChunk(args: {
  documentId: string;
  content: string;
  embedding: number[];
  chunkIndex: number;
  pageNumber: number | null;
  tokenCount: number;
}): Promise<void> {
  const vectorLiteral = `[${args.embedding.join(",")}]`;
  await prisma.$executeRaw`
    INSERT INTO document_chunks (
      id, "documentId", content, embedding, "chunkIndex",
      "pageNumber", "tokenCount", "createdAt"
    )
    VALUES (
      gen_random_uuid(),
      ${args.documentId}::text,
      ${args.content},
      ${vectorLiteral}::vector,
      ${args.chunkIndex},
      ${args.pageNumber},
      ${args.tokenCount},
      NOW()
    )
  `;
}
