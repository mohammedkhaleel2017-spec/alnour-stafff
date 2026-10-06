#!/usr/bin/env node
/**
 * Nitro bundles `@electric-sql/pglite` but drops its WASM/data sidecar files.
 * Vercel then fails with ENOENT `/var/task/_libs/pglite.data`. Copy them next
 * to the bundled module so the published app can boot when DATABASE_URL is
 * not yet injected.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const srcDir = join(root, "node_modules", "@electric-sql", "pglite", "dist");
const destDir = join(root, ".vercel", "output", "functions", "__server.func", "_libs");

if (!existsSync(destDir)) {
  console.log("[pglite-assets] no Vercel function output — skip");
  process.exit(0);
}

const bundledModule = join(destDir, "electric-sql__pglite.mjs");
if (!existsSync(bundledModule)) {
  console.log(`[pglite-assets] bundled PGlite module not found at ${bundledModule} — skip`);
  process.exit(0);
}

mkdirSync(destDir, { recursive: true });
for (const name of ["pglite.data", "pglite.wasm", "initdb.wasm"]) {
  const from = join(srcDir, name);
  if (!existsSync(from)) {
    console.error(`[pglite-assets] missing ${from}`);
    process.exit(1);
  }
  copyFileSync(from, join(destDir, name));
  console.log(`[pglite-assets] copied ${name}`);
}
