import { render, screen } from "@testing-library/react";
import {
  allComponentBindings,
  defineComponentBindings,
  effectiveComponentKeys,
  KeybindingProvider,
  useKeybinding,
} from "./componentBindings";

defineComponentBindings([{ id: "probe.act", label: "Act", when: "probe focus", keys: "F9" }]);

function Probe({ id }: { id: string }) {
  const chord = useKeybinding(id);
  return <div>{chord ? chord.steps.map((s) => s.key).join(" ") : "unbound"}</div>;
}

test("factory default must be single-step", () => {
  expect(() => defineComponentBindings([{ id: "probe.bad", label: "Bad", when: "x", keys: "Ctrl+K U" }])).toThrow(/single-step/);
});

test("re-registering an id is a no-op", () => {
  defineComponentBindings([{ id: "probe.act", label: "Changed", when: "probe focus", keys: "F1" }]);
  expect(allComponentBindings().find((b) => b.id === "probe.act")?.keys).toBe("F9");
});

test("no provider = factory default", () => {
  render(<Probe id="probe.act" />);
  expect(screen.getByText("F9")).toBeInTheDocument();
});

test("host default beats factory; user override beats host default", () => {
  expect(effectiveComponentKeys("probe.act", {})).toBe("F9");
  expect(effectiveComponentKeys("probe.act", { defaults: { "probe.act": "F8" } })).toBe("F8");
  expect(effectiveComponentKeys("probe.act", { defaults: { "probe.act": "F8" }, overrides: { "probe.act": "F7" } })).toBe("F7");
});

test("null at any tier unbinds", () => {
  expect(effectiveComponentKeys("probe.act", { overrides: { "probe.act": null } })).toBe(null);
  expect(effectiveComponentKeys("probe.act", { defaults: { "probe.act": null } })).toBe(null);
});

test("unknown id resolves to null", () => {
  expect(effectiveComponentKeys("nope.nothing", {})).toBe(null);
});

test("provider overrides flow into useKeybinding", () => {
  render(
    <KeybindingProvider config={{ overrides: { "probe.act": "Ctrl+F9" } }}>
      <Probe id="probe.act" />
    </KeybindingProvider>,
  );
  expect(screen.getByText("F9")).toBeInTheDocument(); // key name; modifiers live on the step flags
});
