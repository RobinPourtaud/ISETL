import {
  createIcons,
  Braces,
  Play,
  Square,
  RotateCcw,
  Upload,
  Download,
  Plus,
  ChevronRight,
  ArrowUpRight,
  BookOpen,
  Terminal,
  ChartSpline,
  FolderOpen,
  FileCode2,
  FileText,
  Network,
  Binary,
  Sparkles,
  MessagesSquare,
  Scan,
  X,
  Trash2,
  Pencil,
  Check,
  ArrowUp,
  Menu,
  CircleHelp,
  Leaf,
  Copy,
} from "lucide";
import {
  IsetlSession,
  type RuntimeEvent,
  type RuntimeStatus,
} from "@isetl/runtime";
import { createEditor } from "./editor";
import type { EditorState } from "@codemirror/state";
import { createGraphics } from "./graphics";
import { examples } from "./examples";
import { guide, about } from "./guide";
import { loadWorkspace, saveWorkspace } from "./storage";
import { createSetView } from "./sets";
import robin from "./robin.svg?raw";
import "./style.css";

const icons = {
  Braces,
  Play,
  Square,
  RotateCcw,
  Upload,
  Download,
  Plus,
  ChevronRight,
  ArrowUpRight,
  BookOpen,
  Terminal,
  ChartSpline,
  FolderOpen,
  FileCode2,
  FileText,
  Network,
  Binary,
  Sparkles,
  MessagesSquare,
  Scan,
  X,
  Trash2,
  Pencil,
  Check,
  ArrowUp,
  Menu,
  CircleHelp,
  Leaf,
  Copy,
};
const icon = (name: string) =>
  `<i data-lucide="${name}" aria-hidden="true"></i>`;
const refreshIcons = () =>
  createIcons({ icons, attrs: { "stroke-width": 1.6 } });
type ElementTypes = {
  "#plot": HTMLCanvasElement;
  "#console-input": HTMLInputElement;
  "#filename-input": HTMLInputElement;
  "#file-picker": HTMLInputElement;
  "#run": HTMLButtonElement;
  "#run-selection": HTMLButtonElement;
  "#clear-output": HTMLButtonElement;
  "#info-dialog": HTMLDialogElement;
  "#file-dialog": HTMLDialogElement;
};
const $ = <K extends string>(
  selector: K,
): K extends keyof ElementTypes ? ElementTypes[K] : HTMLElement =>
  document.querySelector(selector) as K extends keyof ElementTypes
    ? ElementTypes[K]
    : HTMLElement;
const workspace = loadWorkspace() ?? {
  active: "playground.stl",
  files: { "playground.stl": examples[0].source },
};
let session: IsetlSession;
let saveTimer: ReturnType<typeof setTimeout>;
let runCount = 0;
let outputNode: HTMLPreElement | undefined;
let outputMeta: HTMLElement | undefined;
let resultTab: "console" | "graphics" | "sets" = "console";
let running = false;
let initialFiles = new Set<string>();
let history: string[] = [];
let historyPosition = 0;

$("#app").innerHTML = `
<header class="topbar">
  <a class="brand" href="#" aria-label="ISETL Web home"><img class="brand-mark" src="${import.meta.env.BASE_URL}brand/isetl-mark.svg" width="36" height="36" alt=""><span>ISETL<span class="brand-web">web</span></span></a>
  <nav aria-label="Main navigation"><button id="workspace-nav" title="Show or hide files">Files</button><button id="guide-nav">Reference</button><button id="about-nav">About</button></nav>
  <a class="source-link" href="https://github.com/RobinPourtaud/ISETL" target="_blank" rel="noopener">Source ${icon("arrow-up-right")}</a>
</header>
<div class="app-shell">
  <aside class="sidebar" aria-label="Workspace sidebar"><div class="sidebar-scroll">
    <div class="sidebar-title"><span>FILES</span><button class="icon-button" id="new-file" title="New file" aria-label="New file">${icon("plus")}</button></div>
    <div id="file-list" class="file-list"></div>
    <button class="sidebar-action" id="import-file">${icon("upload")} Open a file <span>.stl</span></button>
    <input id="file-picker" type="file" accept=".stl,.txt,.isetl" multiple hidden>
    <div class="sidebar-divider"></div>
    <div class="sidebar-title"><span>EXAMPLES</span></div>
    <div class="example-list">${examples.map((example) => `<button class="example-button" data-example="${example.id}" title="${example.description}">${icon(example.icon)}<span>${example.title}</span>${icon("chevron-right")}</button>`).join("")}</div>
    <div class="sidebar-divider"></div>
    <div class="sidebar-title"><span>SESSION FILES</span><button class="icon-button" id="refresh-files" title="Refresh session files" aria-label="Refresh session files">${icon("rotate-ccw")}</button></div>
    <div id="session-files"><p class="sidebar-note">No generated files.</p></div>
  </div><a class="maker-credit" href="https://pourtaud.dev" target="_blank" rel="noopener">${robin}<span>Made by Robin Pourtaud</span></a></aside>
  <main class="main">
    <div class="workspace-toolbar"><div class="workspace-caption"><button class="icon-button mobile-menu" id="mobile-menu" aria-label="Toggle sidebar">${icon("menu")}</button><strong id="active-filename"></strong></div><div class="run-actions"><button class="text-button" id="reset-session" title="Start a fresh interpreter session">${icon("rotate-ccw")} Reset</button><button id="stop" class="stop-button" hidden>${icon("square")} Stop</button><button id="run-selection" class="text-button" disabled title="Run selected code (⌘/Ctrl + Enter)">Run selection</button><button id="run" class="run-button" disabled>${icon("play")} Run file <kbd id="run-shortcut">⌘ ⇧ ↵</kbd></button></div></div>
    <div class="panels">
      <section class="editor-panel panel" aria-label="Code editor"><div class="panel-header"><div class="editor-tab">${icon("file-code-2")}<span id="editor-filename"></span><span class="file-dot" title="Saved locally"></span></div><div class="panel-actions"><button class="icon-button" id="rename-file" title="Rename file" aria-label="Rename file">${icon("pencil")}</button><button class="icon-button" id="download-file" title="Download source" aria-label="Download source">${icon("download")}</button><button class="icon-button" id="delete-file" title="Delete file" aria-label="Delete file">${icon("trash-2")}</button></div></div><div id="editor"></div><div class="editor-footer"><span id="save-state">${icon("check")} Saved in this browser</span><span><span id="cursor">Ln 1, Col 1</span><span class="footer-divider">ISETL</span></span></div></section>
      <div id="panel-resizer" role="separator" tabindex="0" aria-label="Resize editor and results" aria-orientation="vertical" aria-valuemin="30" aria-valuemax="75" aria-valuenow="55"></div>
      <section class="output-panel panel" aria-label="Program results"><div class="panel-header result-header"><div class="result-tabs" role="tablist" aria-label="Results"><button class="result-tab active" id="console-tab" role="tab" aria-selected="true" aria-controls="console-view">${icon("terminal")} Console<span id="console-dot" title="New console output" hidden></span></button><button class="result-tab" id="graphics-tab" role="tab" aria-selected="false" aria-controls="graphics-view">${icon("chart-spline")} Graphics<span id="graphics-dot" hidden></span></button><button class="result-tab" id="sets-tab" role="tab" aria-selected="false" aria-controls="sets-view">${icon("braces")} Sets</button></div><div class="panel-actions"><button class="icon-button" id="expand-results" title="Expand results" aria-label="Expand results" aria-pressed="false">${icon("scan")}</button><button class="icon-button" id="download-output" title="Download output" aria-label="Download output">${icon("download")}</button><button class="icon-button" id="clear-output" title="Clear console" aria-label="Clear console">${icon("trash-2")}</button></div></div>
        <div id="console-view" role="tabpanel" aria-labelledby="console-tab"><div id="console-output" role="log" aria-label="Console output"><div class="console-welcome"><h2>Console</h2><p>Run a file, or enter an expression below.</p><code>{1, 2} + {2, 3};</code></div></div><div id="input-notice" hidden>Waiting for a value. End expressions with a semicolon.</div><form id="console-form"><span class="prompt-symbol">›</span><input id="console-input" aria-label="Console expression or program input" placeholder="Expression, e.g. #A;" autocomplete="off" spellcheck="false" disabled><button type="submit" class="icon-button" aria-label="Evaluate expression">${icon("arrow-up")}</button></form><div class="console-footer">↑ ↓ History · Variables persist until Reset</div></div>
        <div id="graphics-view" role="tabpanel" aria-labelledby="graphics-tab" hidden><div class="graphics-caption"><span id="graphics-title">Graphics</span><button id="download-plot" class="icon-button" title="Download PNG" aria-label="Download PNG">${icon("download")}</button></div><div class="canvas-wrap"><canvas id="plot" tabindex="0" aria-label="ISETL graphics canvas. Click or press a key when the program requests coordinates."></canvas><div id="graphics-empty"><span>∿</span><p>No graphics yet.</p><button class="text-button" data-example="drawing">Open drawing example ${icon("arrow-up-right")}</button></div></div><p id="graphics-hint">Canvas: 960 × 640</p></div>
        <div id="sets-view" role="tabpanel" aria-labelledby="sets-tab" hidden></div>
      </section>
    </div>
    <footer class="statusbar"><span id="runtime-status"><span class="status-dot loading"></span> Starting interpreter…</span><span class="statusbar-right"><button id="help-button" aria-label="Open language guide">${icon("circle-help")}</button></span></footer>
  </main>
</div>
<dialog id="info-dialog"><button class="dialog-close icon-button" aria-label="Close dialog">${icon("x")}</button><div id="dialog-content"></div></dialog>
<dialog id="file-dialog"><button class="dialog-close icon-button" aria-label="Close dialog">${icon("x")}</button><form id="filename-form"><div class="eyebrow">FILES</div><h2 id="filename-title">New file</h2><label for="filename-input">File name</label><input id="filename-input" required pattern="[a-zA-Z0-9][a-zA-Z0-9_.\-]{0,18}" maxlength="19" value="untitled.stl"><p class="subtle">Up to 19 characters, just like the original interpreter.</p><p id="filename-error" class="error-text"></p><button class="run-button" type="submit">Save file ${icon("arrow-up-right")}</button></form></dialog>
<div id="toast" role="status" hidden></div>`;

const { view: editor, createState } = createEditor(
  $("#editor"),
  workspace.files[workspace.active],
  (source) => {
    workspace.files[workspace.active] = source;
    $("#save-state").textContent = "Saving…";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 250);
  },
  () => {
    void runEditor(true);
  },
  (line, column, selected) => {
    $("#run-selection").disabled =
      !selected || running || session?.status !== "ready";
    $("#cursor").textContent = `Ln ${line}, Col ${column}`;
  },
);
const setView = createSetView($("#sets-view"), () => openExample("playground"));
const editorStates = new Map<string, EditorState>();
const graphics = createGraphics($("#plot"), (title) => {
  $("#graphics-title").textContent = title;
});
function persist() {
  const saved = saveWorkspace(workspace);
  $("#save-state").textContent = saved
    ? "✓ Saved in this browser"
    : "Not saved — download a copy";
}
function toast(message: string) {
  $("#toast").textContent = message;
  $("#toast").hidden = false;
  setTimeout(() => {
    $("#toast").hidden = true;
  }, 3800);
}
function renderFiles() {
  const list = $("#file-list");
  list.replaceChildren();
  for (const name of Object.keys(workspace.files)) {
    const button = document.createElement("button");
    button.className =
      "file-button" + (name === workspace.active ? " selected" : "");
    button.innerHTML = icon("file-code-2");
    const label = document.createElement("span");
    label.textContent = name;
    button.append(label);
    button.onclick = () => openFile(name);
    list.append(button);
  }
  $("#active-filename").textContent = workspace.active;
  $("#editor-filename").textContent = workspace.active;
  refreshIcons();
}
function openFile(name: string) {
  editorStates.set(workspace.active, editor.state);
  workspace.active = name;
  const saved = editorStates.get(name);
  editor.setState(
    saved?.doc.toString() === workspace.files[name]
      ? saved
      : createState(workspace.files[name]),
  );
  const position = editor.state.selection.main.head;
  const line = editor.state.doc.lineAt(position);
  $("#cursor").textContent =
    `Ln ${line.number}, Col ${position - line.from + 1}`;
  $("#run-selection").disabled =
    editor.state.selection.main.empty || running || session?.status !== "ready";
  renderFiles();
  persist();
  $(".sidebar").classList.remove("mobile-open");
  editor.focus();
}
function openExample(id: string) {
  const example = examples.find((item) => item.id === id)!;
  let name =
    Object.keys(workspace.files).find(
      (file) => workspace.files[file] === example.source,
    ) ?? `${id}.stl`;
  if (workspace.files[name] && workspace.files[name] !== example.source) {
    let suffix = 2;
    while (workspace.files[`${id}-${suffix}.stl`]) suffix++;
    name = `${id}-${suffix}.stl`;
  }
  workspace.files[name] ??= example.source;
  openFile(name);
  showResults(
    ["drawing", "plot"].includes(id)
      ? "graphics"
      : id === "playground"
        ? "sets"
        : "console",
  );
  editor.focus();
}
function showInfo(content: string) {
  $("#dialog-content").innerHTML = content;
  $("#info-dialog").showModal();
}
function showResults(tab: "console" | "graphics" | "sets") {
  resultTab = tab;
  for (const name of ["console", "graphics", "sets"]) {
    $("#" + name + "-view").hidden = name !== tab;
    $("#" + name + "-tab").classList.toggle("active", name === tab);
    $("#" + name + "-tab").setAttribute("aria-selected", String(name === tab));
    $("#" + name + "-tab").tabIndex = name === tab ? 0 : -1;
  }
  $("#download-output").hidden = tab !== "console";
  $("#clear-output").hidden = tab !== "console";
  if (tab === "graphics") $("#graphics-dot").hidden = true;
  if (tab === "console") $("#console-dot").hidden = true;
  if (tab !== "sets") setView.pause();
}
function appendOutput(text: string) {
  if (resultTab !== "console") $("#console-dot").hidden = false;
  if (!outputNode) startEntry("ISETL");
  outputNode!.append(document.createTextNode(text));
  const container = $("#console-output");
  container.scrollTop = container.scrollHeight;
}
function startEntry(label: string, source?: string) {
  $(".console-welcome")?.remove();
  const entry = document.createElement("div");
  entry.className = "console-entry";
  const header = document.createElement("div");
  header.className = "entry-header";
  const name = document.createElement("span");
  name.textContent = `${String(++runCount).padStart(2, "0")}  ${label}`;
  outputMeta = document.createElement("span");
  outputMeta.textContent = "Running…";
  header.append(name, outputMeta);
  entry.append(header);
  if (source) {
    const code = document.createElement("div");
    code.className = "entry-source";
    code.textContent = "› " + source;
    entry.append(code);
  }
  outputNode = document.createElement("pre");
  entry.append(outputNode);
  $("#console-output").append(entry);
  while ($("#console-output").children.length > 100)
    $("#console-output").firstElementChild?.remove();
}
function setStatus(status: RuntimeStatus) {
  const statuses: Record<RuntimeStatus, string> = {
    loading: "Starting interpreter…",
    ready: "Ready",
    running: "Running…",
    input: "Waiting for input",
    coordinate: "Waiting for a canvas click or key",
    incomplete: "More code needed · continue in the console",
    stopped: "Session stopped · Reset to continue",
    error: "Session ended · Reset to continue",
  };
  const busy = ["running", "input", "coordinate"].includes(status);
  const canRun = ["ready", "incomplete"].includes(status);
  $("#runtime-status").innerHTML =
    `<span class="status-dot ${busy || status === "loading" ? "loading" : ""}"></span>`;
  $("#runtime-status").append(document.createTextNode(statuses[status]));
  $("#run").disabled = !canRun || running;
  $("#run-selection").disabled =
    !canRun || running || editor.state.selection.main.empty;
  $("#stop").hidden = !busy;
  $("#clear-output").disabled = busy;
  $("#console-input").disabled = !(canRun || status === "input");
  $("#input-notice").hidden = status !== "input";
  $("#console-input").placeholder =
    status === "input"
      ? "Enter a value, e.g. 12;"
      : status === "incomplete"
        ? "Continue your code…"
        : "Expression, e.g. #A;";
  if (status === "input") {
    showResults("console");
    $("#console-input").focus();
  }
  if (status === "coordinate") {
    showResults("graphics");
    $("#plot").focus();
  }
  $("#graphics-hint").textContent =
    status === "coordinate"
      ? "Move over the canvas and press a key, or click. The classic plotter uses q to finish."
      : "Canvas: 960 × 640";
}
function onEvent(event: RuntimeEvent) {
  if (event.type === "status") setStatus(event.status);
  if (event.type === "output") appendOutput(event.text);
  if (event.type === "error") {
    appendOutput(`\n${event.message}\n`);
    toast(event.message);
  }
  if (event.type === "draw") {
    graphics.draw(event.commands);
    $("#graphics-empty").hidden = true;
    if (resultTab !== "graphics") $("#graphics-dot").hidden = false;
  }
}
async function resetSession() {
  session?.dispose();
  running = false;
  graphics.clear();
  setView.update([]);
  $("#graphics-empty").hidden = false;
  $("#graphics-title").textContent = "Graphics";
  setStatus("loading");
  const nextSession = new IsetlSession({ files: workspace.files, onEvent });
  session = nextSession;
  try {
    await nextSession.ready;
    const files = await nextSession.listFiles();
    if (session !== nextSession) return;
    initialFiles = new Set(files);
    await refreshSessionFiles();
  } catch (error) {
    toast(String(error));
  }
}
async function syncSourceFiles(target: IsetlSession) {
  for (const [name, source] of Object.entries(workspace.files))
    await target.writeFile(name, source);
}
async function execute(source: string, label: string, consoleSource?: string) {
  if (running || !["ready", "incomplete"].includes(session.status)) return;
  if (!source.trim()) {
    toast("Enter code before running.");
    return;
  }
  const activeSession = session;
  running = true;
  persist();
  if (consoleSource) showResults("console");
  startEntry(label, consoleSource);
  const currentOutput = outputNode!,
    currentMeta = outputMeta!;
  try {
    await syncSourceFiles(activeSession);
    const result = await activeSession.run(source);
    currentMeta.textContent =
      result.status === "incomplete"
        ? "Needs more code"
        : `${result.status === "error" ? "Error · " : ""}${result.duration < 1 ? "< 1" : Math.round(result.duration)} ms`;
    currentMeta.classList.toggle("error-text", result.status === "error");
    if (!currentOutput.textContent)
      currentOutput.textContent =
        result.status === "incomplete"
          ? "Continue this statement in the console, or Reset."
          : "Done.";
    if (session === activeSession && activeSession.status === "ready") {
      setView.update(await activeSession.inspect());
      if (result.status === "error") showResults("console");
    }
    await refreshSessionFiles();
  } catch (error) {
    currentMeta.textContent =
      activeSession.status === "stopped" ? "Stopped" : "Session ended";
    if (!currentOutput.textContent)
      currentOutput.textContent =
        error instanceof Error ? error.message : String(error);
  } finally {
    if (session === activeSession) {
      running = false;
      setStatus(session.status);
    }
  }
}
async function runEditor(useSelection = false) {
  const selection = editor.state.sliceDoc(
    editor.state.selection.main.from,
    editor.state.selection.main.to,
  );
  await execute(
    useSelection && selection ? selection : editor.state.doc.toString(),
    useSelection && selection ? "Selection" : workspace.active,
  );
}
async function refreshSessionFiles() {
  if (!session || !["ready", "incomplete"].includes(session.status)) return;
  const files = await session.listFiles();
  const created = files.filter(
    (name) => !initialFiles.has(name) && !(name in workspace.files),
  );
  const container = $("#session-files");
  container.replaceChildren();
  if (!created.length) {
    container.innerHTML = '<p class="sidebar-note">No generated files.</p>';
    return;
  }
  for (const name of created) {
    const button = document.createElement("button");
    button.className = "file-button";
    button.innerHTML = icon("file-text");
    const label = document.createElement("span");
    label.textContent = name;
    button.append(label);
    button.onclick = async () => {
      try {
        const content = await session.readFile(name);
        showInfo(
          '<div class="eyebrow">SESSION FILE</div><h2 id="session-file-title"></h2><pre class="file-preview" id="session-file-content"></pre><button class="run-button" id="export-session-file">Download file</button>',
        );
        $("#session-file-title").textContent = name;
        $("#session-file-content").textContent = content;
        $("#export-session-file").onclick = () => download(name, content);
      } catch (error) {
        toast(String(error));
      }
    };
    container.append(button);
  }
  refreshIcons();
}
function download(name: string, content: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
let fileAction: "new" | "rename" = "new";
function fileDialog(action: "new" | "rename") {
  fileAction = action;
  $("#filename-title").textContent =
    action === "new" ? "New file" : "Rename file";
  $("#filename-input").value =
    action === "new" ? "untitled.stl" : workspace.active;
  $("#filename-error").textContent = "";
  $("#file-dialog").showModal();
  $("#filename-input").select();
}
$("#filename-form").onsubmit = (event) => {
  event.preventDefault();
  const name = $("#filename-input").value.trim().toLowerCase();
  if (
    name in workspace.files &&
    !(fileAction === "rename" && name === workspace.active)
  ) {
    $("#filename-error").textContent =
      "There is already a file with this name.";
    return;
  }
  const content =
    fileAction === "rename" ? workspace.files[workspace.active] : "";
  if (fileAction === "rename") delete workspace.files[workspace.active];
  workspace.files[name] = content;
  openFile(name);
  $("#file-dialog").close();
  editor.focus();
};
$("#run").onclick = () => {
  void runEditor();
};
$("#run-selection").onclick = () => {
  void runEditor(true);
};
$("#stop").onclick = () => {
  session.stop();
  toast("Program stopped. Reset starts a fresh session.");
};
$("#reset-session").onclick = () => {
  void resetSession();
  toast("Session reset.");
};
$("#new-file").onclick = () => fileDialog("new");
$("#rename-file").onclick = () => fileDialog("rename");
$("#delete-file").onclick = () => {
  const name = workspace.active;
  showInfo(
    '<div class="eyebrow">FILES</div><h2>Remove this file?</h2><p id="delete-message"></p><button class="run-button" id="confirm-delete">Delete file</button>',
  );
  $("#delete-message").textContent =
    `Remove ${name} from this browser? Download a copy first if you want to keep it.`;
  $("#confirm-delete").onclick = () => {
    delete workspace.files[name];
    if (!Object.keys(workspace.files).length)
      workspace.files["untitled.stl"] = "";
    openFile(Object.keys(workspace.files)[0]);
    $("#info-dialog").close();
    toast(`${name} removed.`);
  };
};
$("#download-file").onclick = () =>
  download(workspace.active, editor.state.doc.toString());
$("#download-output").onclick = () =>
  download("isetl-session.txt", $("#console-output").innerText);
$("#import-file").onclick = () => $("#file-picker").click();
$("#file-picker").onchange = async () => {
  for (const file of Array.from($("#file-picker").files ?? [])) {
    if (file.size > 1_000_000) {
      toast(`${file.name} is too large (maximum 1 MB).`);
      continue;
    }
    let name =
      file.name
        .toLowerCase()
        .replace(/[^a-z0-9_.-]/g, "_")
        .replace(/^[^a-z0-9]+/, "")
        .slice(0, 19) || "imported.stl";
    if (name in workspace.files) {
      let n = 2;
      const stem = name.replace(/\.[^.]+$/, "").slice(0, 12);
      while (`${stem}-${n}.stl` in workspace.files) n++;
      name = `${stem}-${n}.stl`;
    }
    workspace.files[name] = await file.text();
    openFile(name);
  }
  $("#file-picker").value = "";
};
$("#refresh-files").onclick = () => {
  void refreshSessionFiles();
};
$("#console-tab").onclick = () => showResults("console");
$("#graphics-tab").onclick = () => showResults("graphics");
$("#sets-tab").onclick = () => showResults("sets");
$("#clear-output").onclick = () => {
  $("#console-output").replaceChildren();
  outputNode = undefined;
};
$("#console-form").onsubmit = (event) => {
  event.preventDefault();
  const input = $("#console-input");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  history.push(text);
  historyPosition = history.length;
  if (session.status === "input") {
    appendOutput(`› ${text}\n`);
    session.input(text);
  } else {
    void execute(
      text.startsWith("!") || text.endsWith(";") ? text : text + ";",
      "Console",
      text,
    );
  }
};
$("#console-input").onkeydown = (event) => {
  if (event.key === "ArrowUp" && historyPosition > 0) {
    event.preventDefault();
    $("#console-input").value = history[--historyPosition];
  }
  if (event.key === "ArrowDown") {
    event.preventDefault();
    historyPosition = Math.min(history.length, historyPosition + 1);
    $("#console-input").value = history[historyPosition] ?? "";
  }
};
let pointer = { x: 480, y: 320 };
$("#plot").onpointermove = (event) => {
  const bounds = $("#plot").getBoundingClientRect();
  const scale = Math.min(bounds.width / 960, bounds.height / 640);
  pointer = {
    x: Math.max(
      0,
      Math.min(
        959,
        (event.clientX - bounds.left - (bounds.width - 960 * scale) / 2) /
          scale,
      ),
    ),
    y: Math.max(
      0,
      Math.min(
        639,
        (event.clientY - bounds.top - (bounds.height - 640 * scale) / 2) /
          scale,
      ),
    ),
  };
};
$("#plot").onclick = () => {
  if (session.status === "coordinate") session.coordinate(pointer.x, pointer.y);
};
$("#plot").onkeydown = (event) => {
  if (
    session.status === "coordinate" &&
    event.key.length === 1 &&
    !event.metaKey &&
    !event.ctrlKey
  ) {
    event.preventDefault();
    session.coordinate(pointer.x, pointer.y, event.key);
  }
};
$("#download-plot").onclick = () => {
  const anchor = document.createElement("a");
  anchor.download = "isetl-plot.png";
  anchor.href = $("#plot").toDataURL();
  anchor.click();
};
$("#mobile-menu").onclick = () => $(".sidebar").classList.toggle("mobile-open");
for (const id of ["guide-nav", "help-button"])
  $("#" + id).onclick = () => showInfo(guide);
$("#about-nav").onclick = () => showInfo(about);
$("#workspace-nav").onclick = () =>
  $(".app-shell").classList.toggle("hide-sidebar");
document
  .querySelectorAll<HTMLButtonElement>("[data-example]")
  .forEach((button) => {
    button.onclick = () => openExample(button.dataset.example!);
  });
document
  .querySelectorAll<HTMLButtonElement>(".dialog-close")
  .forEach((button) => {
    button.onclick = () => button.closest("dialog")!.close();
  });
document.querySelectorAll<HTMLDialogElement>("dialog").forEach((dialog) => {
  dialog.onclick = (event) => {
    if (event.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        event.clientX < r.left ||
        event.clientX > r.right ||
        event.clientY < r.top ||
        event.clientY > r.bottom
      )
        dialog.close();
    }
  };
});
window.addEventListener("beforeunload", () => {
  persist();
  session?.dispose();
});
if (!/Mac|iPhone|iPad/.test(navigator.platform))
  $("#run-shortcut").textContent = "Ctrl ⇧ ↵";
let split = 55;
const resizer = $("#panel-resizer");
const resize = (value: number) => {
  const width = $(".panels").clientWidth;
  split = Math.min(
    75,
    100 - (310 / width) * 100,
    Math.max(30, (280 / width) * 100, value),
  );
  $(".panels").style.setProperty("--editor-width", split + "%");
  resizer.setAttribute("aria-valuenow", String(Math.round(split)));
};
resizer.onpointerdown = (event) => {
  resizer.setPointerCapture(event.pointerId);
};
resizer.onpointermove = (event) => {
  if (!resizer.hasPointerCapture(event.pointerId)) return;
  const bounds = $(".panels").getBoundingClientRect();
  resize(((event.clientX - bounds.left) / bounds.width) * 100);
};
resizer.onkeydown = (event) => {
  if (["ArrowLeft", "ArrowRight", "Home"].includes(event.key)) {
    event.preventDefault();
    resize(
      event.key === "Home" ? 55 : split + (event.key === "ArrowLeft" ? -5 : 5),
    );
  }
};
resizer.ondblclick = () => resize(55);
$("#expand-results").onclick = () => {
  const expanded = $(".panels").classList.toggle("results-expanded");
  $("#expand-results").setAttribute("aria-pressed", String(expanded));
  const label = expanded ? "Restore split view" : "Expand results";
  $("#expand-results").setAttribute("aria-label", label);
  $("#expand-results").title = label;
};
document
  .querySelectorAll<HTMLElement>(".result-tab")
  .forEach((tab, index, tabs) => {
    tab.onkeydown = (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
        return;
      event.preventDefault();
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? tabs.length - 1
            : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
              tabs.length;
      tabs[next].click();
      tabs[next].focus();
    };
  });
document.addEventListener("keydown", (event) => {
  if (
    (event.metaKey || event.ctrlKey) &&
    event.shiftKey &&
    event.key === "Enter"
  ) {
    event.preventDefault();
    void runEditor();
  }
});
showResults("console");
renderFiles();
persist();
refreshIcons();
void resetSession();
