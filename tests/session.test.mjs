import { Worker } from "node:worker_threads";
import { test } from "node:test";
import assert from "node:assert/strict";
import { IsetlSession } from "../packages/runtime/dist/index.js";

class BrowserWorker {
  constructor(url) {
    this.worker = new Worker(new URL("./worker-host.mjs", import.meta.url), {
      workerData: { moduleURL: url?.href },
    });
    this.worker.on("message", (data) => this.onmessage?.({ data }));
    this.worker.on("error", (error) =>
      this.onerror?.({ message: error.message }),
    );
  }
  postMessage(message) {
    this.worker.postMessage(message);
  }
  terminate() {
    this.worker.terminate();
  }
}
const options = { workerFactory: () => new BrowserWorker() };

test("packaged public API initializes, persists state, and exchanges files", async (t) => {
  const session = new IsetlSession(options);
  t.after(() => session.dispose());
  await session.ready;
  assert.equal((await session.run("x:=41; x+1;")).output.trim(), "42;");
  assert.equal((await session.run("x;")).output.trim(), "41;");
  assert.equal(
    (await session.inspect()).find((v) => v.name === "x").value.label,
    "41",
  );
  const inspection = session.inspect();
  await assert.rejects(session.run("1;"), /not ready/);
  await inspection;
  await session.writeFile("data.txt", "123;");
  assert.equal(await session.readFile("data.txt"), "123;");
  assert.ok((await session.listFiles()).includes("data.txt"));
  await assert.rejects(session.writeFile("../no.txt", "test"), /filename/);
});
test("stop interrupts an infinite program and rejects its pending execution", async () => {
  const session = new IsetlSession(options);
  await session.ready;
  const run = session.run("while true do x:=1; end;");
  const rejected = assert.rejects(run, /stopped/);
  setTimeout(() => session.stop(), 100);
  await rejected;
  assert.equal(session.status, "stopped");
});
test("execution timeout terminates the worker", async (t) => {
  const events = [];
  const session = new IsetlSession({
    ...options,
    timeoutMs: 100,
    onEvent: (event) => events.push(event),
  });
  t.after(() => session.dispose());
  await assert.rejects(session.run("while true do x:=1; end;"));
  assert.equal(session.status, "error");
  assert.ok(
    events.some(
      (event) => event.type === "error" && event.message.includes("exceeded"),
    ),
  );
});
test("interactive waits suspend the execution timeout and accept input", async (t) => {
  let session;
  session = new IsetlSession({
    ...options,
    timeoutMs: 100,
    onEvent: (event) => {
      if (event.type === "status" && event.status === "input")
        setTimeout(() => session.input("8;"), 180);
    },
  });
  t.after(() => session.dispose());
  assert.equal((await session.run("read x; x*x;")).output.trim(), "64;");
});
test("excessive output fails cleanly instead of leaving a pending run", async (t) => {
  const events = [];
  const session = new IsetlSession({
    ...options,
    timeoutMs: 3000,
    onEvent: (event) => events.push(event),
  });
  t.after(() => session.dispose());
  await assert.rejects(
    session.run(
      'while true do writeln "0123456789012345678901234567890123456789"; end;',
    ),
  );
  assert.equal(session.status, "error");
  assert.ok(
    events.some(
      (event) =>
        event.type === "error" && event.message.includes("Output limit"),
    ),
  );
});

test("the default packaged worker URL resolves without bundler-specific overrides", async (t) => {
  const previous = globalThis.Worker;
  globalThis.Worker = BrowserWorker;
  const session = new IsetlSession();
  t.after(() => {
    session.dispose();
    globalThis.Worker = previous;
  });
  assert.equal((await session.run("2+2;")).output.trim(), "4;");
});

test("late worker messages cannot revive a failed session", async () => {
  let terminated = 0;
  const events = [];
  const worker = {
    postMessage() {},
    terminate() {
      terminated++;
    },
  };
  const session = new IsetlSession({
    workerFactory: () => worker,
    onEvent: (event) => events.push(event),
  });
  worker.onmessage({ data: { type: "status", status: "ready" } });
  await session.ready;
  worker.onmessage({ data: { type: "error", message: "Failure" } });
  worker.onmessage({ data: { type: "status", status: "ready" } });
  worker.onmessage({ data: { type: "error", message: "Duplicate failure" } });
  session.dispose();
  assert.equal(session.status, "error");
  assert.equal(terminated, 1);
  assert.equal(events.filter((event) => event.type === "error").length, 1);
});
