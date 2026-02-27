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
