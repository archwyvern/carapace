import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Tooltip } from "./Tooltip";

test("shows on focus after the dwell and hides on blur", async () => {
  render(
    <Tooltip content="Snap to guides" delay={0}>
      <button>ruler</button>
    </Tooltip>,
  );
  expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  fireEvent.focus(screen.getByText("ruler").parentElement!); // the wrapper span carries the handlers
  expect(await screen.findByRole("tooltip")).toHaveTextContent("Snap to guides");
  fireEvent.blur(screen.getByText("ruler").parentElement!);
  expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
});

test("empty content never shows a bubble", async () => {
  render(
    <Tooltip content="" delay={0}>
      <button>bare</button>
    </Tooltip>,
  );
  fireEvent.focus(screen.getByText("bare").parentElement!);
  // the dwell timer still fires (a state update) — waitFor keeps it inside act while we assert no bubble
  await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
});

test("a top-placed tooltip against the window edge flips below the trigger", async () => {
  // jsdom rects are all-zero => the trigger sits at the very top edge, the title-bar case
  render(
    <Tooltip content="tip" delay={0}>
      <button>t</button>
    </Tooltip>,
  );
  fireEvent.mouseEnter(screen.getByText("t").parentElement!);
  await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument());
  // flipped to bottom, not rendered off-screen above the window
  expect(screen.getByRole("tooltip").style.transform).toBe("translate(-50%, 0)");
});
