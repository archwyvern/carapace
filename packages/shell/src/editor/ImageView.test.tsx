import { fireEvent, render, screen } from "@testing-library/react";
import { ImageView } from "./ImageView";

// jsdom has no object-URL machinery or image decoding: stub the URL factory and
// force the img's natural size, then drive the load event by hand.
const created: string[] = [];
const revoked: string[] = [];
beforeEach(() => {
  created.length = 0;
  revoked.length = 0;
  let n = 0;
  URL.createObjectURL = vi.fn(() => {
    const url = `blob:test-${n++}`;
    created.push(url);
    return url;
  });
  URL.revokeObjectURL = vi.fn((u: string) => void revoked.push(u));
});

function loadImage(img: HTMLImageElement, width: number, height: number) {
  Object.defineProperty(img, "naturalWidth", { value: width, configurable: true });
  Object.defineProperty(img, "naturalHeight", { value: height, configurable: true });
  fireEvent.load(img);
}

const BYTES = new Uint8Array([1, 2, 3]);

test("renders an img from an object URL of the bytes and revokes it on unmount", () => {
  const { unmount } = render(<ImageView bytes={BYTES} mimeType="image/png" alt="preview" />);
  const img = screen.getByRole("img") as HTMLImageElement;
  expect(created).toHaveLength(1);
  expect(img.src).toContain(created[0]);
  unmount();
  expect(revoked).toEqual(created);
});

test("new bytes swap the object URL and revoke the old one", () => {
  const { rerender } = render(<ImageView bytes={BYTES} mimeType="image/png" alt="preview" />);
  rerender(<ImageView bytes={new Uint8Array([9, 9])} mimeType="image/png" alt="preview" />);
  expect(created).toHaveLength(2);
  expect(revoked).toEqual([created[0]]);
});

test("onInfo reports natural dimensions and the current zoom after load", () => {
  const onInfo = vi.fn();
  render(<ImageView bytes={BYTES} mimeType="image/png" alt="preview" onInfo={onInfo} />);
  loadImage(screen.getByRole("img") as HTMLImageElement, 640, 480);
  expect(onInfo).toHaveBeenCalledWith(expect.objectContaining({ width: 640, height: 480 }));
  expect(onInfo.mock.lastCall![0].zoom).toBeGreaterThan(0);
});

test("ctrl+wheel zooms in; double-click returns to fit", () => {
  const onInfo = vi.fn();
  render(<ImageView bytes={BYTES} mimeType="image/png" alt="preview" onInfo={onInfo} />);
  const img = screen.getByRole("img") as HTMLImageElement;
  loadImage(img, 640, 480);
  const before = onInfo.mock.lastCall![0].zoom as number;

  const surface = img.closest("[data-imageview]")!;
  fireEvent.wheel(surface, { ctrlKey: true, deltaY: -120 });
  const zoomed = onInfo.mock.lastCall![0].zoom as number;
  expect(zoomed).toBeGreaterThan(before);

  fireEvent.doubleClick(surface);
  expect(onInfo.mock.lastCall![0].zoom).toBe(before);
});

test("plain wheel (no ctrl) does not zoom", () => {
  const onInfo = vi.fn();
  render(<ImageView bytes={BYTES} mimeType="image/png" alt="preview" onInfo={onInfo} />);
  const img = screen.getByRole("img") as HTMLImageElement;
  loadImage(img, 640, 480);
  const before = onInfo.mock.lastCall![0].zoom as number;
  fireEvent.wheel(img.closest("[data-imageview]")!, { deltaY: -120 });
  expect(onInfo.mock.lastCall![0].zoom).toBe(before);
});
