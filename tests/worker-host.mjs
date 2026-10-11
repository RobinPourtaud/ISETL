import { parentPort, workerData } from "node:worker_threads";
globalThis.onmessage = null;
globalThis.postMessage = (data) => parentPort.postMessage(data);
globalThis.addEventListener = (name, handler) => {
  if (name === "unhandledrejection")
    process.on("unhandledRejection", (reason) =>
      handler({ reason, preventDefault() {} }),
    );
};
await import(workerData?.moduleURL ?? "../packages/runtime/dist/worker.js");
parentPort.on("message", (data) => globalThis.onmessage({ data }));
