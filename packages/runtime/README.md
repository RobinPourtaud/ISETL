# @isetl/runtime

A reusable TypeScript API around the original ISETL interpreter, compiled to WebAssembly. Each `IsetlSession` owns a dedicated module worker, its interpreter state, and an in-memory filesystem. It needs no server, SharedArrayBuffer, or cross-origin isolation headers.

## Browser usage

Build this package with `npm run build -w @isetl/runtime` from the repository root. Import it from a bundler that supports module workers and WebAssembly URL assets, such as Vite:

```ts
import { IsetlSession } from "@isetl/runtime";

const isetl = new IsetlSession({
  files: { "helpers.stl": "square := func(x); return x*x; end;" },
  onEvent(event) {
    if (event.type === "output") console.log(event.text);
    if (event.type === "status" && event.status === "input") {
      // Obtain a value from your application's input UI.
      isetl.input("12;");
    }
    if (event.type === "draw") renderGraphics(event.commands);
  },
});

await isetl.ready;
const result = await isetl.run("!include helpers.stl\nsquare(7);");
console.log(result.output); // 49;
await isetl.run("square(9);"); // Definitions survive between runs.

isetl.dispose();
```

`renderGraphics` is your renderer. The web app's `apps/web/src/graphics.ts` is a dependency-free Canvas 2D implementation you can reuse. Omit that branch if your app only uses the text interpreter.

## API

| Method or property            | Behavior                                                                                                                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ready`                       | Resolves when the interpreter can accept code; rejects on initialization failure.                                                                                             |
| `run(source)`                 | Executes source and resolves to `{ output, duration, status }`. Duration is wall time in milliseconds, including interactive waits. Status is `ok`, `error`, or `incomplete`. |
| `input(text)`                 | Supplies input to `read` or `readf`. For `read`, include the expression's semicolon.                                                                                          |
| `coordinate(x, y, key = ' ')` | Resumes `get_coord()`. Coordinates use a 960 × 640 canvas. The optional single character supports the classic plotting library.                                               |
| `inspect()`                   | Reads bounded variable snapshots while the session is ready; uses native ISETL equality.                                                                                      |
| `listFiles()`                 | Lists files in the session, including bundled libraries.                                                                                                                      |
| `readFile(name)`              | Reads a file as UTF-8 text.                                                                                                                                                   |
| `writeFile(name, text)`       | Creates or replaces a virtual file.                                                                                                                                           |
| `subscribe(listener)`         | Adds an event listener; returns an unsubscribe function.                                                                                                                      |
| `status`                      | `loading`, `ready`, `running`, `input`, `coordinate`, `incomplete`, `stopped`, or `error`.                                                                                    |
| `stop()`                      | Terminates the worker immediately and rejects outstanding requests.                                                                                                           |
| `dispose()`                   | Stops the worker and removes listeners.                                                                                                                                       |

A stopped session cannot be resumed; create another. The caller owns persistence. Run one program at a time; concurrent `run()` calls are rejected. An incomplete statement can be continued with another `run()` call. Syntax/runtime errors are returned as language diagnostics in `result.output`; transport failures, stops, and timeouts reject the promise.

Options include `timeoutMs` (30,000 by default; `0` disables the timer) and `workerFactory` (for custom worker loading or a host adapter). Timeouts pause while waiting for input or coordinates. Output is limited to 1 MB per execution. WebAssembly memory is limited to 256 MB, including a 64 MB default interpreter allocation limit. The original `!memory` command can change the latter within the module's overall limit.

Events are discriminated by `type`: `status`, `output`, `draw`, and `error`. Output and graphics are batched. A graphics command has `{ op, a?, b?, c?, d?, text? }`:

| op    | Action                                        |
| ----- | --------------------------------------------- |
| 0     | Clear to white                                |
| 1     | Move pen to `(a, b)`                          |
| 2     | Draw from the pen to `(a, b)`                 |
| 3 / 4 | Outline / fill rectangle `(a, b)` to `(c, d)` |
| 5     | Set copy mode (`a = 0`) or XOR mode (`a = 1`) |
| 6     | Set line width to `a`                         |
| 7     | Draw `text` at the pen                        |
| 8     | Set graphics title to `text`                  |
| 9     | Set text scale to `a`                         |

Host API filenames are normalized to lowercase and limited to 19 characters to match the archived interpreter. Program file paths are case-sensitive in the virtual filesystem; use lowercase when referring to imported files and bundled libraries.

## Variable inspection

`await session.inspect()` returns `Variable[]`, each with `{ name, value }`. Values contain `type`, `label`, `key`, `items`, `size`, `origin`, and `truncated`. Equal values share a `key` within one snapshot, using the interpreter’s equality (including numeric coercion and unordered sets). Keys are not stable across snapshots. `size` is the full collection cardinality, while `items` can be a bounded preview. `origin` is meaningful for tuples.

Inspection is read-only and rejects while executing, waiting for input, or completing an unfinished statement. It includes at most 128 defined, unlocked variables and visits at most 1,024 members, with 80 members per collection and three collection levels. Labels can be abbreviated. Check `truncated` before treating `items` as a complete set. The execution timeout also bounds inspection.

## Port details

`scripts/build-wasm.py` copies the uppercase historical sources into `.build/isetl`, fixes obsolete declarations, and compiles them with Emscripten. `wasm/platform.c` adapts asynchronous console input and the platform graphics operations. Asyncify suspends the interpreter during `read`, `readf`, `get_coord`, and `delay` without blocking the page. The frontend never evaluates ISETL source as JavaScript.

Whole submissions are evaluated through a virtual source file, so the full original parser is used. Default interactive `read`/`readf` is redirected to console input; explicit `from file` remains unchanged. This is an intentional difference from running a batch source file in the historical terminal interpreter.

The bundled `.stl` libraries come from `ISETLSRC/` and `ISETLW/`. Line endings and DOS EOF markers are normalized for the browser. Their language code is otherwise preserved.

The engine is the archived portable ISETL 3 source. It is not a binary emulation of `ISETLW.EXE`. Shell execution and native window/editor commands are unavailable. Canvas text uses a browser monospace font and approximate historical metrics. The archived parser, arithmetic, ordering, and their original limits remain in place.

## License

The new runtime layer is MIT licensed. The bundled interpreter and historical libraries are excluded from that grant and retain their original notices. The original manual permits copying subject to a restriction against sale for profit. See `dist/LICENSE`, `dist/LICENSE-LEGACY.txt`, and `dist/NOTICE.md` in the built package.
