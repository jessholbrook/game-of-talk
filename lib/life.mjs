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
    survivalOneChance = 0,
    survivalFiveChance = 0,
    birthTwoChance = 0,
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
  const surviveOne = clamp(survivalOneChance, 0, 1);
  const surviveFive = clamp(survivalFiveChance, 0, 1);
  const birthTwo = clamp(birthTwoChance, 0, 1);
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
          (neighbors === 1 && rng() < surviveOne) ||
          (neighbors === 4 && rng() < surviveFour) ||
          (neighbors === 5 && rng() < surviveFive));
      const born =
        !alive &&
        (neighbors === 3 ||
          (neighbors === 2 && rng() < birthTwo) ||
          (neighbors <= 1 && backgroundBirth > 0 && rng() < backgroundBirth));

      output[index] = (survives || born) && rng() >= deathChance ? 1 : 0;
    }
  }

  return output;
}

export function injectFieldPattern(
  source,
  width,
  height,
  {
    style = "spores",
    x = 0.5,
    y = 0.5,
    energy = 0.5,
    texture = 0.5,
    flux = 0,
    phase = 0,
    rng = Math.random,
  } = {},
) {
  const safeWidth = Math.max(0, Math.floor(width));
  const safeHeight = Math.max(0, Math.floor(height));
  const output = new Uint8Array(source);
  if (!safeWidth || !safeHeight || output.length < safeWidth * safeHeight) {
    return output;
  }

  const safeEnergy = clamp(energy, 0, 1);
  const safeTexture = clamp(texture, 0, 1);
  const safeFlux = clamp(flux, 0, 1);
  const centerX = Math.round(clamp(x, 0, 1) * (safeWidth - 1));
  const centerY = Math.round(clamp(y, 0, 1) * (safeHeight - 1));
  const tau = Math.PI * 2;

  const setCell = (cellX, cellY) => {
    const wrappedX = ((Math.round(cellX) % safeWidth) + safeWidth) % safeWidth;
    const wrappedY = ((Math.round(cellY) % safeHeight) + safeHeight) % safeHeight;
    output[wrappedY * safeWidth + wrappedX] = 1;
  };
  const stamp = (cellX, cellY, motif = "corner") => {
    const points =
      motif === "block"
        ? [
            [0, 0],
            [1, 0],
            [0, 1],
            [1, 1],
          ]
        : motif === "cross"
          ? [
              [0, -1],
              [-1, 0],
              [0, 0],
              [1, 0],
              [0, 1],
            ]
          : [
              [0, 0],
              [1, 0],
              [0, 1],
            ];
    for (const [offsetX, offsetY] of points) {
      setCell(cellX + offsetX, cellY + offsetY);
    }
  };

  if (style === "spores") {
    return injectSpores(source, safeWidth, safeHeight, {
      x,
      y,
      energy: safeEnergy,
      texture: safeTexture,
      flux: safeFlux,
      rng,
    });
  }

  if (style === "slab") {
    const fieldCenterX = Math.floor(safeWidth / 2);
    const fieldCenterY = Math.floor(safeHeight / 2);
    const angle = Math.floor(phase / 1.4) * (Math.PI / 4);
    const length = 4 + Math.round(safeEnergy * 9);
    for (let distance = 0; distance <= length; distance += 2) {
      const offsetX = Math.round(Math.cos(angle) * distance);
      const offsetY = Math.round(Math.sin(angle) * distance);
      for (const [signX, signY] of [
        [1, 1],
        [-1, 1],
        [1, -1],
        [-1, -1],
      ]) {
        stamp(
          fieldCenterX + offsetX * signX,
          fieldCenterY + offsetY * signY,
          "block",
        );
      }
    }
    return output;
  }

  if (style === "orbit") {
    const breath = 0.72 + Math.sin(phase * 0.45) * 0.22;
    const radius = (4 + safeEnergy * 9) * breath;
    const pointCount = 9 + Math.round(safeTexture * 7);
    for (let index = 0; index < pointCount; index += 1) {
      const angle = phase * 0.18 + (index / pointCount) * tau;
      stamp(
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius * 0.68,
        index % 4 === 0 ? "block" : "corner",
      );
    }
    const innerRadius = Math.max(2, radius * 0.48);
    for (let index = 0; index < 6; index += 1) {
      const angle = -phase * 0.11 + (index / 6) * tau;
      setCell(
        centerX + Math.cos(angle) * innerRadius,
        centerY + Math.sin(angle) * innerRadius,
      );
    }
    return output;
  }

  if (style === "wave") {
    const amplitude = 3 + safeEnergy * safeHeight * 0.2;
    const frequency = 1.1 + safeTexture * 1.8;
    for (let cellX = 0; cellX < safeWidth; cellX += 3) {
      const progress = cellX / Math.max(1, safeWidth - 1);
      const waveY =
        centerY + Math.sin(progress * tau * frequency + phase) * amplitude;
      stamp(cellX, waveY, cellX % 6 === 0 ? "block" : "corner");
    }
    return output;
  }

  if (style === "burst") {
    const motifs = [
      [
        [0, 0],
        [1, 0],
        [2, 0],
        [2, 1],
        [1, 2],
      ],
      [
        [0, 0],
        [2, 0],
        [0, 1],
        [2, 1],
        [0, 2],
        [1, 2],
        [2, 2],
      ],
      [
        [1, 0],
        [0, 1],
        [1, 1],
        [2, 1],
        [1, 2],
      ],
    ];
    const motif = motifs[Math.abs(Math.floor(phase * 2)) % motifs.length];
    const rotation = Math.abs(Math.floor(phase)) % 4;
    for (const [offsetX, offsetY] of motif) {
      let rotatedX = offsetX - 1;
      let rotatedY = offsetY - 1;
      for (let turn = 0; turn < rotation; turn += 1) {
        [rotatedX, rotatedY] = [-rotatedY, rotatedX];
      }
      setCell(centerX + rotatedX, centerY + rotatedY);
    }
    return output;
  }

  if (style === "scatter") {
    const clusterCount = 4 + Math.round(safeEnergy * 5);
    const spread = 5 + safeTexture * 12;
    for (let index = 0; index < clusterCount; index += 1) {
      const angle = phase + rng() * tau;
      const distance = 2 + rng() * spread;
      stamp(
        centerX + Math.cos(angle) * distance,
        centerY + Math.sin(angle) * distance,
        index % 3 === 0 ? "block" : "corner",
      );
    }
    return output;
  }

  if (style === "lightning") {
    let cellX = centerX;
    let cellY = Math.max(0, centerY - Math.round(safeHeight * 0.34));
    const steps = 12 + Math.round(safeEnergy * 18);
    const horizontalBias = Math.cos(phase) * (0.35 + safeTexture * 0.4);
    const mainPath = [];
    for (let step = 0; step < steps; step += 1) {
      setCell(cellX, cellY);
      mainPath.push([cellX, cellY]);
      const turn = rng();
      if (turn < 0.24 + Math.abs(horizontalBias) * 0.2) {
        cellX += horizontalBias >= 0 ? 1 : -1;
      } else if (turn > 0.82) {
        cellX += rng() > 0.5 ? 1 : -1;
      } else {
        cellY += 1;
      }
    }
    if (safeFlux > 0.42 && mainPath.length > 6) {
      const [branchX, branchY] = mainPath[Math.floor(mainPath.length * 0.55)];
      const direction = horizontalBias >= 0 ? -1 : 1;
      for (let step = 1; step <= 5 + Math.round(safeTexture * 5); step += 1) {
        setCell(branchX + step * direction, branchY + Math.floor(step / 2));
      }
    }
    return output;
  }

  if (style === "branch") {
    const frontier = [];
    for (let cellY = 0; cellY < safeHeight; cellY += 1) {
      for (let cellX = 0; cellX < safeWidth; cellX += 1) {
        if (!source[cellY * safeWidth + cellX]) continue;
        let exposed = false;
        for (let yOffset = -1; yOffset <= 1 && !exposed; yOffset += 1) {
          for (let xOffset = -1; xOffset <= 1; xOffset += 1) {
            if (!xOffset && !yOffset) continue;
            const neighborX = (cellX + xOffset + safeWidth) % safeWidth;
            const neighborY = (cellY + yOffset + safeHeight) % safeHeight;
            if (!source[neighborY * safeWidth + neighborX]) {
              exposed = true;
              break;
            }
          }
        }
        if (exposed) frontier.push([cellX, cellY]);
      }
    }
    if (!frontier.length) frontier.push([centerX, centerY]);
    const rootCount = Math.min(
      frontier.length,
      3 + Math.round(safeEnergy * 4),
    );
    for (let rootIndex = 0; rootIndex < rootCount; rootIndex += 1) {
      const root = frontier[Math.floor(rng() * frontier.length)];
      let cellX = root[0];
      let cellY = root[1];
      const angle = phase * 0.2 + rng() * tau;
      for (let step = 0; step < 4 + Math.round(safeTexture * 5); step += 1) {
        cellX += Math.round(Math.cos(angle + (rng() - 0.5) * 0.9));
        cellY += Math.round(Math.sin(angle + (rng() - 0.5) * 0.9));
        stamp(cellX, cellY, step % 4 === 0 ? "block" : "corner");
      }
    }
    return output;
  }

  return injectSpores(source, safeWidth, safeHeight, {
    x,
    y,
    energy: safeEnergy,
    texture: safeTexture,
    flux: safeFlux,
    rng,
  });
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
