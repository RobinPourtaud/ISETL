import { readdir, readFile, writeFile } from "node:fs/promises";
const files = {};
for (const directory of ["ISETLSRC", "ISETLW"]) {
  for (const name of await readdir(directory)) {
    if (name.endsWith(".STL") && name !== "ISETL.STL")
      files[name.toLowerCase()] = (
        await readFile(`${directory}/${name}`, "latin1")
      )
        .replaceAll("\r\n", "\n")
        .replaceAll("\x1a", "");
  }
}
await writeFile(
  "packages/runtime/generated/library.js",
  `// Original ISETL example and plotting libraries, preserved from the archive.\nexport default ${JSON.stringify(files, null, 2)};\n`,
);
