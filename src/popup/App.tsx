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
          webhookUrl: (result.webhookUrl as string) || "",
          secretToken: (result.secretToken as string) || "",
        };
        setSettings(loaded);
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
        setTimeout(() => {
          setStatus("idle");
          setMessage("");
        }, 3000);
      } else {
        setStatus("error");
        setMessage(response.error);
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
        <p class={`${styles.message} ${styles[status]}`}>{message}</p>
      )}
    </div>
  );
}
