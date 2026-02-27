---
name: save-workflow
description: Fetch the n8n workflow, sanitize sensitive data, and save to workflow/
---

# Save n8n Workflow

Fetch the n8n "56kode Pin - AI Radar" workflow, sanitize it, and overwrite the local backup.

## Steps

### 1. Find the workflow

Use `mcp__n8n-mcp__n8n_list_workflows` to list all workflows. Find the one named **"56kode Pin - AI Radar"** and note its ID.

If not found, stop and report the error.

### 2. Fetch the full workflow

Use `mcp__n8n-mcp__n8n_get_workflow` with the found ID and `mode: "full"`.

### 3. Sanitize the JSON

Build a clean JSON object keeping **only** these top-level keys from the response `data`:

- `name`
- `nodes`
- `connections`
- `settings`

**Exclude everything else** (`id`, `active`, `description`, `isArchived`, `createdAt`, `updatedAt`, `shared`, `activeVersion`, `versionId`, `activeVersionId`, `versionCounter`, `triggerCount`, `pinData`, `staticData`, `meta`, `tags`).

For each node in `nodes`, apply these sanitization rules:

| Field | Rule |
|---|---|
| `webhookId` | **Remove entirely** |
| `parameters.path` (on webhook nodes only) | Replace value with `"your-webhook-path"` |
| `credentials.*.id` | Replace value with `"***"` |

Keep all other node fields as-is (`parameters`, `id`, `name`, `type`, `typeVersion`, `position`, `onError`, `credentials` with masked IDs).

### 4. Write the file

Overwrite `workflow/56kode-pin-ai-radar.json` with the sanitized JSON (pretty-printed, 2-space indent).

### 5. Verify

Use Grep on the saved file to check that **none** of these patterns appear:

- Original credential IDs (any alphanumeric string that was in a `credentials.*.id` field before masking)
- Webhook UUIDs (any UUID that was in a `webhookId` field)
- Email addresses (pattern: `@.*\.`)
- The workflow ID itself

Report the result: file path written and whether verification passed.
