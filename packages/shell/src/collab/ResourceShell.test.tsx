import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { ResourceShell } from "./ResourceShell";

test("renders title, meta, actions, and body; back fires onBack", () => {
  const onBack = vi.fn();
  render(
    <ResourceShell onBack={onBack} backLabel="Back to entities" title={<span>Zarha</span>} meta={<span>SHIP</span>}
      actions={<button type="button">Extra</button>}>
      <div>BODY</div>
    </ResourceShell>,
  );
  expect(screen.getByText("Zarha")).toBeInTheDocument();
  expect(screen.getByText("SHIP")).toBeInTheDocument();
  expect(screen.getByText("BODY")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Extra" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Back to entities" }));
  expect(onBack).toHaveBeenCalledOnce();
});

test("no History toggle without historyPanel; toggles the aside with it", () => {
  const { rerender } = render(
    <ResourceShell onBack={() => {}} title="T"><div>BODY</div></ResourceShell>,
  );
  expect(screen.queryByRole("button", { name: "History" })).not.toBeInTheDocument();
  rerender(
    <ResourceShell onBack={() => {}} title="T" historyPanel={<div>TIMELINE</div>}>
      <div>BODY</div>
    </ResourceShell>,
  );
  expect(screen.queryByText("TIMELINE")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "History" }));
  expect(screen.getByText("TIMELINE")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "History" }));
  expect(screen.queryByText("TIMELINE")).not.toBeInTheDocument();
});

test("lock renders the LockBanner; presence renders only when non-empty; saveStatus renders", () => {
  render(
    <ResourceShell onBack={() => {}} title="T" lock={{ holder: "kestrel" }}
      presence={[{ name: "ann" }]} saveStatus={{ status: "saved" }}>
      <div>BODY</div>
    </ResourceShell>,
  );
  // Both LockBanner and SaveStatus carry role="status" — match by content.
  expect(screen.getByText(/Being edited by/)).toBeInTheDocument();
  expect(screen.getByLabelText("1 people here")).toBeInTheDocument();
  expect(screen.getByText("Saved")).toBeInTheDocument();
});

test("empty presence and no lock render neither", () => {
  render(<ResourceShell onBack={() => {}} title="T" presence={[]}><div>B</div></ResourceShell>);
  expect(screen.queryByLabelText(/people here/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Being edited by/)).not.toBeInTheDocument();
});
