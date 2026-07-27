import assert from "node:assert/strict";
import test from "node:test";
import {
  createGrid,
  createRng,
  downsampleFossil,
  getMosaicLayout,
  injectFieldPattern,
  injectSpores,
  populationDensity,
  stepGrid,
} from "../lib/life.mjs";

function gridFromPoints(width, height, points) {
  const grid = new Uint8Array(width * height);
  for (const [x, y] of points) grid[y * width + x] = 1;
  return grid;
}

test("a block still life remains stable without mutation", () => {
  const source = gridFromPoints(6, 6, [
    [2, 2],
    [3, 2],
    [2, 3],
    [3, 3],
  ]);
  const result = stepGrid(source, 6, 6, { rng: createRng(1) });
  assert.deepEqual(result, source);
  assert.notEqual(result, source);
});

test("a blinker has a period of two", () => {
  const source = gridFromPoints(7, 7, [
    [3, 2],
    [3, 3],
    [3, 4],
  ]);
  const first = stepGrid(source, 7, 7, { rng: createRng(2) });
  const second = stepGrid(first, 7, 7, { rng: createRng(3) });
  assert.deepEqual(second, source);
});

test("empty and tiny grids stay safe", () => {
  assert.deepEqual(stepGrid(new Uint8Array(), 0, 0), new Uint8Array());
  assert.deepEqual(stepGrid(new Uint8Array([0]), 1, 1), new Uint8Array([0]));
  assert.deepEqual(stepGrid(new Uint8Array(4), 2, 2), new Uint8Array(4));
});

test("seeded creation and spores are deterministic", () => {
  const first = createGrid(12, 8, 0.2, createRng(99));
  const second = createGrid(12, 8, 0.2, createRng(99));
  assert.deepEqual(first, second);

  const options = {
    x: 0.4,
    y: 0.7,
    energy: 0.8,
    texture: 0.5,
    flux: 0.9,
  };
  assert.deepEqual(
    injectSpores(first, 12, 8, { ...options, rng: createRng(22) }),
    injectSpores(second, 12, 8, { ...options, rng: createRng(22) }),
  );
});

test("feel patterns are deterministic and spatially distinct", () => {
  const source = new Uint8Array(48 * 30);
  const styles = [
    "slab",
    "orbit",
    "spores",
    "wave",
    "burst",
    "scatter",
    "lightning",
    "branch",
  ];
  const outputs = styles.map((style) =>
    injectFieldPattern(source, 48, 30, {
      style,
      x: 0.46,
      y: 0.52,
      energy: 0.72,
      texture: 0.58,
      flux: 0.76,
      phase: 1.35,
      rng: createRng(204),
    }),
  );

  styles.forEach((style, index) => {
    const repeated = injectFieldPattern(source, 48, 30, {
      style,
      x: 0.46,
      y: 0.52,
      energy: 0.72,
      texture: 0.58,
      flux: 0.76,
      phase: 1.35,
      rng: createRng(204),
    });
    assert.deepEqual(outputs[index], repeated);
    assert.notEqual(outputs[index], source);
    assert.ok(populationDensity(outputs[index]) > 0);
  });

  assert.equal(
    new Set(outputs.map((output) => Buffer.from(output).toString("base64"))).size,
    styles.length,
  );
  assert.deepEqual(source, new Uint8Array(48 * 30));
});

test("expanded neighbor rules create distinct evolution", () => {
  const source = gridFromPoints(9, 9, [
    [4, 4],
    [5, 4],
  ]);
  const standard = stepGrid(source, 9, 9, { rng: createRng(4) });
  const expansive = stepGrid(source, 9, 9, {
    birthTwoChance: 1,
    survivalOneChance: 1,
    rng: createRng(4),
  });

  assert.notDeepEqual(expansive, standard);
  assert.ok(populationDensity(expansive) > populationDensity(standard));
});

test("probabilities clamp and never produce invalid cell values", () => {
  const source = createGrid(10, 10, 0.4, createRng(10));
  const result = stepGrid(source, 10, 10, {
    survivalFourChance: 4,
    mortality: -3,
    backgroundBirthChance: Number.NaN,
    rng: createRng(11),
  });
  assert.equal(result.length, 100);
  assert.ok(Array.from(result).every((cell) => cell === 0 || cell === 1));
  assert.ok(populationDensity(result) >= 0 && populationDensity(result) <= 1);
});

test("fossils are normalized, immutable snapshots", () => {
  const source = createGrid(18, 18, 0.2, createRng(44));
  const ages = new Uint8Array(18 * 18).fill(40);
  const fossil = downsampleFossil(source, ages, 18, 18, 9);
  const saved = new Uint8Array(fossil);
  source.fill(0);
  ages.fill(0);

  assert.equal(fossil.length, 81);
  assert.deepEqual(fossil, saved);
  assert.ok(Array.from(fossil).some((value) => value > 0));
});

test("mosaic layout handles empty, narrow, and talk-length archives", () => {
  assert.deepEqual(getMosaicLayout(0), { columns: 1, rows: 1 });
  assert.deepEqual(getMosaicLayout(1), { columns: 1, rows: 1 });
  const narrow = getMosaicLayout(30, 0.4);
  const wide = getMosaicLayout(30, 16 / 9);
  assert.ok(narrow.columns * narrow.rows >= 30);
  assert.ok(wide.columns * wide.rows >= 30);
  assert.ok(wide.columns > narrow.columns);
});
