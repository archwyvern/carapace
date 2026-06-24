import { strict as assert } from "node:assert";
import { test } from "node:test";

import { TypeRegistry, deserialize, type ExternalLoader } from "./serialization.js";

// A self-contained registry exercising literals, enums, ctors, struct bodies, arrays, maps, and
// ext/sub handle resolution — the consumer-driven path the corpus round-trip test does not cover.
function buildRegistry(): TypeRegistry {
  const registry = new TypeRegistry();

  registry.register({
    name: "Vec2",
    create: () => ({ x: 0, y: 0 }),
    constructors: [{ params: ["float", "float"], create: (x: number, y: number) => ({ x, y }) }],
  });

  registry.register({
    name: "Mode",
    create: () => 0,
    enums: { None: 0, A: 1, B: 2 },
  });

  registry.register({
    name: "Item",
    create: () => ({ label: "", weight: 0 }),
    properties: {
      Label: { type: "string", set: (o, v) => (o.label = v) },
      Weight: { type: "float", set: (o, v) => (o.weight = v) },
    },
  });

  registry.register({
    name: "Doc",
    create: () => ({ name: "", count: 0, mode: 0, pos: null, items: [], tags: new Map(), child: null }),
    properties: {
      Name: { type: "string", set: (o, v) => (o.name = v) },
      Count: { type: "int", set: (o, v) => (o.count = v) },
      Mode: { type: "Mode", set: (o, v) => (o.mode = v) },
      Pos: { type: "Vec2", set: (o, v) => (o.pos = v) },
      Items: { type: "List<Item>", set: (o, v) => (o.items = v) },
      Tags: { type: "auto", set: (o, v) => (o.tags = v) },
      Child: { type: "Item", set: (o, v) => (o.child = v) },
    },
  });

  return registry;
}

test("deserializes a vdat value document via the registry", () => {
  const registry = buildRegistry();
  const src = [
    "vdat Doc",
    "",
    "body {",
    '    Name: "hello"',
    "    Count: 7",
    "    Mode: Mode.B",
    "    Pos: Vec2(3.0, -4.0)",
    '    Items: [ Item { Label: "a", Weight: 1.5 }, Item { Label: "b", Weight: 2.0 } ]',
    '    Tags: { "k": 1, "j": 2 }',
    '    Child: Item { Label: "c", Weight: 9.0 }',
    "}",
    "",
  ].join("\n");

  const result = deserialize(src, registry) as any;
  assert.equal(result.name, "hello");
  assert.equal(result.count, 7);
  assert.equal(result.mode, 2);
  assert.deepEqual(result.pos, { x: 3, y: -4 });
  assert.equal(result.items.length, 2);
  assert.deepEqual(result.items[0], { label: "a", weight: 1.5 });
  assert.equal(result.child.label, "c");
  assert.ok(result.tags instanceof Map);
  assert.equal(result.tags.get("k"), 1);
});

test("deserializes a vres resource document with ext + sub handles", () => {
  const registry = buildRegistry();
  const src = [
    "vres Doc",
    "",
    'ext logo: "core://assets/logo.png"',
    "",
    "sub Item_0: Item {",
    '    Label: "embedded"',
    "    Weight: 42.0",
    "}",
    "",
    "resource {",
    '    Name: "root"',
    "    Child: sub(Item_0)",
    "    Pos: ext(logo)",
    "}",
    "",
  ].join("\n");

  const loaded: string[] = [];
  const loadExternal: ExternalLoader = (path) => {
    loaded.push(path);
    return { kind: "external", path };
  };

  const result = deserialize(src, registry, { loadExternal }) as any;
  assert.equal(result.name, "root");
  assert.equal(result.child.label, "embedded");
  assert.equal(result.child.weight, 42);
  assert.deepEqual(result.pos, { kind: "external", path: "core://assets/logo.png" });
  assert.deepEqual(loaded, ["core://assets/logo.png"]);
});
