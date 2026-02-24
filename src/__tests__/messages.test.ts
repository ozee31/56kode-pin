import { describe, it, expect } from "vitest";
import type { PinArticleResponse, ArticleData } from "../types/messages";

describe("Message types", () => {
  it("should create a valid ArticleData object", () => {
    const article: ArticleData = {
      url: "https://example.com/article",
      title: "Test Article",
      author: "John Doe",
      content: "Article content here",
    };
    expect(article.url).toBe("https://example.com/article");
    expect(article.author).toBe("John Doe");
  });

  it("should allow null author in ArticleData", () => {
    const article: ArticleData = {
      url: "https://example.com",
      title: "No Author",
      author: null,
      content: "Content",
    };
    expect(article.author).toBeNull();
  });

  it("should discriminate success and error responses", () => {
    const success: PinArticleResponse = {
      success: true,
      data: { status: "ok", file: "src/content/ai-radar/test.md" },
    };
    const error: PinArticleResponse = {
      success: false,
      error: "Unauthorized",
    };

    if (success.success) {
      expect(success.data.file).toBe("src/content/ai-radar/test.md");
    }
    if (!error.success) {
      expect(error.error).toBe("Unauthorized");
    }
  });
});
