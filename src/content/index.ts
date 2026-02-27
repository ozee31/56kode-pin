import { extractArticle } from "./extract";

// Vite wraps the bundle in an IIFE: (function(){ ... })()
// The IIFE does not `return` the last expression, so executeScript({ files })
// always yields undefined. We store the result on globalThis instead, and
// the service worker retrieves it with a second executeScript({ func }) call.
(globalThis as Record<string, unknown>).__pinExtractedArticle =
  extractArticle();
