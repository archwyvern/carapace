import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GradientTexture2D, FastNoiseLite, Gradient, registerBuiltinResources } from "@carapace/resources";
import { ResourceInspector } from "./ResourceInspector";

beforeAll(() => registerBuiltinResources());

test("renders a resource's fields with humanized labels and the right controls", () => {
  render(<ResourceInspector resource={new GradientTexture2D()} />);
  expect(screen.getByRole("combobox", { name: "Fill" })).toBeInTheDocument();
  expect(screen.getByText("Fill From")).toBeInTheDocument(); // vec field
  expect(screen.getByRole("switch", { name: "Use HDR" })).toBeInTheDocument();
});

test("toggling a bool field writes through to the resource and re-renders from it", async () => {
  const t = new GradientTexture2D();
  render(<ResourceInspector resource={t} />);
  expect(t.useHDR.get()).toBe(false);
  await userEvent.click(screen.getByRole("switch", { name: "Use HDR" }));
  expect(t.useHDR.get()).toBe(true);
  expect(screen.getByRole("switch", { name: "Use HDR" })).toHaveAttribute("aria-checked", "true");
});

test("an enum field writes the option name (not the index) back to the resource", async () => {
  const t = new GradientTexture2D();
  render(<ResourceInspector resource={t} />);
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Fill" }), "Radial");
  expect(t.fill.get()).toBe("Radial");
});

test("a resource field recurses into a nested object inspector", () => {
  const t = new GradientTexture2D();
  t.gradient.set(new Gradient());
  render(<ResourceInspector resource={t} />);
  // The sub-gradient's own enum renders nested — proves recursion through the object field.
  expect(screen.getByRole("combobox", { name: "Interpolation Mode" })).toBeInTheDocument();
});

test("honors group sections and conditional visibility from the resource", async () => {
  const n = new FastNoiseLite();
  render(<ResourceInspector resource={n} />);
  expect(screen.getByText("Fractal")).toBeInTheDocument(); // a section header (unambiguous)
  expect(screen.queryByText("Cellular Jitter")).not.toBeInTheDocument(); // hidden until type=Cellular
  n.noiseType.set("Cellular");
  expect(await screen.findByText("Cellular Jitter")).toBeInTheDocument();
});
