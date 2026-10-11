import { createEngine } from "./engine.js";
import type { Request, Response, RuntimeEvent } from "./protocol.js";
let engine: Awaited<ReturnType<typeof createEngine>>;
const send = (message: Response) => postMessage(message);
onmessage = async ({ data }: MessageEvent<Request>) => {
  try {
    if (data.type === "init") {
      engine = await createEngine({
        files: data.files,
        onEvent: (event: RuntimeEvent) => send(event),
      });
      return;
    }
    if (!engine) throw new Error("The interpreter has not initialized.");
    switch (data.type) {
      case "run":
        send({
          type: "reply",
          id: data.id,
          value: await engine.run(data.source),
        });
        break;
      case "input":
        engine.input(data.text);
        break;
      case "coordinate":
        engine.coordinate(data.x, data.y, data.key);
        break;
      case "inspect":
        send({ type: "reply", id: data.id, value: engine.inspect() });
        break;
      case "files":
        send({ type: "reply", id: data.id, value: engine.listFiles() });
        break;
      case "read":
        send({ type: "reply", id: data.id, value: engine.readFile(data.name) });
        break;
      case "write":
        engine.writeFile(data.name, data.content);
        send({ type: "reply", id: data.id });
        break;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if ("id" in data) send({ type: "reply", id: data.id, error: message });
    else send({ type: "error", message });
  }
};

addEventListener("unhandledrejection", (event) => {
  event.preventDefault();
  send({
    type: "error",
    message:
      event.reason instanceof Error
        ? event.reason.message
        : String(event.reason),
  });
});
