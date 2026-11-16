import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const webFiles = [];

function collectWebFiles(directory, relativePath = "") {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const source = join(directory, entry.name);
    const path = join(relativePath, entry.name);
    if (entry.isDirectory()) collectWebFiles(source, path);
    else webFiles.push({ path, contents: readFileSync(source) });
  }
}

collectWebFiles(join(root, "web"));
const hash = createHash("sha256")
  .update(readFileSync(new URL(import.meta.url)));
for (const source of ["pearson.c", "pearson.h", "regression.c", "confidence.c"]) {
  hash.update(readFileSync(join(root, "src", source)));
}
for (const { path, contents } of webFiles) hash.update(path).update(contents);
const version = hash.digest("hex").slice(0, 12);

const wasmDirectory = new URL("../dist/assets/wasm/", import.meta.url);
mkdirSync(wasmDirectory, { recursive: true });

const args = [
  "src/pearson.c", "src/regression.c", "src/confidence.c", "-std=c11", "-O2", "-Wall", "-Wextra", "-Werror", "--no-entry",
  "-sMODULARIZE=1", "-sEXPORT_ES6=1", "-sENVIRONMENT=web,node", "-sALLOW_MEMORY_GROWTH=1",
  "-sEXPORTED_FUNCTIONS=_pearson,_linear_regression,_regression_predict,_confidence_interval,_malloc,_free",
  "-sEXPORTED_RUNTIME_METHODS=HEAPF64",
  "-o", `dist/assets/wasm/pearson-${version}.js`,
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

for (const { path, contents } of webFiles) {
  const destination = join(root, "dist", path);
  mkdirSync(dirname(destination), { recursive: true });
  let output = contents;
  if ([".html", ".css", ".js"].includes(extname(path))) {
    output = contents.toString("utf8")
      .replaceAll("./wasm/pearson.js", `./wasm/pearson-${version}.js`)
      .replace(/(["'])(\.\/[^"'<>]+\.(?:js|css))\1/g,
        (_match, quote, url) => `${quote}${url}?v=${version}${quote}`);
  }
  writeFileSync(destination, output);
}

console.log(`Build ${version} concluído em dist/.`);
