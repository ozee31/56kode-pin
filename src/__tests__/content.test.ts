import { describe, it, expect } from "vitest";
import { extractArticle } from "../content/extract";

describe("extractArticle", () => {
  it("should return null for a page with an empty body", () => {
    document.documentElement.innerHTML = `
      <html>
      <head><title>Empty</title></head>
      <body></body>
      </html>
    `;
    const result = extractArticle();
    expect(result).toBeNull();
  });

  it("should extract article data from a well-structured page", () => {
    const longContent =
      "This is a detailed test paragraph with enough content to pass the threshold. ".repeat(
        20,
      );
    document.documentElement.innerHTML = `
      <html>
      <head><title>Test Article Title</title></head>
      <body>
        <article>
          <h1>Test Article Title</h1>
          <p>${longContent}</p>
        </article>
      </body>
      </html>
    `;

    const result = extractArticle();
    expect(result).not.toBeNull();
    expect(result!.title).toContain("Test Article");
    expect(result!.content).toContain("detailed test paragraph");
    expect(result!.url).toBeDefined();
  });

  it("should return null author when byline is not detected", () => {
    const longContent =
      "This is a detailed test paragraph with enough content. ".repeat(20);
    document.documentElement.innerHTML = `
      <html>
      <head><title>No Author Article</title></head>
      <body>
        <article>
          <h1>No Author Article</h1>
          <p>${longContent}</p>
        </article>
      </body>
      </html>
    `;

    const result = extractArticle();
    if (result) {
      expect(result.author).toBeNull();
    }
  });
});
