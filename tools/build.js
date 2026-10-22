import esbuild from "esbuild";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function build() {
  console.log("Building extension classifier bundle...");
  await esbuild.build({
    entryPoints: [resolve(__dirname, "../src/extension-entry.js")],
    bundle: true,
    outfile: resolve(__dirname, "../classifier.bundle.js"),
    format: "iife",
    platform: "browser",
    target: ["chrome100"],
    minify: false,
    sourcemap: false,
  });
  console.log("Build complete: classifier.bundle.js updated successfully.");
}

build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
