import { strict as assert } from "node:assert";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { parse, serialize, type Document, type ValueNode } from "./language.js";

const CORPUS_ROOT = "/home/archwyvern/Projects/monolith/Archwyvern.Games.Space2D";

function findFiles(root: string, exts: string[]): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (exts.some((ext) => entry.name.endsWith(ext))) {
        out.push(full);
      }
    }
  };
  walk(root);
  return out.sort();
}

/**
 * Strips source spans (`start`/`length`) from a parsed document so two ASTs can be compared by
 * structure. Reserializing legitimately shifts positions, so spans are not part of round-trip
 * stability — the node shapes and values are.
 */
function stripSpans(doc: Document): unknown {
  return JSON.parse(
    JSON.stringify(doc, (key, value) => (key === "start" || key === "length" ? undefined : value)),
  );
}

const vresFiles = findFiles(CORPUS_ROOT, [".vres"]);
const vscnFiles = findFiles(CORPUS_ROOT, [".vscn"]);
const allFiles = [...vresFiles, ...vscnFiles];

test("corpus is non-empty", () => {
  assert.ok(vresFiles.length > 0, "expected at least one .vres file in the corpus");
});

test(`round-trips every real .vres/.vscn file (${allFiles.length} files)`, () => {
  let textStable = 0;
  const astFailures: string[] = [];
  const parseFailures: string[] = [];
  const textUnstable: string[] = [];

  for (const file of allFiles) {
    const text = readFileSync(file, "utf8");

    // 1. parse -> AST, no diagnostics.
    const { doc, diagnostics } = parse(text, file);
    if (!doc) {
      const first = diagnostics.find((d) => d.severity === "error");
      parseFailures.push(`${file}: ${first ? `${first.code} ${first.message} @${first.start}` : "no doc"}`);
      continue;
    }
    const errs = diagnostics.filter((d) => d.severity === "error");
    if (errs.length > 0) {
      parseFailures.push(`${file}: ${errs[0]!.code} ${errs[0]!.message}`);
      continue;
    }

    // 2. serialize -> text2, parse -> AST2, assert AST2 deep-equals AST.
    const text2 = serialize(doc);
    const { doc: doc2, diagnostics: diags2 } = parse(text2, `${file}#2`);
    if (!doc2) {
      const first = diags2.find((d) => d.severity === "error");
      astFailures.push(`${file}: reparse failed ${first ? `${first.code} ${first.message}` : ""}`);
      continue;
    }

    try {
      assert.deepEqual(stripSpans(doc2), stripSpans(doc));
    } catch (e) {
      astFailures.push(`${file}: AST not stable (${(e as Error).message.split("\n")[0]})`);
      continue;
    }

    // 3. (preferred) text-stable: serialize(doc2) === text2.
    const text3 = serialize(doc2);
    if (text3 === text2) {
      textStable++;
    } else {
      textUnstable.push(file);
    }
  }

  const report = [
    `total:        ${allFiles.length}`,
    `parse fail:   ${parseFailures.length}`,
    `AST unstable: ${astFailures.length}`,
    `text stable:  ${textStable}/${allFiles.length - parseFailures.length - astFailures.length}`,
  ].join("\n");

  if (parseFailures.length > 0 || astFailures.length > 0) {
    const sample = [...parseFailures, ...astFailures].slice(0, 10).join("\n  ");
    assert.fail(`Round-trip failures:\n${report}\nSamples:\n  ${sample}`);
  }

  // text-stability is the preferred (not hard) bar; surface any drift but do not fail on it.
  if (textUnstable.length > 0) {
    console.warn(`text-unstable (AST-stable) files: ${textUnstable.length}\n  ${textUnstable.slice(0, 5).join("\n  ")}`);
  }

  console.log(report);
});

test("serialized text re-parses without diagnostics for every file", () => {
  for (const file of allFiles) {
    const text = readFileSync(file, "utf8");
    const { doc } = parse(text, file);
    if (!doc) continue;
    const text2 = serialize(doc);
    const { diagnostics } = parse(text2, file);
    const errs = diagnostics.filter((d) => d.severity === "error");
    assert.equal(errs.length, 0, `${file}: serialized text produced ${errs.length} error(s)`);
  }
});

// A focused unit test of value-node shapes the corpus may not exercise (maps, flag enums,
// multiline strings, generics), so the grammar coverage does not silently rot.
test("synthetic grammar features round-trip (maps, flag enums, generics)", () => {
  const src = [
    "vdat Sample",
    "",
    "body {",
    '    Flags: Mode.A | Mode.B',
    '    Lookup: { "x": 1, "y": 2 }',
    "    Empty: {}",
    "    Items: [ Vec2(1.0, -2.0), Vec2(0.0, 0.0) ]",
    "    Ref: ext(handle_1)",
    "    Sub: sub(Inner_0)",
    '    Text: "a\\nb\\tc"',
    "}",
    "",
  ].join("\n");

  const { doc, diagnostics } = parse(src, "<synthetic>");
  assert.ok(doc, `parse failed: ${JSON.stringify(diagnostics)}`);
  assert.equal(diagnostics.filter((d) => d.severity === "error").length, 0);

  const text2 = serialize(doc!);
  const { doc: doc2 } = parse(text2, "<synthetic#2>");
  assert.ok(doc2);
  assert.deepEqual(stripSpans(doc2!), stripSpans(doc!));

  // Spot-check a couple of node shapes.
  const flags = doc!.body.members.find((m) => m.name === "Flags")!.value as ValueNode;
  assert.equal(flags.kind, "Enum");
  const lookup = doc!.body.members.find((m) => m.name === "Lookup")!.value as ValueNode;
  assert.equal(lookup.kind, "Map");
});
