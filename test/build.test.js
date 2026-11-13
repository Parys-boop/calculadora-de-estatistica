import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const dist = new URL("../dist/", import.meta.url);

test("HTML, módulos e WebAssembly usam a mesma versão para evitar arquivos antigos em cache", () => {
  const html = readFileSync(new URL("index.html", dist), "utf8");
  const version = html.match(/assets\/app\.js\?v=([a-f0-9]{12})/)?.[1];
  assert.ok(version, "O HTML precisa carregar uma versão específica do JavaScript.");
  assert.ok(html.includes(`./assets/style.css?v=${version}`));

  const app = readFileSync(new URL("assets/app.js", dist), "utf8");
  for (const dependency of ["display", "pearson"]) {
    assert.ok(app.includes(`"./${dependency}.js?v=${version}"`));
    assert.ok(existsSync(new URL(`assets/${dependency}.js`, dist)));
  }
  const integration = readFileSync(new URL("assets/pearson.js", dist), "utf8");
  const moduleName = `pearson-${version}`;
  assert.ok(integration.includes(`"./wasm/${moduleName}.js?v=${version}"`));
  assert.ok(existsSync(new URL(`assets/wasm/${moduleName}.js`, dist)));
  assert.ok(existsSync(new URL(`assets/wasm/${moduleName}.wasm`, dist)));
});
