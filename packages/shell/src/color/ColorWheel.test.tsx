import { render } from "@testing-library/react";
import { ColorWheel } from "./ColorWheel";

test("renders the wheel and value-strip canvases", () => {
  const { container } = render(
    <ColorWheel hue={0} saturation={50} value={100} size={200} onChange={() => {}} />,
  );
  expect(container.querySelectorAll("canvas")).toHaveLength(2);
});
