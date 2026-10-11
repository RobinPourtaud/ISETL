import type { RuntimeEvent, RunResult, Variable } from "./protocol.js";
export function fileName(name: string): string;
export interface Engine {
  run(source: string): Promise<RunResult>;
  input(text: string): void;
  coordinate(x: number, y: number, key?: string): void;
  inspect(): Variable[];
  listFiles(): string[];
  readFile(name: string): string;
  writeFile(name: string, content: string): void;
}
export function createEngine(options?: {
  files?: Record<string, string>;
  onEvent?: (event: RuntimeEvent) => void;
  wasmBinary?: Uint8Array;
}): Promise<Engine>;
