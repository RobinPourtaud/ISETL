export interface InspectedValue {
  type: string;
  key: number;
  label: string;
  size: number;
  origin: number;
  items: InspectedValue[];
  truncated: boolean;
}
export interface Variable {
  name: string;
  value: InspectedValue;
}
export type RuntimeStatus =
  | "loading"
  | "ready"
  | "running"
  | "input"
  | "coordinate"
  | "incomplete"
  | "stopped"
  | "error";
export interface DrawCommand {
  op: number;
  a?: number;
  b?: number;
  c?: number;
  d?: number;
  text?: string;
}
export interface RunResult {
  output: string;
  duration: number;
  status: "ok" | "error" | "incomplete";
}
export type RuntimeEvent =
  | { type: "status"; status: RuntimeStatus }
  | { type: "output"; text: string }
  | { type: "draw"; commands: DrawCommand[] }
  | { type: "error"; message: string };
export type Request =
  | { type: "init"; files: Record<string, string> }
  | { type: "run"; id: number; source: string }
  | { type: "input"; text: string }
  | { type: "coordinate"; x: number; y: number; key?: string }
  | { type: "inspect"; id: number }
  | { type: "files"; id: number }
  | { type: "write"; id: number; name: string; content: string }
  | { type: "read"; id: number; name: string };
export type Response =
  RuntimeEvent | { type: "reply"; id: number; value?: unknown; error?: string };
