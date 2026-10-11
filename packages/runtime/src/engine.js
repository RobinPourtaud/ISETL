import library from "../generated/library.js";
import createModule from "../generated/isetl.js";

export function fileName(name) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,18}$/.test(name)) {
    throw new Error(
      "Use a filename of 1–19 letters, numbers, dots, underscores, or hyphens.",
    );
  }
  return name.toLowerCase();
}

export async function createEngine({
  files = {},
  onEvent = () => {},
  wasmBinary,
} = {}) {
  let bytes = [];
  let position = 0;
  let resume;
  let coordinate;
  let current;
  let output = "";
  let hadError = false;
  let chunk = "";
  let graphics = [];
  let status = "loading";
  let outputSize = 0;
  let lastFlush = performance.now();
  const decoder = new TextDecoder();
  let outputBytes = [];
  const emitStatus = (value) => {
    status = value;
    onEvent({ type: "status", status });
  };
  const flush = () => {
    lastFlush = performance.now();
    if (outputBytes.length) {
      chunk += decoder.decode(new Uint8Array(outputBytes), { stream: true });
      outputBytes = [];
    }
    if (chunk) {
      onEvent({ type: "output", text: chunk });
      output += chunk;
      chunk = "";
    }
    if (graphics.length) {
      onEvent({ type: "draw", commands: graphics });
      graphics = [];
    }
  };
  const push = (text) => {
    bytes = [...bytes.slice(position), ...new TextEncoder().encode(text)];
    position = 0;
    if (resume) {
      const next = resume;
      resume = undefined;
      next();
    }
  };
  const put = (byte) => {
    if (++outputSize > 1_000_000) {
      const message =
        "Output limit reached (1 MB). Reset the session to continue.";
      onEvent({ type: "error", message });
      throw new Error(message);
    }
    outputBytes.push(byte);
    if (
      (byte === 10 && performance.now() - lastFlush > 16) ||
      outputBytes.length >= 4096
    )
      flush();
  };
  const module = await createModule({
    ...(wasmBinary ? { wasmBinary } : {}),
    noInitialRun: true,
    markError: () => {
      hadError = true;
    },
    print: (text) => {
      chunk += text + "\n";
      flush();
    },
    printErr: (text) => {
      chunk += text + "\n";
      flush();
    },
    preRun: [(mod) => mod.FS.init(null, put, put)],
    readCharacter: async (reading, inside) => {
      if (position >= bytes.length) {
        flush();
        if (!reading && current) {
          const result = {
            output,
            duration: performance.now() - current.started,
            status: inside ? "incomplete" : hadError ? "error" : "ok",
          };
          const finished = current;
          current = undefined;
          emitStatus(inside ? "incomplete" : "ready");
          finished.resolve(result);
        } else emitStatus(reading ? "input" : inside ? "incomplete" : "ready");
        await new Promise((resolve) => {
          resume = resolve;
        });
      }
      return bytes[position++];
    },
    draw: (command) => {
      graphics.push(command);
      if (graphics.length >= 512) flush();
    },
    readCoordinate: async () => {
      flush();
      emitStatus("coordinate");
      return new Promise((resolve) => {
        coordinate = resolve;
      });
    },
    onAbort: (reason) => onEvent({ type: "error", message: String(reason) }),
    onExit: (code) => {
      flush();
      if (current) {
        current.resolve({
          output,
          duration: performance.now() - current.started,
          status: code ? "error" : "ok",
        });
        current = undefined;
      }
      emitStatus("stopped");
    },
  });
  module.FS.mkdir("/workspace");
  module.FS.chdir("/workspace");
  for (const [name, content] of Object.entries({ ...library, ...files }))
    module.FS.writeFile(fileName(name), content);
  module.callMain([]);
  return {
    run(source) {
      if (status !== "ready" && status !== "incomplete")
        return Promise.reject(new Error("The interpreter is busy."));
      const continued = status === "incomplete";
      output = "";
      outputSize = 0;
      hadError = false;
      emitStatus("running");
      const result = new Promise((resolve, reject) => {
        current = { resolve, reject, started: performance.now() };
      });
      if (continued) push(source + "\n");
      else {
        module.FS.writeFile("/workspace/.run.stl", source + "\n");
        push("!include .run.stl\n");
      }
      return result;
    },
    input(text) {
      push(text + "\n");
      emitStatus("running");
    },
    coordinate(x, y, key = " ") {
      const next = coordinate;
      coordinate = undefined;
      emitStatus("running");
      next?.([x, y, key.charCodeAt(0) || 32]);
    },
    inspect() {
      if (status !== "ready")
        throw new Error("Inspection requires a ready session.");
      module.inspection = [];
      module.inspectionStack = [];
      module._web_inspect();
      return module.inspection;
    },
    listFiles() {
      return module.FS.readdir("/workspace")
        .filter((name) => !name.startsWith("."))
        .sort();
    },
    readFile(name) {
      return module.FS.readFile("/workspace/" + fileName(name), {
        encoding: "utf8",
      });
    },
    writeFile(name, content) {
      module.FS.writeFile("/workspace/" + fileName(name), content);
    },
  };
}
