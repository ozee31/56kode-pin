import { Readability } from "@mozilla/readability";
import type { ArticleData } from "../types/messages";

export function extractArticle(): ArticleData | null {
  const documentClone = document.cloneNode(true) as Document;
  const article = new Readability(documentClone).parse();

  if (!article) {
    return null;
  }

  return {
    url: document.URL,
    title: article.title ?? "",
    author: article.byline || null,
    content: article.textContent ?? "",
  };
}

// When injected via chrome.scripting.executeScript, the return value of the
// last evaluated expression becomes the result. CRXJS bundles this as an IIFE,
// so the return value of extractArticle() is what executeScript receives.
extractArticle();
