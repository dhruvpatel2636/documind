/**
 * Text chunking utility for the RAG ingestion pipeline.
 * Splits text into overlapping chunks respecting an approximate token budget.
 *
 * Pure function — no external dependencies, easy to unit-test.
 */

const CHUNK_SIZE = 800; // target tokens per chunk
const CHUNK_OVERLAP = 100; // overlap tokens between chunks
const AVG_CHARS_PER_TOKEN = 4; // rough estimate

export interface TextChunk {
  content: string;
  chunkIndex: number;
  pageNumber?: number;
  tokenCount: number;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / AVG_CHARS_PER_TOKEN);
}

function splitIntoSentences(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/(?<=[.!?])\s+(?=[A-Z])|(?<=\n)\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function chunkText(text: string, pageNumber?: number): TextChunk[] {
  const sentences = splitIntoSentences(text);
  const chunks: TextChunk[] = [];
  let currentChunk: string[] = [];
  let currentTokens = 0;
  let chunkIndex = 0;

  const pushChunk = (parts: string[]): void => {
    const content = parts.join(" ");
    chunks.push({
      content,
      chunkIndex: chunkIndex++,
      pageNumber,
      tokenCount: estimateTokens(content),
    });
  };

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);

    // Single sentence exceeds chunk size — hard-split by words
    if (sentenceTokens > CHUNK_SIZE) {
      if (currentChunk.length > 0) {
        pushChunk(currentChunk);
        currentChunk = [];
        currentTokens = 0;
      }
      const words = sentence.split(" ");
      let wordChunk: string[] = [];
      let wordTokens = 0;
      for (const word of words) {
        const wt = estimateTokens(word);
        if (wordTokens + wt > CHUNK_SIZE && wordChunk.length > 0) {
          pushChunk(wordChunk);
          // Keep overlap
          const overlapWords = wordChunk.slice(
            -Math.floor(CHUNK_OVERLAP / AVG_CHARS_PER_TOKEN),
          );
          wordChunk = overlapWords;
          wordTokens = estimateTokens(wordChunk.join(" "));
        }
        wordChunk.push(word);
        wordTokens += wt;
      }
      if (wordChunk.length > 0) {
        currentChunk = wordChunk;
        currentTokens = wordTokens;
      }
      continue;
    }

    if (
      currentTokens + sentenceTokens > CHUNK_SIZE &&
      currentChunk.length > 0
    ) {
      pushChunk(currentChunk);

      // Overlap: keep last ~CHUNK_OVERLAP tokens worth of sentences
      const overlapSentences: string[] = [];
      let overlapTokens = 0;
      for (let i = currentChunk.length - 1; i >= 0; i--) {
        const s = currentChunk[i];
        if (s === undefined) break;
        const t = estimateTokens(s);
        if (overlapTokens + t > CHUNK_OVERLAP) break;
        overlapSentences.unshift(s);
        overlapTokens += t;
      }
      currentChunk = overlapSentences;
      currentTokens = overlapTokens;
    }

    currentChunk.push(sentence);
    currentTokens += sentenceTokens;
  }

  if (currentChunk.length > 0) {
    pushChunk(currentChunk);
  }

  return chunks.filter((c) => c.content.trim().length > 20);
}

export function chunkTextByPages(
  pages: { text: string; pageNumber: number }[],
): TextChunk[] {
  const allChunks: TextChunk[] = [];
  let globalIndex = 0;
  for (const page of pages) {
    const pageChunks = chunkText(page.text, page.pageNumber);
    for (const chunk of pageChunks) {
      allChunks.push({ ...chunk, chunkIndex: globalIndex++ });
    }
  }
  return allChunks;
}
