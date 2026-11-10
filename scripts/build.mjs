import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const wasmDirectory = new URL("../dist/assets/wasm/", import.meta.url);
mkdirSync(wasmDirectory, { recursive: true });

const args = [
  "src/pearson.c", "-std=c11", "-O2", "-Wall", "-Wextra", "-Werror", "--no-entry",
  "-sMODULARIZE=1", "-sEXPORT_ES6=1", "-sENVIRONMENT=web,node", "-sALLOW_MEMORY_GROWTH=1",
  "-sEXPORTED_FUNCTIONS=_pearson,_malloc,_free", "-sEXPORTED_RUNTIME_METHODS=HEAPF64",
  "-o", "dist/assets/wasm/pearson.js",
];
const options = { cwd: root, stdio: "inherit" };
const compiler = process.platform === "win32"
  ? spawnSync("cmd.exe", ["/d", "/c", "emcc", ...args], options)
  : spawnSync("emcc", args, options);

if (compiler.status !== 0) {
  console.error("A compilação falhou. Confira se o emcc está ativo neste terminal.");
  if (compiler.error) console.error(compiler.error.message);
  process.exit(compiler.status ?? 1);
}

function copyWebFiles(source, destination) {
  mkdirSync(destination, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const from = join(source, entry.name);
    const to = join(destination, entry.name);
    if (entry.isDirectory()) copyWebFiles(from, to);
    else writeFileSync(to, readFileSync(from));
  }
}

copyWebFiles(join(root, "web"), join(root, "dist"));
console.log("Build concluído em dist/.");
