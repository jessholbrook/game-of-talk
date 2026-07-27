/**
 * Deterministic helpers for the cellular field.
 * Grid values are 0 for dead and 1 for alive.
 */

export function createRng(seed = 1) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function createGrid(width, height, density = 0.14, rng = Math.random) {
  const safeWidth = Math.max(0, Math.floor(width));
  const safeHeight = Math.max(0, Math.floor(height));
  const safeDensity = clamp(density, 0, 1);
  const grid = new Uint8Array(safeWidth * safeHeight);

  for (let index = 0; index < grid.length; index += 1) {
    grid[index] = rng() < safeDensity ? 1 : 0;
  }

  return grid;
}

export function stepGrid(
  source,
  width,
  height,
  {
    survivalFourChance = 0,
    mortality = 0,
    backgroundBirthChance = 0,
    rng = Math.random,
  } = {},
) {
  const safeWidth = Math.max(0, Math.floor(width));
  const safeHeight = Math.max(0, Math.floor(height));
  const output = new Uint8Array(safeWidth * safeHeight);

  if (!safeWidth || !safeHeight || source.length < safeWidth * safeHeight) {
    return output;
  }

  const surviveFour = clamp(survivalFourChance, 0, 1);
  const deathChance = clamp(mortality, 0, 1);
  const backgroundBirth = clamp(backgroundBirthChance, 0, 1);

  for (let y = 0; y < safeHeight; y += 1) {
    for (let x = 0; x < safeWidth; x += 1) {
      let neighbors = 0;

      for (let yOffset = -1; yOffset <= 1; yOffset += 1) {
        for (let xOffset = -1; xOffset <= 1; xOffset += 1) {
          if (!xOffset && !yOffset) continue;
          const wrappedX = (x + xOffset + safeWidth) % safeWidth;
          const wrappedY = (y + yOffset + safeHeight) % safeHeight;
          neighbors += source[wrappedY * safeWidth + wrappedX] ? 1 : 0;
        }
      }

      const index = y * safeWidth + x;
      const alive = source[index] === 1;
      const survives =
        alive &&
        (neighbors === 2 ||
          neighbors === 3 ||
          (neighbors === 4 && rng() < surviveFour));
      const born =
        !alive &&
        (neighbors === 3 ||
          (neighbors <= 1 && backgroundBirth > 0 && rng() < backgroundBirth));

      output[index] = (survives || born) && rng() >= deathChance ? 1 : 0;
    }
  }

  return output;
}

export function injectSpores(
  source,
  width,
  height,
  {
    x = 0.5,
    y = 0.5,
    energy = 0.5,
    texture = 0.5,
    flux = 0,
    rng = Math.random,
  } = {},
) {
  const output = new Uint8Array(source);
  const safeWidth = Math.max(0, Math.floor(width));
  const safeHeight = Math.max(0, Math.floor(height));
  if (!safeWidth || !safeHeight || output.length < safeWidth * safeHeight) {
    return output;
  }

  const safeEnergy = clamp(energy, 0, 1);
  const safeTexture = clamp(texture, 0, 1);
  const safeFlux = clamp(flux, 0, 1);
  const centerX = Math.round(clamp(x, 0, 1) * (safeWidth - 1));
  const centerY = Math.round(clamp(y, 0, 1) * (safeHeight - 1));
  const radius = 2 + Math.round(safeEnergy * 8 + safeTexture * 5);
  const count = 3 + Math.round(safeEnergy * 18 + safeFlux * 8);

  for (let index = 0; index < count; index += 1) {
    const angle = rng() * Math.PI * 2;
    const distance =
      Math.pow(rng(), safeTexture > 0.55 ? 0.55 : 1.8) * radius;
    const cellX =
      (centerX + Math.round(Math.cos(angle) * distance) + safeWidth) %
      safeWidth;
    const cellY =
      (centerY + Math.round(Math.sin(angle) * distance) + safeHeight) %
      safeHeight;
    output[cellY * safeWidth + cellX] = 1;
  }

  if (safeFlux > 0.58) {
    const motifs = [
      [
        [0, 0],
        [1, 0],
        [2, 0],
        [2, 1],
        [1, 2],
      ],
      [
        [1, 0],
        [0, 1],
        [1, 1],
        [2, 1],
        [1, 2],
      ],
    ];
    const motif = motifs[Math.floor(rng() * motifs.length)];
    for (const [offsetX, offsetY] of motif) {
      const cellX = (centerX + offsetX - 1 + safeWidth) % safeWidth;
      const cellY = (centerY + offsetY - 1 + safeHeight) % safeHeight;
      output[cellY * safeWidth + cellX] = 1;
    }
  }

  return output;
}

export function downsampleFossil(
  cells,
  ages,
  width,
  height,
  fossilSize = 18,
) {
  const size = Math.max(1, Math.floor(fossilSize));
  const fossil = new Uint8Array(size * size);
  if (!width || !height || cells.length < width * height) return fossil;

  let maximum = 1;
  for (let fossilY = 0; fossilY < size; fossilY += 1) {
    for (let fossilX = 0; fossilX < size; fossilX += 1) {
      const startX = Math.floor((fossilX / size) * width);
      const endX = Math.max(startX + 1, Math.floor(((fossilX + 1) / size) * width));
      const startY = Math.floor((fossilY / size) * height);
      const endY = Math.max(startY + 1, Math.floor(((fossilY + 1) / size) * height));
      let total = 0;
      let samples = 0;

      for (let y = startY; y < Math.min(endY, height); y += 1) {
        for (let x = startX; x < Math.min(endX, width); x += 1) {
          const index = y * width + x;
          total += cells[index] ? 1 : Math.min(ages[index] ?? 0, 8) / 16;
          samples += 1;
        }
      }

      const value = samples ? Math.round((total / samples) * 255) : 0;
      fossil[fossilY * size + fossilX] = value;
      maximum = Math.max(maximum, value);
    }
  }

  const scale = Math.min(1.75, 210 / maximum);
  for (let index = 0; index < fossil.length; index += 1) {
    fossil[index] = Math.min(255, Math.round(fossil[index] * scale));
  }
  return fossil;
}

export function getMosaicLayout(count, aspect = 16 / 9) {
  if (count <= 0) return { columns: 1, rows: 1 };
  if (count === 1) return { columns: 1, rows: 1 };
  const columns = Math.max(1, Math.ceil(Math.sqrt(count * Math.max(aspect, 0.25))));
  return { columns, rows: Math.ceil(count / columns) };
}

export function populationDensity(grid) {
  if (!grid.length) return 0;
  let population = 0;
  for (const cell of grid) population += cell ? 1 : 0;
  return population / grid.length;
}

export function clamp(value, minimum, maximum) {
  const finite = Number.isFinite(value) ? value : minimum;
  return Math.min(maximum, Math.max(minimum, finite));
}
