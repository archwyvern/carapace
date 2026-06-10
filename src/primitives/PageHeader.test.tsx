import { render, screen } from "@testing-library/react";
import { PageHeader } from "./PageHeader";

test("renders the eyebrow, title, and actions", () => {
  render(<PageHeader eyebrow="Carapace" title="Settings" actions={<button>Save</button>} />);
  expect(screen.getByText("Carapace")).toBeInTheDocument();
  expect(screen.getByText("Settings")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
});
