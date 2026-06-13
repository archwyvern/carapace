import { render, screen } from "@testing-library/react";
import { SplitView, resizeSplit } from "./SplitView";

test("resizeSplit grows the start pane by the delta", () => {
  expect(resizeSplit(100, 20, { primary: "start", min: 0, max: 500 })).toBe(120);
});

test("resizeSplit shrinks the end pane by the delta", () => {
  expect(resizeSplit(100, 20, { primary: "end", min: 0, max: 500 })).toBe(80);
});

test("resizeSplit clamps to min and max", () => {
  expect(resizeSplit(100, -200, { primary: "start", min: 50, max: 500 })).toBe(50);
  expect(resizeSplit(100, 1000, { primary: "start", min: 50, max: 300 })).toBe(300);
});

test("renders both panes and a sash", () => {
  render(
    <SplitView orientation="horizontal" size={200} onResize={() => {}}>
      <div>PANE_A</div>
      <div>PANE_B</div>
    </SplitView>,
  );
  expect(screen.getByText("PANE_A")).toBeInTheDocument();
  expect(screen.getByText("PANE_B")).toBeInTheDocument();
  expect(screen.getByRole("separator")).toBeInTheDocument();
});
