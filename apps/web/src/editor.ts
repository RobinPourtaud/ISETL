import { basicSetup } from "codemirror";
import { EditorView, keymap } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import {
  StreamLanguage,
  HighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import { indentWithTab } from "@codemirror/commands";
import { tags } from "@lezer/highlight";

const keywords = new Set(
  "and choose div do else elseif end exists false for forall from fromb frome func if iff impl in less local mod not notin om opt or print printf proc prog read readf return subset take then to true value where while with write writeln".split(
    " ",
  ),
);
const builtins = new Set(
  "abs arb ceil close cos domain even exp fix float floor graphics image is_boolean is_func is_integer is_map is_number is_om is_set is_string is_tuple log max min npow odd opena openr openw ord origin pow random range sin sqrt str tan draw move scale point textout title_window get_coord thickline".split(
    " ",
  ),
);
const language = StreamLanguage.define({
  token(stream) {
    if (stream.eatSpace()) return null;
    if (stream.match(/^\$.*/)) return "comment";
    if (stream.match(/^!.*/)) return "meta";
    if (stream.match(/^(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/))
      return "string";
    if (stream.match(/^\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/)) return "number";
    if (stream.match(/^[a-zA-Z_][a-zA-Z_0-9]*/)) {
      const word = stream.current();
      return keywords.has(word)
        ? "keyword"
        : builtins.has(word)
          ? "builtin"
          : "variableName";
    }
    if (stream.match(/^(?::=|\/=?|[+*%=<>#?~\-])/)) return "operator";
    stream.next();
    return null;
  },
  languageData: {
    commentTokens: { line: "$" },
    closeBrackets: { brackets: ["(", "[", "{", "'", '"'] },
  },
});
const highlight = HighlightStyle.define([
  { tag: tags.keyword, color: "#985c82" },
  { tag: tags.comment, color: "#6c7b64", fontStyle: "italic" },
  { tag: tags.string, color: "#557644" },
  { tag: tags.number, color: "#b07136" },
  { tag: tags.operator, color: "#4d7569" },
  { tag: tags.standard(tags.variableName), color: "#357d83" },
  { tag: tags.meta, color: "#af7542" },
]);
export function createEditor(
  parent: HTMLElement,
  source: string,
  onChange: (source: string) => void,
  onRun: () => void,
  onCursor: (line: number, column: number, selected: boolean) => void,
) {
  const extensions = [
    basicSetup,
    language,
    syntaxHighlighting(highlight),
    keymap.of([
      {
        key: "Mod-Enter",
        run: () => {
          onRun();
          return true;
        },
      },
      indentWithTab,
    ]),
    EditorView.contentAttributes.of({
      "aria-label": "ISETL source code",
      spellcheck: "false",
    }),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) onChange(update.state.doc.toString());
      if (update.selectionSet || update.docChanged) {
        const position = update.state.selection.main.head;
        const line = update.state.doc.lineAt(position);
        onCursor(
          line.number,
          position - line.from + 1,
          !update.state.selection.main.empty,
        );
      }
    }),
    EditorView.theme({
      "&": { height: "100%", fontSize: "14px", backgroundColor: "#fdfdfb" },
      ".cm-scroller": {
        fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
        lineHeight: "1.65",
      },
      ".cm-content": { padding: "12px 0", caretColor: "#2d6850" },
      ".cm-line": { padding: "0 24px 0 12px" },
      ".cm-gutters": {
        backgroundColor: "#fdfdfb",
        color: "#6c7b64",
        border: "none",
        padding: "0 0 0 10px",
        minWidth: "48px",
      },
      ".cm-gutterElement": { padding: "0 10px 0 4px" },
      ".cm-activeLine": { backgroundColor: "#f3f5ee" },
      ".cm-activeLineGutter": {
        backgroundColor: "transparent",
        color: "#4d7158",
      },
      "&.cm-focused": { outline: "none" },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection":
        { backgroundColor: "#dfe8d8 !important" },
      ".cm-foldGutter": { width: "12px" },
      ".cm-panels": { background: "#f0f2e9", color: "#33433a" },
    }),
  ];
  const createState = (doc: string) => EditorState.create({ doc, extensions });
  return {
    view: new EditorView({ parent, state: createState(source) }),
    createState,
  };
}
