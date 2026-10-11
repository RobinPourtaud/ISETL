import { mkdir, cp, readFile, writeFile } from "node:fs/promises";
const base = new URL("../packages/runtime/", import.meta.url);
await mkdir(new URL("dist/assets", base), { recursive: true });
for (const name of ["isetl.js", "isetl.wasm", "library.js"])
  await cp(
    new URL("generated/" + name, base),
    new URL("dist/assets/" + name, base),
  );
const engine = (
  await readFile(new URL("src/engine.js", base), "utf8")
).replaceAll("../generated/", "./assets/");
await writeFile(new URL("dist/engine.js", base), engine);
await cp(new URL("src/engine.d.ts", base), new URL("dist/engine.d.ts", base));
const index = new URL("dist/index.js", base);
await writeFile(
  index,
  (await readFile(index, "utf8")).replaceAll("./worker.ts", "./worker.js"),
);

for (const name of ["LICENSE", "LICENSE-LEGACY.txt", "NOTICE.md"])
  await cp(new URL("../" + name, import.meta.url), new URL("dist/" + name, base));
