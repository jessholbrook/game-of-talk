import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Vox Automata setup", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Vox Automata<\/title>/i);
  assert.match(html, /Vox Automata/);
  assert.doesNotMatch(html, /Game of Talk|A speaking instrument/);
  assert.match(html, /Begin with microphone/);
  assert.match(html, /Use autonomous mode/);
  assert.match(html, /How should this talk feel\?/);
  assert.match(
    html,
    /Your words affect the local environment, growing a representation of your talk/,
  );
  assert.match(html, /All local\. Nothing is transcribed, recorded, or sent anywhere/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("ships a private, browser-local microphone experience", async () => {
  const response = await render();
  const html = await response.text();

  assert.match(html, /Projector boost/);
  assert.match(html, /Terminal/);
  assert.match(html, /Meditative/);
  for (const feel of ["Glacial", "Tidal", "Staccato", "Overgrown"]) {
    assert.match(html, new RegExp(feel));
  }
  for (const palette of ["Sodium", "Bone", "Ultraviolet", "Rosewood"]) {
    assert.match(html, new RegExp(palette));
  }
  assert.match(html, /Custom colors/);
  assert.match(html, /Cell color/);
  assert.match(html, /Background color/);
  assert.doesNotMatch(html, /api[_-]?key|speech[- ]to[- ]text|transcript/i);
});
