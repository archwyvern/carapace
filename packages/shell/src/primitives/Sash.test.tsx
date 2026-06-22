import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { Sash } from "./Sash";

// jsdom has no PointerEvent (so fireEvent.pointer* can't construct one and React never dispatches the
// handlers) and its setPointerCapture throws on synthetic ids. Polyfill PointerEvent as a MouseEvent
// subclass (clientX/button/buttons flow through) and stub capture to a no-op.
class PointerEventPolyfill extends MouseEvent {
  pointerId: number;
  constructor(type: string, props: PointerEventInit = {}) {
    super(type, props);
    this.pointerId = props.pointerId ?? 1;
  }
}
beforeAll(() => {
  (globalThis as { PointerEvent: typeof PointerEvent }).PointerEvent =
    PointerEventPolyfill as unknown as typeof PointerEvent;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
});

test("a vertical sash renders a vertical separator", () => {
  render(<Sash orientation="vertical" onDrag={() => {}} />);
  const sash = screen.getByRole("separator");
  expect(sash).toHaveAttribute("aria-orientation", "vertical");
  expect(sash).toHaveClass("cursor-col-resize");
});

test("a horizontal sash renders a horizontal separator", () => {
  render(<Sash orientation="horizontal" onDrag={() => {}} />);
  const sash = screen.getByRole("separator");
  expect(sash).toHaveAttribute("aria-orientation", "horizontal");
  expect(sash).toHaveClass("cursor-row-resize");
});

test("a pointerdown on the sash drags it", () => {
  const onDrag = vi.fn();
  render(<Sash orientation="vertical" onDrag={onDrag} />);
  const sash = screen.getByRole("separator");
  fireEvent.pointerDown(sash, { button: 0, clientX: 100 });
  fireEvent.pointerMove(sash, { buttons: 1, clientX: 130 });
  expect(onDrag).toHaveBeenCalledWith(30);
  fireEvent.pointerUp(sash);
});

// A press that began elsewhere (so the sash never captured the pointer) can still deliver move
// events to the sash as the cursor passes over it. Those must NOT start a resize.
test("a button-held move that did not start on the sash does not drag it", () => {
  const onDrag = vi.fn();
  render(<Sash orientation="vertical" onDrag={onDrag} />);
  const sash = screen.getByRole("separator");
  fireEvent.pointerMove(sash, { buttons: 1, clientX: 130 });
  fireEvent.pointerMove(sash, { buttons: 1, clientX: 160 });
  expect(onDrag).not.toHaveBeenCalled();
});
