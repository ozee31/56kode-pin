# Task 5 — Popup UI (Preact)

## Objective

Build the popup interface with settings management (webhook URL, secret token), a Pin action button, and visual feedback states (idle, loading, success, error).

## Component Architecture

```
App
├── Settings        (collapsible form: webhook URL + secret token)
├── PinButton       (action button with 4 visual states)
└── Status message  (success/error text, conditional)
```

## Files to Create/Modify

### `src/popup/App.tsx`

Main component. Manages all state:

```tsx
import { useState, useEffect } from "preact/hooks";
import type { ExtensionSettings, PinArticleResponse } from "../types/messages";
import { Settings } from "./Settings";
import { PinButton } from "./PinButton";
import styles from "./App.module.css";

type Status = "idle" | "loading" | "success" | "error";

export function App() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState<ExtensionSettings>({
    webhookUrl: "",
    secretToken: "",
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Load settings on mount
  useEffect(() => {
    chrome.storage.local
      .get(["webhookUrl", "secretToken"])
      .then((result) => {
        const loaded = {
          webhookUrl: result.webhookUrl || "",
          secretToken: result.secretToken || "",
        };
        setSettings(loaded);
        // Auto-open settings if webhook URL is not configured
        if (!loaded.webhookUrl) {
          setSettingsOpen(true);
        }
      });
  }, []);

  const handlePin = async () => {
    setStatus("loading");
    setMessage("");

    try {
      const response: PinArticleResponse =
        await chrome.runtime.sendMessage({ type: "PIN_ARTICLE" });

      if (response.success) {
        setStatus("success");
        setMessage(`Pinned! ${response.data.file}`);
        // Reset to idle after 3 seconds
        setTimeout(() => {
          setStatus("idle");
          setMessage("");
        }, 3000);
      } else {
        setStatus("error");
        setMessage(response.error);
        // If settings-related error, auto-open settings
        if (response.error.includes("not configured")) {
          setSettingsOpen(true);
        }
      }
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleSaveSettings = async (newSettings: ExtensionSettings) => {
    await chrome.storage.local.set(newSettings);
    setSettings(newSettings);
    setSettingsOpen(false);
  };

  return (
    <div class={styles.container}>
      <header class={styles.header}>
        <h1 class={styles.title}>56kode Pin</h1>
        <button
          class={styles.settingsToggle}
          onClick={() => setSettingsOpen(!settingsOpen)}
          aria-label="Toggle settings"
        >
          {settingsOpen ? "\u2715" : "\u2699"}
        </button>
      </header>

      {settingsOpen && (
        <Settings settings={settings} onSave={handleSaveSettings} />
      )}

      <PinButton status={status} onClick={handlePin} />

      {message && (
        <p class={`${styles.message} ${styles[status]}`}>
          {message}
        </p>
      )}
    </div>
  );
}
```

### `src/popup/Settings.tsx`

Settings form component:

```tsx
import { useState } from "preact/hooks";
import type { ExtensionSettings } from "../types/messages";
import styles from "./App.module.css";

interface SettingsProps {
  settings: ExtensionSettings;
  onSave: (settings: ExtensionSettings) => void;
}

export function Settings({ settings, onSave }: SettingsProps) {
  const [webhookUrl, setWebhookUrl] = useState(settings.webhookUrl);
  const [secretToken, setSecretToken] = useState(settings.secretToken);

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    onSave({ webhookUrl, secretToken });
  };

  return (
    <form class={styles.settings} onSubmit={handleSubmit}>
      <label class={styles.label}>
        Webhook URL
        <input
          type="url"
          class={styles.input}
          value={webhookUrl}
          onInput={(e) => setWebhookUrl((e.target as HTMLInputElement).value)}
          placeholder="https://n8n.example.com/webhook/..."
          required
        />
      </label>
      <label class={styles.label}>
        Secret Token
        <input
          type="password"
          class={styles.input}
          value={secretToken}
          onInput={(e) => setSecretToken((e.target as HTMLInputElement).value)}
          placeholder="Your secret token"
        />
      </label>
      <button type="submit" class={styles.saveButton}>
        Save
      </button>
    </form>
  );
}
```

### `src/popup/PinButton.tsx`

Pin button with visual states:

```tsx
import styles from "./App.module.css";

interface PinButtonProps {
  status: "idle" | "loading" | "success" | "error";
  onClick: () => void;
}

export function PinButton({ status, onClick }: PinButtonProps) {
  const isDisabled = status === "loading";

  const label = {
    idle: "Pin this article",
    loading: "Pinning...",
    success: "Pinned!",
    error: "Pin this article",
  }[status];

  return (
    <button
      class={`${styles.pinButton} ${styles[`pin_${status}`]}`}
      onClick={onClick}
      disabled={isDisabled}
    >
      {status === "loading" && <span class={styles.spinner} />}
      {label}
    </button>
  );
}
```

### `src/popup/App.module.css`

Popup styles. Key design:
- Fixed width: 320px
- Clean, minimal look with `system-ui` font
- Pin button: prominent, centered, with color states
- Spinner: CSS-only rotating border animation

```css
.container {
  width: 320px;
  padding: 16px;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 14px;
  color: #1a1a1a;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.settingsToggle {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
  color: #666;
  border-radius: 4px;
}

.settingsToggle:hover {
  background: #f0f0f0;
}

/* Settings form */
.settings {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
  padding: 12px;
  background: #f8f8f8;
  border-radius: 8px;
}

.label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #555;
}

.input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
}

.input:focus {
  outline: none;
  border-color: #4a90d9;
  box-shadow: 0 0 0 2px rgba(74, 144, 217, 0.2);
}

.saveButton {
  padding: 8px 16px;
  background: #4a90d9;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  align-self: flex-end;
}

.saveButton:hover {
  background: #3a7bc8;
}

/* Pin button */
.pinButton {
  width: 100%;
  padding: 12px;
  font-size: 15px;
  font-weight: 600;
  font-family: inherit;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background-color 0.2s;
}

.pin_idle {
  background: #4a90d9;
  color: white;
}

.pin_idle:hover {
  background: #3a7bc8;
}

.pin_loading {
  background: #4a90d9;
  color: white;
  opacity: 0.8;
  cursor: wait;
}

.pin_success {
  background: #34a853;
  color: white;
}

.pin_error {
  background: #4a90d9;
  color: white;
}

/* Spinner */
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Status message */
.message {
  margin: 8px 0 0;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  word-break: break-word;
}

.success {
  background: #e6f4ea;
  color: #1e7e34;
}

.error {
  background: #fce8e6;
  color: #c5221f;
}
```

### `src/__tests__/popup.test.tsx`

Component tests:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/preact";
import { Settings } from "../popup/Settings";
import { PinButton } from "../popup/PinButton";

describe("PinButton", () => {
  it("renders 'Pin this article' in idle state", () => {
    render(<PinButton status="idle" onClick={() => {}} />);
    expect(screen.getByText("Pin this article")).toBeDefined();
  });

  it("is disabled during loading", () => {
    render(<PinButton status="loading" onClick={() => {}} />);
    const button = screen.getByRole("button");
    expect(button).toHaveProperty("disabled", true);
  });

  it("shows 'Pinned!' on success", () => {
    render(<PinButton status="success" onClick={() => {}} />);
    expect(screen.getByText("Pinned!")).toBeDefined();
  });

  it("calls onClick when clicked in idle state", () => {
    const onClick = vi.fn();
    render(<PinButton status="idle" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not call onClick when disabled (loading)", () => {
    const onClick = vi.fn();
    render(<PinButton status="loading" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("Settings", () => {
  it("calls onSave with updated values on form submit", () => {
    const onSave = vi.fn();
    render(
      <Settings
        settings={{ webhookUrl: "", secretToken: "" }}
        onSave={onSave}
      />
    );

    const urlInput = screen.getByPlaceholderText(/webhook/i);
    const tokenInput = screen.getByPlaceholderText(/token/i);

    fireEvent.input(urlInput, {
      target: { value: "https://n8n.example.com/webhook/test" },
    });
    fireEvent.input(tokenInput, {
      target: { value: "my-secret" },
    });
    fireEvent.click(screen.getByText("Save"));

    expect(onSave).toHaveBeenCalledWith({
      webhookUrl: "https://n8n.example.com/webhook/test",
      secretToken: "my-secret",
    });
  });

  it("pre-fills inputs with existing settings", () => {
    render(
      <Settings
        settings={{
          webhookUrl: "https://existing.com/webhook",
          secretToken: "existing-token",
        }}
        onSave={() => {}}
      />
    );

    const urlInput = screen.getByPlaceholderText(/webhook/i) as HTMLInputElement;
    expect(urlInput.value).toBe("https://existing.com/webhook");
  });
});
```

## Steps

1. Create `src/popup/PinButton.tsx`
2. Create `src/popup/Settings.tsx`
3. Replace `src/popup/App.tsx` with the full component
4. Create `src/popup/App.module.css`
5. Create `src/__tests__/popup.test.tsx`
6. Run `pnpm run test` to verify component tests pass
7. Run `pnpm run build` and test the popup visually in Chrome

## Acceptance Criteria

- [ ] Popup opens with "56kode Pin" heading and a Pin button
- [ ] Settings panel toggles open/close via the gear icon
- [ ] Settings auto-open if webhook URL is not configured
- [ ] Entering webhook URL + token and clicking Save persists them in `chrome.storage.local`
- [ ] Clicking Pin shows loading state (spinner + "Pinning...")
- [ ] Success shows green "Pinned!" with file path, resets after 3 seconds
- [ ] Error shows red message with details
- [ ] All popup component tests pass
- [ ] `pnpm run build` succeeds
