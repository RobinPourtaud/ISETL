# Contributing

Use Node.js 22.12 or newer. Run `npm ci` and `npm run dev` from the repository root.

The frontend is in `apps/web`; the reusable interpreter API is in `packages/runtime`. Keep browser UI code out of the runtime package. Preserve the historical directories unchanged; compatibility patches belong in `scripts/build-wasm.py` or the C bridges under `packages/runtime/wasm`.

Before submitting a change:

```sh
npm test
npm run build
```

If you change the C bridge or build patches, rebuild with Emscripten 4.0.15 using `npm run build:wasm`, include the updated generated files, and rerun the checks. Tests exercise the actual WebAssembly interpreter and the packaged worker API.

For frontend changes, also check these workflows in a browser:

- Edit a file, run it, select code, and run only that selection.
- Switch files and verify source, undo history, and autosave.
- Run the input example; enter `12;` in the console.
- Run the drawing example; expand and restore the results panel.
- Inspect two sets, change the operation, and play or scrub the animation.
- Resize the split, use the result tabs with a keyboard, and check a narrow window.
- Stop an infinite program, Reset, and verify another program runs.

Report bugs with the smallest ISETL program that reproduces the problem, expected and actual output, and browser version. Distinguish interpreter behavior from editor or rendering issues.

Retain all historical attribution. See `NOTICE.md` for the archive’s licensing status; this repository does not apply a new license to the original interpreter. Robin’s bird mark is a maker credit, not the ISETL application icon.

## Ways to help

Small contributions are welcome: runnable mathematical examples, clearer error messages, keyboard and touch usability, accessibility, browser compatibility, and corrections to the documentation. Open an issue before a large runtime or interface change so the scope can be discussed.

Keep pull requests focused. Describe the problem, the resulting behavior, and how you checked it. Include before/after screenshots for visible changes. New original contributions use the MIT license; preserve the separate notices on historical and third-party code.
