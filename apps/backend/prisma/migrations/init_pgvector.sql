-- Enable pgvector extension (run this in Supabase SQL editor first)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create HNSW index for fast similarity search
-- Run after prisma db push
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
ON document_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
