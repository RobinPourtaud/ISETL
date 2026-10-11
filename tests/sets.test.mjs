import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { createEngine } from "../packages/runtime/src/engine.js";
const source = await readFile(
  new URL("../apps/web/src/set-model.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
});
const { combineSets } = await import(
  "data:text/javascript;base64," + Buffer.from(outputText).toString("base64")
);

test("set visualization partitions native snapshots for all operations", async () => {
  const e = await createEngine();
  await e.run("A:={1,2,3}; B:={2.0,3,4}; E:={};");
  const variables = e.inspect();
  const get = (name) => variables.find((v) => v.name === name);
  for (const [operation, expected] of [
    ["union", [1, 2, 3, 4]],
    ["intersection", [2, 3]],
    ["difference", [1]],
    ["symmetric", [1, 4]],
  ]) {
    const combined = combineSets(get("A"), get("B"), operation);
    assert.deepEqual(
      combined.result.map((v) => Number(v.label)).sort(),
      expected,
    );
    assert.equal(combined.regions.flat().length, 4);
  }
  assert.equal(combineSets(get("A"), get("A"), "difference").result.length, 0);
  assert.equal(combineSets(get("A"), get("E"), "union").result.length, 3);
  assert.equal(
    combineSets(get("E"), get("E"), "intersection").result.length,
    0,
  );
});
