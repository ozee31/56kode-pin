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
  it("calls onChange on each input", () => {
    const onChange = vi.fn();
    render(
      <Settings
        settings={{ webhookUrl: "", secretToken: "" }}
        onChange={onChange}
      />,
    );

    const urlInput = screen.getByPlaceholderText(/webhook/i);
    fireEvent.input(urlInput, {
      target: { value: "https://n8n.example.com/webhook/test" },
    });

    expect(onChange).toHaveBeenCalledWith({
      webhookUrl: "https://n8n.example.com/webhook/test",
      secretToken: "",
    });

    const tokenInput = screen.getByPlaceholderText(/token/i);
    fireEvent.input(tokenInput, {
      target: { value: "my-secret" },
    });

    expect(onChange).toHaveBeenCalledWith({
      webhookUrl: "",
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
        onChange={() => {}}
      />,
    );

    const urlInput = screen.getByPlaceholderText(
      /webhook/i,
    ) as HTMLInputElement;
    expect(urlInput.value).toBe("https://existing.com/webhook");
  });
});
