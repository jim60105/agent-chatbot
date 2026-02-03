// src/utils/text-search.ts

import { createLogger } from "@utils/logger.ts";

const logger = createLogger("TextSearch");

export interface SearchResult {
  lineNumber: number;
  content: string;
  matchedText: string;
}

export interface SearchOptions {
  /** Maximum number of results to return */
  maxResults?: number;
  /** Maximum total characters in results */
  maxChars?: number;
  /** Case-insensitive search (default: true) */
  caseInsensitive?: boolean;
}

/**
 * Search for text in file content using simple string matching
 * Falls back from ripgrep to built-in search
 */
export async function searchInFile(
  filePath: string,
  query: string,
  options: SearchOptions = {},
): Promise<SearchResult[]> {
  const {
    maxResults = 10,
    maxChars = 2000,
    caseInsensitive = true,
  } = options;

  // Try ripgrep first (if available)
  const rgResult = await tryRipgrepSearch(filePath, query, maxResults, caseInsensitive);
  if (rgResult !== null) {
    return limitResults(rgResult, maxResults, maxChars);
  }

  // Fall back to built-in search
  logger.debug("Using built-in search (ripgrep not available)");
  return builtInSearch(filePath, query, maxResults, maxChars, caseInsensitive);
}

/**
 * Try to use ripgrep for search
 */
async function tryRipgrepSearch(
  filePath: string,
  query: string,
  maxResults: number,
  caseInsensitive: boolean,
): Promise<SearchResult[] | null> {
  try {
    const args = [
      "--json",
      "--max-count",
      String(maxResults),
      caseInsensitive ? "--ignore-case" : "--case-sensitive",
      query,
      filePath,
    ];

    const command = new Deno.Command("rg", {
      args,
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout } = await command.output();

    // ripgrep returns 1 when no matches found (not an error)
    if (code !== 0 && code !== 1) {
      return null;
    }

    const output = new TextDecoder().decode(stdout);
    const results: SearchResult[] = [];

    for (const line of output.split("\n")) {
      if (!line.trim()) continue;

      try {
        const parsed = JSON.parse(line);
        if (parsed.type === "match") {
          results.push({
            lineNumber: parsed.data.line_number,
            content: parsed.data.lines.text.trim(),
            matchedText: parsed.data.submatches?.[0]?.match?.text ?? query,
          });
        }
      } catch {
        // Skip invalid JSON lines
      }
    }

    return results;
  } catch (error) {
    // ripgrep not found or other error
    logger.debug("ripgrep search failed", { error: String(error) });
    return null;
  }
}

/**
 * Built-in search implementation
 */
async function builtInSearch(
  filePath: string,
  query: string,
  maxResults: number,
  maxChars: number,
  caseInsensitive: boolean,
): Promise<SearchResult[]> {
  try {
    const content = await Deno.readTextFile(filePath);
    const lines = content.split("\n");
    const results: SearchResult[] = [];
    let totalChars = 0;

    const searchQuery = caseInsensitive ? query.toLowerCase() : query;

    for (let i = 0; i < lines.length && results.length < maxResults; i++) {
      const line = lines[i];
      const compareLine = caseInsensitive ? line.toLowerCase() : line;

      if (compareLine.includes(searchQuery)) {
        // Check character limit
        if (totalChars + line.length > maxChars) {
          break;
        }

        results.push({
          lineNumber: i + 1,
          content: line.trim(),
          matchedText: query,
        });
        totalChars += line.length;
      }
    }

    return results;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return [];
    }
    throw error;
  }
}

/**
 * Limit results by count and total characters
 */
function limitResults(
  results: SearchResult[],
  maxResults: number,
  maxChars: number,
): SearchResult[] {
  const limited: SearchResult[] = [];
  let totalChars = 0;

  for (const result of results) {
    if (limited.length >= maxResults) break;
    if (totalChars + result.content.length > maxChars) break;

    limited.push(result);
    totalChars += result.content.length;
  }

  return limited;
}

/**
 * Search multiple keywords (OR logic)
 */
export async function searchMultipleKeywords(
  filePath: string,
  keywords: string[],
  options: SearchOptions = {},
): Promise<SearchResult[]> {
  const allResults: SearchResult[] = [];
  const seenLines = new Set<number>();

  for (const keyword of keywords) {
    const results = await searchInFile(filePath, keyword, options);
    for (const result of results) {
      if (!seenLines.has(result.lineNumber)) {
        seenLines.add(result.lineNumber);
        allResults.push(result);
      }
    }
  }

  // Sort by line number
  allResults.sort((a, b) => a.lineNumber - b.lineNumber);

  return limitResults(
    allResults,
    options.maxResults ?? 10,
    options.maxChars ?? 2000,
  );
}
