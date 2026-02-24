# Task 3 — Content Script (Readability Extraction)

## Objective

Implement the content script that extracts article content from the current page using `@mozilla/readability` and returns an `ArticleData` object.

## Key Design Decisions

- **Clone the DOM before parsing:** Readability mutates the DOM it processes. Using `document.cloneNode(true)` prevents any visible changes to the page the user is viewing.
- **Use `textContent` not `content`:** The webhook expects plain text, not HTML. `article.textContent` returns plain text, `article.content` returns HTML.
- **Export the function for testing:** The `extractArticle()` function is exported so it can be unit tested. It is also called as the last expression in the file so that `chrome.scripting.executeScript` receives its return value.
- **Author field:** Readability exposes the author via `article.byline`. If not detected, send `null`.

## Files to Create/Modify

### `src/content/index.ts`

Replace the empty shell with:

```ts
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
    title: article.title,
    author: article.byline || null,
    content: article.textContent,
  };
}

// When injected via chrome.scripting.executeScript, the return value of the
// last evaluated expression becomes the result. CRXJS bundles this as an IIFE,
// so the return value of extractArticle() is what executeScript receives.
extractArticle();
```

### `src/__tests__/content.test.ts`

Test the extraction function in a jsdom environment:

```ts
import { describe, it, expect } from "vitest";
import { extractArticle } from "../content/index";

describe("extractArticle", () => {
  it("should return null for a page with insufficient content", () => {
    document.documentElement.innerHTML =
      "<html><body><p>Short</p></body></html>";
    const result = extractArticle();
    expect(result).toBeNull();
  });

  it("should extract article data from a well-structured page", () => {
    // Readability requires enough content to pass its heuristic threshold
    const longContent = "This is a detailed test paragraph with enough content to pass the threshold. ".repeat(20);
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
    const longContent = "This is a detailed test paragraph with enough content. ".repeat(20);
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
```

**Note on testing:** Readability's heuristics require a minimum amount of content to consider a page as an "article". The test generates enough text to pass this threshold. If tests are flaky, increase the content length or lower the `charThreshold` option in Readability's constructor.

## Steps

1. Replace `src/content/index.ts` with the extraction logic
2. Create `src/__tests__/content.test.ts`
3. Run `pnpm run test` to verify content extraction tests pass
4. Run `pnpm run build` to verify the content script bundles correctly (Readability.js should be included in the bundle)

## Acceptance Criteria

- [ ] `extractArticle()` returns `null` for non-article pages
- [ ] `extractArticle()` returns correct `{ url, title, author, content }` for article pages
- [ ] `content` field contains plain text (no HTML tags)
- [ ] `author` is `null` when not detected
- [ ] All content script tests pass
- [ ] `pnpm run build` succeeds
