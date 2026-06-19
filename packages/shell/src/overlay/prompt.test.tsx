import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { PromptProvider, usePrompt } from "./prompt";

function Harness({ onResult }: { onResult: (r: string | null) => void }) {
  const prompt = usePrompt();
  useEffect(() => {
    void prompt({ title: "Name it", initialValue: "seed" }).then(onResult);
  }, [prompt, onResult]);
  return null;
}

function ValidatedHarness() {
  const prompt = usePrompt();
  useEffect(() => {
    void prompt({ title: "Name", validate: (v) => (v.length < 2 ? "too short" : null) });
  }, [prompt]);
  return null;
}

describe("usePrompt", () => {
  it("resolves the trimmed value on confirm", async () => {
    let result: string | null | undefined;
    render(
      <PromptProvider>
        <Harness onResult={(r) => (result = r)} />
      </PromptProvider>,
    );
    const input = await screen.findByRole("textbox");
    await userEvent.clear(input);
    await userEvent.type(input, "  hello  ");
    await userEvent.click(screen.getByRole("button", { name: /confirm/i }));
    expect(result).toBe("hello");
  });

  it("resolves null on cancel", async () => {
    let result: string | null | undefined = "unset";
    render(
      <PromptProvider>
        <Harness onResult={(r) => (result = r)} />
      </PromptProvider>,
    );
    await screen.findByRole("textbox");
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(result).toBeNull();
  });

  it("blocks confirm while validate returns an error", async () => {
    render(
      <PromptProvider>
        <ValidatedHarness />
      </PromptProvider>,
    );
    const input = await screen.findByRole("textbox");
    await userEvent.clear(input);
    await userEvent.type(input, "x");
    expect(screen.getByRole("button", { name: /confirm/i })).toBeDisabled();
  });
});
