import { test } from "node:test";
import assert from "node:assert/strict";
import { createEngine, fileName } from "../packages/runtime/src/engine.js";

const quiet = {};
test("arithmetic, big integers, exact fractions, and persistent functions", async () => {
  const e = await createEngine(quiet);
  assert.equal((await e.run("1 + 2 * 3;")).output.trim(), "7;");
  assert.equal(
    (
      await e.run(
        "factorial := func(n); if n=0 then return 1; end; return n*factorial(n-1); end; factorial(30);",
      )
    ).output.trim(),
    "265252859812191058636308480000000;",
  );
  assert.equal((await e.run("factorial(5);")).output.trim(), "120;");
  assert.equal((await e.run("!rational on\n1/3 + 1/6;")).output.trim(), "1/2;");
});
test("sets, tuples, comprehensions, maps, closures, and quantifiers", async () => {
  const e = await createEngine(quiet);
  for (const [source, expected] of [
    ["{1,2}+{2,3} = {1,2,3};", "true;"],
    ["{n*n:n in {1..5}} = {1,4,9,16,25};", "true;"],
    ["[n:n in [1..6]|n mod 2=0];", "[2, 4, 6];"],
    ['m:={[1,"a"],[2,"b"]}; m(2);', '"b";'],
    ["forall n in {1..10}|n>0;", "true;"],
    [
      "f:=func(x); return func(y); return x+y; end; end; add3:=f(3); add3(5);",
      "8;",
    ],
  ])
    assert.equal((await e.run(source)).output.trim(), expected, source);
});
test("syntax and runtime errors report failure and recover", async () => {
  const e = await createEngine(quiet);
  assert.equal((await e.run("x := ;")).status, "error");
  assert.equal((await e.run("1/0;")).status, "error");
  assert.equal((await e.run("6*7;")).output.trim(), "42;");
  assert.equal((await e.run('writeln "!Error: just a string";')).status, "ok");
});
test("incomplete statements can continue in the next submission", async () => {
  const e = await createEngine(quiet);
  assert.equal((await e.run("f := func(n);")).status, "incomplete");
  assert.equal((await e.run("return n*n; end; f(8);")).output.trim(), "64;");
});
test("read suspends for interactive input without consuming the source file", async () => {
  const e = await createEngine({
    onEvent: (event) => {
      if (event.type === "status" && event.status === "input")
        queueMicrotask(() => e.input("7;"));
    },
  });
  assert.equal((await e.run("read n; print n*n;")).output.trim(), "49;");
});
test("formatted input and isolated virtual file I/O", async () => {
  const e = await createEngine({ files: { "data.txt": "21;\n" } });
  assert.equal(
    (
      await e.run('f:=openr("data.txt"); read x from f; close(f); x*2;')
    ).output.trim(),
    "42;",
  );
  assert.equal(
    (await e.run('f:=openw("out.txt"); print [1,2,3] to f; close(f);')).status,
    "ok",
  );
  assert.equal(e.readFile("out.txt").trim(), "[1, 2, 3];");
  assert.ok(e.listFiles().includes("out.txt"));
  assert.throws(() => fileName("../outside"));
  const other = await createEngine(quiet);
  assert.ok(!other.listFiles().includes("out.txt"));
});
test("the archived plotting library draws and responds to keyboard coordinates", async () => {
  let lines = 0;
  const e = await createEngine({
    onEvent: (event) => {
      if (event.type === "draw")
        lines += event.commands.filter((c) => c.op === 2).length;
      if (event.type === "status" && event.status === "coordinate")
        queueMicrotask(() => e.coordinate(480, 320, "q"));
    },
  });
  const result = await e.run(
    "!include donplot.stl\nf:=func(x);return sin(x);end; plot(f,-7,7,-2,2);",
  );
  assert.equal(result.status, "ok", result.output);
  assert.ok(lines > 30, `Expected plotted lines, got ${lines}`);
});
test("garbage collection preserves live values under repeated allocation", async () => {
  const e = await createEngine(quiet);
  const result = await e.run(
    "!memory 500000\nkeep:={1..100}; for i in [1..500] do t:={n*n:n in {1..100}}; end; #keep; #t;",
  );
  assert.equal(result.status, "ok", result.output);
  assert.match(result.output, /100;\n100;/);
});
test("every shipped playground example executes with the real interpreter", async () => {
  const { readFile } = await import("node:fs/promises");
  const { default: ts } = await import("typescript");
  const source = await readFile(
    new URL("../apps/web/src/examples.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
  const { examples } = await import(
    "data:text/javascript;base64," + Buffer.from(compiled).toString("base64")
  );
  for (const example of examples) {
    const e = await createEngine({
      onEvent: (event) => {
        if (event.type === "status" && event.status === "input")
          queueMicrotask(() => e.input("12;"));
        if (event.type === "status" && event.status === "coordinate")
          queueMicrotask(() => e.coordinate(480, 320, "q"));
      },
    });
    const result = await e.run(example.source);
    assert.equal(result.status, "ok", `${example.id}: ${result.output}`);
    if (example.id === "cantor") {
      assert.equal(
        (await e.run('X = {"b", "c"}; X notin image(f);')).output.trim(),
        "true;\ntrue;",
      );
      assert.match(
        result.output,
        /Does X have an antecedent under f\?\nfalse;/,
      );
    }
  }
});

test("inspection reads native values without changing output, variables, or equality", async () => {
  const events = [];
  const e = await createEngine({ onEvent: (event) => events.push(event) });
  await e.run(
    "A:={1,2,{3,4},[5,6]}; B:={2.0,{4,3},[5,6]}; E:={}; T:=[7]; n:=42;",
  );
  events.length = 0;
  const variables = e.inspect();
  const value = (name) => variables.find((v) => v.name === name).value;
  assert.equal(value("A").type, "set");
  assert.equal(value("A").size, 4);
  assert.equal(value("E").label, "{}");
  assert.equal(value("T").label, "[7]");
  assert.equal(value("n").label, "42");
  const keys = new Set(value("A").items.map((item) => item.key));
  assert.ok(value("B").items.every((item) => keys.has(item.key)));
  assert.deepEqual(e.inspect(), variables);
  assert.deepEqual(events, []);
  assert.equal((await e.run("A*B=B; n;")).output.trim(), "true;\n42;");
});

test("inspection bounds large collections, nesting, and text; survives subsequent runs", async () => {
  const e = await createEngine();
  await e.run('large:={1..1000}; nested:={{{{1}}}}; text:="x"*400;');
  const snapshot = e.inspect();
  const large = snapshot.find((v) => v.name === "large").value;
  assert.equal(large.size, 1000);
  assert.equal(large.items.length, 80);
  assert.equal(large.truncated, true);
  assert.equal(snapshot.find((v) => v.name === "text").value.truncated, true);
  assert.ok(
    snapshot.find((v) => v.name === "nested").value.label.includes("…"),
  );
  assert.equal((await e.run("#large;")).output.trim(), "1000;");
  await e.run("f:=func(x); return x*x; end; f(9);");
  assert.equal(e.inspect().find((v) => v.name === "f").value.type, "function");
});

test("inspection rejects incomplete sessions", async () => {
  const e = await createEngine();
  await e.run("f:=func(x);");
  assert.throws(() => e.inspect(), /ready session/);
  await e.run("return x; end;");
  assert.equal(e.inspect().find((v) => v.name === "f").value.type, "function");
});

test("Cantor's diagonal subset is missing from all 512 maps on a three-element set", async () => {
  const e = await createEngine();
  const result = await e.run(`
    E := {1,2,3}; P := pow(E);
    maps := {{[1,u],[2,v],[3,w]} : u in P, v in P, w in P};
    #maps;
    forall g in maps | {e : e in E | e notin g(e)} notin image(g);
    E := {}; g := {}; X := {e : e in E | e notin g(e)};
    X = {} and X notin image(g);
  `);
  assert.equal(result.status, "ok", result.output);
  assert.equal(result.output.trim(), "512;\ntrue;\ntrue;");
});
