export interface Workspace {
  active: string;
  files: Record<string, string>;
}
const key = "isetl-web.workspace.v1";
export function loadWorkspace(): Workspace | undefined {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "null");
    if (
      !value ||
      typeof value.active !== "string" ||
      !value.files ||
      typeof value.files !== "object"
    )
      return;
    const files: Record<string, string> = {};
    for (const [name, content] of Object.entries(value.files)) {
      if (
        /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,18}$/.test(name) &&
        typeof content === "string"
      )
        files[name] = content;
    }
    if (!Object.keys(files).length) return;
    return {
      active: value.active in files ? value.active : Object.keys(files)[0],
      files,
    };
  } catch {
    return;
  }
}
export function saveWorkspace(workspace: Workspace): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(workspace));
    return true;
  } catch {
    return false;
  }
}
