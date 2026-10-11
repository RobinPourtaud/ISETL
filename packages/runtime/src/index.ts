import type {
  Request,
  Response,
  RuntimeEvent,
  RuntimeStatus,
  RunResult,
  Variable,
} from "./protocol.js";
export type {
  InspectedValue,
  DrawCommand,
  RuntimeEvent,
  RuntimeStatus,
  RunResult,
  Variable,
} from "./protocol.js";

type RequestPayload = {
  [K in Extract<Request, { id: number }>["type"]]: Omit<
    Extract<Request, { type: K }>,
    "id"
  >;
}[Extract<Request, { id: number }>["type"]];

export interface IsetlOptions {
  files?: Record<string, string>;
  onEvent?: (event: RuntimeEvent) => void;
  workerFactory?: () => Worker;
  timeoutMs?: number;
}

/** An isolated ISETL session. Call dispose() when its owner is destroyed. */
export class IsetlSession {
  private worker: Worker;
  private sequence = 0;
  private pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();
  private listeners = new Set<(event: RuntimeEvent) => void>();
  private readyResolve!: () => void;
  private readyReject!: (error: Error) => void;
  private timer?: ReturnType<typeof setTimeout>;
  readonly ready: Promise<void>;
  status: RuntimeStatus = "loading";

  constructor(private options: IsetlOptions = {}) {
    this.ready = new Promise((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });
    if (options.onEvent) this.listeners.add(options.onEvent);
    this.worker =
      options.workerFactory?.() ??
      new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    this.worker.onmessage = ({ data }: MessageEvent<Response>) =>
      this.receive(data);
    this.worker.onerror = (event) =>
      this.fail(event.message || "The interpreter worker could not start.");
    this.worker.onmessageerror = () =>
      this.fail("Could not read a message from the interpreter.");
    this.worker.postMessage({
      type: "init",
      files: options.files ?? {},
    } satisfies Request);
  }

  subscribe(listener: (event: RuntimeEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async run(source: string): Promise<RunResult> {
    await this.ready;
    if (this.status !== "ready" && this.status !== "incomplete")
      throw new Error("The session is not ready.");
    this.emit({ type: "status", status: "running" });
    this.armTimeout();
    try {
      return (await this.request({ type: "run", source })) as RunResult;
    } finally {
      clearTimeout(this.timer);
    }
  }

  input(text: string): void {
    if (this.status !== "input")
      throw new Error("The program is not waiting for input.");
    this.emit({ type: "status", status: "running" });
    this.armTimeout();
    this.worker.postMessage({ type: "input", text } satisfies Request);
  }

  coordinate(x: number, y: number, key = " "): void {
    if (this.status !== "coordinate")
      throw new Error("The program is not waiting for a coordinate.");
    this.emit({ type: "status", status: "running" });
    this.armTimeout();
    this.worker.postMessage({
      type: "coordinate",
      x,
      y,
      key,
    } satisfies Request);
  }

  async inspect(): Promise<Variable[]> {
    await this.ready;
    if (this.status !== "ready")
      throw new Error("Inspection requires a ready session.");
    this.emit({ type: "status", status: "running" });
    this.armTimeout();
    try {
      return (await this.request({ type: "inspect" })) as Variable[];
    } finally {
      clearTimeout(this.timer);
      if ((this.status as RuntimeStatus) === "running")
        this.emit({ type: "status", status: "ready" });
    }
  }

  async listFiles(): Promise<string[]> {
    await this.ready;
    return this.request({ type: "files" }) as Promise<string[]>;
  }
  async readFile(name: string): Promise<string> {
    await this.ready;
    return this.request({ type: "read", name }) as Promise<string>;
  }
  async writeFile(name: string, content: string): Promise<void> {
    await this.ready;
    await this.request({ type: "write", name, content });
  }

  stop(): void {
    this.shutdown(
      new Error("Session stopped. Create a new session to run again."),
      "stopped",
    );
  }

  private shutdown(error: Error, status: "stopped" | "error"): void {
    if (this.status === "stopped" || this.status === "error") return;
    this.worker.terminate();
    clearTimeout(this.timer);
    this.readyReject(error);
    for (const request of this.pending.values()) request.reject(error);
    this.pending.clear();
    this.emit({ type: "status", status });
  }

  dispose(): void {
    this.stop();
    this.listeners.clear();
  }

  private request(message: RequestPayload): Promise<unknown> {
    if (this.status === "stopped" || this.status === "error")
      return Promise.reject(new Error("Session is unavailable."));
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ ...message, id });
    });
  }

  private receive(message: Response): void {
    if (this.status === "stopped" || this.status === "error") return;
    if (message.type === "reply") {
      const request = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) request?.reject(new Error(message.error));
      else request?.resolve(message.value);
    } else {
      if (message.type === "status") {
        if (message.status === "ready") this.readyResolve();
        if (message.status === "input" || message.status === "coordinate")
          clearTimeout(this.timer);
      }
      if (message.type === "error") {
        this.fail(message.message);
        return;
      }
      this.emit(message);
    }
  }

  private emit(event: RuntimeEvent): void {
    if (event.type === "status") this.status = event.status;
    for (const listener of this.listeners) listener(event);
  }

  private armTimeout(): void {
    clearTimeout(this.timer);
    const timeout = this.options.timeoutMs ?? 30_000;
    if (timeout > 0)
      this.timer = setTimeout(
        () =>
          this.fail(
            `Execution exceeded ${timeout / 1000} seconds. Reset the session to continue.`,
          ),
        timeout,
      );
  }

  private fail(message: string): void {
    if (this.status === "stopped" || this.status === "error") return;
    this.shutdown(new Error(message), "error");
    this.emit({ type: "error", message });
  }
}
