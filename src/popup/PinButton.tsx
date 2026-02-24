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
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
    >
      {status === "loading" && <span class={styles.spinner} />}
      {label}
    </button>
  );
}
