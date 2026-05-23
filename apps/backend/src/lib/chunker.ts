/**
 * Text chunking utility for RAG pipeline.
 * Splits text into overlapping chunks respecting token limits.
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

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);

    // If single sentence exceeds chunk size, split by characters
    if (sentenceTokens > CHUNK_SIZE) {
      if (currentChunk.length > 0) {
        const content = currentChunk.join(" ");
        chunks.push({
          content,
          chunkIndex: chunkIndex++,
          pageNumber,
          tokenCount: estimateTokens(content),
        });
        currentChunk = [];
        currentTokens = 0;
      }
      // Hard split long sentence
      const words = sentence.split(" ");
      let wordChunk: string[] = [];
      let wordTokens = 0;
      for (const word of words) {
        const wt = estimateTokens(word);
        if (wordTokens + wt > CHUNK_SIZE && wordChunk.length > 0) {
          const content = wordChunk.join(" ");
          chunks.push({
            content,
            chunkIndex: chunkIndex++,
            pageNumber,
            tokenCount: estimateTokens(content),
          });
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
      const content = currentChunk.join(" ");
      chunks.push({
        content,
        chunkIndex: chunkIndex++,
        pageNumber,
        tokenCount: estimateTokens(content),
      });

      // Overlap: keep last N tokens worth of sentences
      const overlapSentences: string[] = [];
      let overlapTokens = 0;
      for (let i = currentChunk.length - 1; i >= 0; i--) {
        const t = estimateTokens(currentChunk[i]);
        if (overlapTokens + t > CHUNK_OVERLAP) break;
        overlapSentences.unshift(currentChunk[i]);
        overlapTokens += t;
      }
      currentChunk = overlapSentences;
      currentTokens = overlapTokens;
    }

    currentChunk.push(sentence);
    currentTokens += sentenceTokens;
  }

  if (currentChunk.length > 0) {
    const content = currentChunk.join(" ");
    chunks.push({
      content,
      chunkIndex: chunkIndex++,
      pageNumber,
      tokenCount: estimateTokens(content),
    });
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
