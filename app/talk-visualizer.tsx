"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createGrid,
  createRng,
  downsampleFossil,
  getMosaicLayout,
  injectSpores,
  populationDensity,
  stepGrid,
} from "@/lib/life.mjs";

type Phase = "setup" | "live" | "finished";
type Mood =
  | "glacial"
  | "meditative"
  | "balanced"
  | "tidal"
  | "staccato"
  | "restless"
  | "electric"
  | "overgrown";
type Palette =
  | "terminal"
  | "ember"
  | "ice"
  | "sodium"
  | "bone"
  | "ultraviolet"
  | "rosewood";
type MicStatus =
  | "idle"
  | "requesting"
  | "listening"
  | "quiet"
  | "paused"
  | "demo"
  | "denied";

type Fossil = {
  id: number;
  cells: number[];
  elapsed: number;
};

type AudioFeatures = {
  level: number;
  brightness: number;
  flux: number;
  texture: number;
};

const GRID_WIDTH = 96;
const GRID_HEIGHT = 60;
const FOSSIL_SIZE = 18;
const MINUTE_MS = 60_000;

type MoodConfig = {
  label: string;
  stepMs: number;
  mutationMs: number;
  sensitivity: number;
  decay: number;
  driftBase: number;
  driftBrightness: number;
  radiusMin: number;
  radiusMax: number;
  densityCap: number;
  survivalFourScale: number;
  backgroundBirth: number;
  trailGain: number;
  trailFade: number;
  silenceFade: number;
  injectionGate: "voice" | "accent";
};

const MOODS: Record<Mood, MoodConfig> = {
  glacial: {
    label: "Glacial",
    stepMs: 205,
    mutationMs: 285,
    sensitivity: 0.82,
    decay: 0.0015,
    driftBase: 0.016,
    driftBrightness: 0.025,
    radiusMin: 0.1,
    radiusMax: 0.18,
    densityCap: 0.24,
    survivalFourScale: 0.24,
    backgroundBirth: 0.0005,
    trailGain: 12,
    trailFade: 2,
    silenceFade: 6,
    injectionGate: "voice",
  },
  meditative: {
    label: "Meditative",
    stepMs: 150,
    mutationMs: 190,
    sensitivity: 0.72,
    decay: 0.003,
    driftBase: 0.034,
    driftBrightness: 0.05,
    radiusMin: 0.14,
    radiusMax: 0.3,
    densityCap: 0.25,
    survivalFourScale: 0.15,
    backgroundBirth: 0.0007,
    trailGain: 16,
    trailFade: 3,
    silenceFade: 8,
    injectionGate: "voice",
  },
  balanced: {
    label: "Balanced",
    stepMs: 108,
    mutationMs: 145,
    sensitivity: 0.9,
    decay: 0.005,
    driftBase: 0.045,
    driftBrightness: 0.085,
    radiusMin: 0.16,
    radiusMax: 0.4,
    densityCap: 0.28,
    survivalFourScale: 0.16,
    backgroundBirth: 0.0008,
    trailGain: 18,
    trailFade: 4,
    silenceFade: 9,
    injectionGate: "voice",
  },
  tidal: {
    label: "Tidal",
    stepMs: 128,
    mutationMs: 175,
    sensitivity: 0.96,
    decay: 0.004,
    driftBase: 0.03,
    driftBrightness: 0.045,
    radiusMin: 0.3,
    radiusMax: 0.46,
    densityCap: 0.26,
    survivalFourScale: 0.18,
    backgroundBirth: 0.0008,
    trailGain: 16,
    trailFade: 4,
    silenceFade: 8,
    injectionGate: "voice",
  },
  staccato: {
    label: "Staccato",
    stepMs: 88,
    mutationMs: 235,
    sensitivity: 1.18,
    decay: 0.014,
    driftBase: 0.11,
    driftBrightness: 0.15,
    radiusMin: 0.16,
    radiusMax: 0.34,
    densityCap: 0.18,
    survivalFourScale: 0.06,
    backgroundBirth: 0.0003,
    trailGain: 22,
    trailFade: 7,
    silenceFade: 14,
    injectionGate: "accent",
  },
  restless: {
    label: "Restless",
    stepMs: 82,
    mutationMs: 112,
    sensitivity: 1.08,
    decay: 0.007,
    driftBase: 0.075,
    driftBrightness: 0.12,
    radiusMin: 0.17,
    radiusMax: 0.42,
    densityCap: 0.27,
    survivalFourScale: 0.13,
    backgroundBirth: 0.0008,
    trailGain: 20,
    trailFade: 5,
    silenceFade: 10,
    injectionGate: "voice",
  },
  electric: {
    label: "Electric",
    stepMs: 64,
    mutationMs: 95,
    sensitivity: 1.25,
    decay: 0.009,
    driftBase: 0.1,
    driftBrightness: 0.16,
    radiusMin: 0.2,
    radiusMax: 0.46,
    densityCap: 0.29,
    survivalFourScale: 0.12,
    backgroundBirth: 0.0009,
    trailGain: 24,
    trailFade: 6,
    silenceFade: 12,
    injectionGate: "voice",
  },
  overgrown: {
    label: "Overgrown",
    stepMs: 138,
    mutationMs: 105,
    sensitivity: 0.78,
    decay: 0.0022,
    driftBase: 0.022,
    driftBrightness: 0.035,
    radiusMin: 0.12,
    radiusMax: 0.29,
    densityCap: 0.34,
    survivalFourScale: 0.32,
    backgroundBirth: 0.0014,
    trailGain: 15,
    trailFade: 3,
    silenceFade: 6,
    injectionGate: "voice",
  },
};

const PALETTES: Record<
  Palette,
  { label: string; ground: string; hot: string; life: string; dim: string }
> = {
  terminal: {
    label: "Terminal",
    ground: "oklch(0.105 0.008 145)",
    hot: "oklch(0.93 0.12 124)",
    life: "oklch(0.82 0.17 145)",
    dim: "oklch(0.34 0.055 145)",
  },
  ember: {
    label: "Ember",
    ground: "oklch(0.115 0.014 35)",
    hot: "oklch(0.91 0.15 72)",
    life: "oklch(0.78 0.18 38)",
    dim: "oklch(0.35 0.065 35)",
  },
  ice: {
    label: "Ice",
    ground: "oklch(0.115 0.012 245)",
    hot: "oklch(0.91 0.11 185)",
    life: "oklch(0.79 0.14 215)",
    dim: "oklch(0.36 0.06 235)",
  },
  sodium: {
    label: "Sodium",
    ground: "oklch(0.108 0.01 85)",
    hot: "oklch(0.95 0.07 105)",
    life: "oklch(0.84 0.14 92)",
    dim: "oklch(0.36 0.05 85)",
  },
  bone: {
    label: "Bone",
    ground: "oklch(0.105 0.006 75)",
    hot: "oklch(0.97 0.012 95)",
    life: "oklch(0.88 0.025 85)",
    dim: "oklch(0.36 0.025 75)",
  },
  ultraviolet: {
    label: "Ultraviolet",
    ground: "oklch(0.108 0.012 300)",
    hot: "oklch(0.93 0.075 325)",
    life: "oklch(0.8 0.14 300)",
    dim: "oklch(0.36 0.05 300)",
  },
  rosewood: {
    label: "Rosewood",
    ground: "oklch(0.108 0.012 355)",
    hot: "oklch(0.92 0.09 25)",
    life: "oklch(0.8 0.14 355)",
    dim: "oklch(0.36 0.05 355)",
  },
};

const PALETTE_ORDER = Object.keys(PALETTES) as Palette[];

const EMPTY_FEATURES: AudioFeatures = {
  level: 0,
  brightness: 0.5,
  flux: 0,
  texture: 0.35,
};

function formatTime(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function getStatusLabel(status: MicStatus) {
  if (status === "listening") return "Listening";
  if (status === "quiet") return "Quiet, field decaying";
  if (status === "paused") return "Response paused";
  if (status === "demo") return "Autonomous mode";
  if (status === "requesting") return "Connecting microphone";
  if (status === "denied") return "Microphone unavailable";
  return "Ready";
}

function FossilCanvas({
  fossil,
  palette,
  label,
}: {
  fossil: Fossil;
  palette: Palette;
  label: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    canvas.width = FOSSIL_SIZE;
    canvas.height = FOSSIL_SIZE;
    context.clearRect(0, 0, FOSSIL_SIZE, FOSSIL_SIZE);
    const color = PALETTES[palette].life;
    for (let index = 0; index < fossil.cells.length; index += 1) {
      const value = fossil.cells[index] / 255;
      if (value <= 0.04) continue;
      context.globalAlpha = 0.12 + value * 0.88;
      context.fillStyle = color;
      context.fillRect(index % FOSSIL_SIZE, Math.floor(index / FOSSIL_SIZE), 1, 1);
    }
    context.globalAlpha = 1;
  }, [fossil, palette]);

  return <canvas ref={canvasRef} className="fossil-canvas" aria-label={label} role="img" />;
}

export function TalkVisualizer() {
  const shellRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<Uint8Array>(createGrid(GRID_WIDTH, GRID_HEIGHT, 0.12, createRng(481)));
  const agesRef = useRef<Uint8Array>(new Uint8Array(GRID_WIDTH * GRID_HEIGHT));
  const rngRef = useRef(createRng(90210));
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previousSpectrumRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const featureRef = useRef<AudioFeatures>(EMPTY_FEATURES);
  const phaseRef = useRef<Phase>("setup");
  const pausedRef = useRef(false);
  const demoRef = useRef(false);
  const elapsedRef = useRef(0);
  const lastMinuteRef = useRef(0);
  const lastFrameRef = useRef(0);
  const lastStepRef = useRef(0);
  const lastMutationRef = useRef(0);
  const lastVoiceRef = useRef(0);
  const flowRef = useRef({ angle: 0.4, radius: 0.18 });
  const intensityRef = useRef(1);
  const fossilIdRef = useRef(0);
  const fossilsRef = useRef<Fossil[]>([]);
  const uiTimerRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<Phase>("setup");
  const [mood, setMood] = useState<Mood>("balanced");
  const [palette, setPalette] = useState<Palette>("terminal");
  const [projectorBoost, setProjectorBoost] = useState(true);
  const [micStatus, setMicStatus] = useState<MicStatus>("idle");
  const [micError, setMicError] = useState("");
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [fossils, setFossils] = useState<Fossil[]>([]);
  const [intensity, setIntensity] = useState(1);
  const [controlsHidden, setControlsHidden] = useState(false);

  const moodConfig = MOODS[mood];
  const mosaicLayout = useMemo(
    () => getMosaicLayout(fossils.length, 16 / 9),
    [fossils.length],
  );

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    intensityRef.current = intensity;
  }, [intensity]);

  useEffect(() => {
    fossilsRef.current = fossils;
  }, [fossils]);

  const captureFossil = useCallback(() => {
    const cells = downsampleFossil(
      gridRef.current,
      agesRef.current,
      GRID_WIDTH,
      GRID_HEIGHT,
      FOSSIL_SIZE,
    );
    const fossil: Fossil = {
      id: fossilIdRef.current,
      cells: Array.from(cells),
      elapsed: elapsedRef.current,
    };
    fossilIdRef.current += 1;
    setFossils((current) => [...current, fossil]);
    return fossil;
  }, []);

  const reseed = useCallback(() => {
    gridRef.current = createGrid(
      GRID_WIDTH,
      GRID_HEIGHT,
      0.105,
      rngRef.current,
    );
    agesRef.current.fill(0);
  }, []);

  const stopAudio = useCallback(() => {
    for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    streamRef.current = null;
    analyserRef.current = null;
    previousSpectrumRef.current = null;
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== "closed") void context.close();
  }, []);

  const beginTalk = useCallback(
    async (demo = false) => {
      setMicError("");
      demoRef.current = demo;
      if (!demo) {
        setMicStatus("requesting");
        try {
          if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
            throw new Error("This browser does not expose local microphone analysis.");
          }
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            },
          });
          const context = new AudioContext();
          await context.resume();
          const source = context.createMediaStreamSource(stream);
          const analyser = context.createAnalyser();
          analyser.fftSize = 2048;
          analyser.smoothingTimeConstant = 0.72;
          source.connect(analyser);
          streamRef.current = stream;
          audioContextRef.current = context;
          analyserRef.current = analyser;
          stream.getAudioTracks()[0]?.addEventListener("ended", () => {
            setMicStatus("denied");
            setMicError("The microphone disconnected. The field is still alive.");
          });
          setMicStatus("listening");
        } catch {
          setMicStatus("denied");
          setMicError(
            "Microphone access is off. Enable it in the browser settings, then retry, or use autonomous mode.",
          );
          return;
        }
      } else {
        setMicStatus("demo");
      }

      elapsedRef.current = 0;
      lastMinuteRef.current = 0;
      lastFrameRef.current = performance.now();
      lastStepRef.current = lastFrameRef.current;
      lastMutationRef.current = lastFrameRef.current;
      lastVoiceRef.current = lastFrameRef.current;
      fossilIdRef.current = 0;
      setElapsed(0);
      setFossils([]);
      setPaused(false);
      setPhase("live");
    },
    [],
  );

  const finishTalk = useCallback(() => {
    if (
      elapsedRef.current > 0 &&
      (fossilsRef.current.length === 0 ||
        elapsedRef.current - lastMinuteRef.current > 500)
    ) {
      captureFossil();
    }
    setPaused(true);
    setMicStatus("paused");
    setPhase("finished");
    stopAudio();
  }, [captureFossil, stopAudio]);

  const resetTalk = useCallback(() => {
    stopAudio();
    reseed();
    elapsedRef.current = 0;
    lastMinuteRef.current = 0;
    fossilIdRef.current = 0;
    setElapsed(0);
    setFossils([]);
    setPaused(false);
    setMicStatus("idle");
    setMicError("");
    setPhase("setup");
  }, [reseed, stopAudio]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await shellRef.current?.requestFullscreen();
      }
    } catch {
      setMicError("Fullscreen needs a direct click. The visualization is still running.");
    }
  }, []);

  const cyclePalette = useCallback(() => {
    setPalette((current) => {
      const currentIndex = PALETTE_ORDER.indexOf(current);
      return PALETTE_ORDER[(currentIndex + 1) % PALETTE_ORDER.length];
    });
  }, []);

  const downloadMosaic = useCallback(() => {
    if (!fossils.length) return;
    const tileSize = 180;
    const gutter = 12;
    const header = 70;
    const canvas = document.createElement("canvas");
    canvas.width = mosaicLayout.columns * tileSize + (mosaicLayout.columns + 1) * gutter;
    canvas.height =
      header + mosaicLayout.rows * tileSize + (mosaicLayout.rows + 1) * gutter;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.fillStyle = PALETTES[palette].ground;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = PALETTES[palette].life;
    context.font = "18px monospace";
    context.fillText(
      `GAME OF TALK  /  ${formatTime(elapsedRef.current)}  /  ${fossils.length} BLOCKS`,
      gutter,
      38,
    );

    fossils.forEach((fossil, fossilIndex) => {
      const column = fossilIndex % mosaicLayout.columns;
      const row = Math.floor(fossilIndex / mosaicLayout.columns);
      const offsetX = gutter + column * (tileSize + gutter);
      const offsetY = header + gutter + row * (tileSize + gutter);
      const cellSize = tileSize / FOSSIL_SIZE;
      fossil.cells.forEach((value, cellIndex) => {
        if (value < 10) return;
        context.globalAlpha = 0.12 + (value / 255) * 0.88;
        context.fillRect(
          offsetX + (cellIndex % FOSSIL_SIZE) * cellSize,
          offsetY + Math.floor(cellIndex / FOSSIL_SIZE) * cellSize,
          Math.ceil(cellSize),
          Math.ceil(cellSize),
        );
      });
    });
    context.globalAlpha = 1;
    const link = document.createElement("a");
    link.download = "game-of-talk-mosaic.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [fossils, mosaicLayout, palette]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;
    let animationFrame = 0;
    let uiUpdateAt = 0;

    const analyzeAudio = (now: number): AudioFeatures => {
      const analyser = analyserRef.current;
      if (!analyser) {
        if (!demoRef.current || phaseRef.current !== "live") return EMPTY_FEATURES;
        const phrase = (Math.sin(now / 1900) + 1) / 2;
        const pulse = Math.max(0, Math.sin(now / 320));
        return {
          level: 0.18 + phrase * 0.55,
          brightness: 0.32 + Math.sin(now / 2800) * 0.22,
          flux: pulse > 0.92 ? pulse : 0.12,
          texture: 0.35 + Math.sin(now / 1100) * 0.18,
        };
      }

      const timeData = new Uint8Array(analyser.fftSize);
      const spectrum = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteTimeDomainData(timeData);
      analyser.getByteFrequencyData(spectrum);

      let sumSquares = 0;
      for (const sample of timeData) {
        const normalized = (sample - 128) / 128;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / timeData.length);
      const level = Math.min(1, Math.max(0, (rms - 0.012) * 9.5));

      let weightedFrequency = 0;
      let spectrumTotal = 0;
      let highBand = 0;
      let lowBand = 0;
      let flux = 0;
      const previous = previousSpectrumRef.current;
      for (let index = 1; index < spectrum.length; index += 1) {
        const magnitude = spectrum[index] / 255;
        weightedFrequency += index * magnitude;
        spectrumTotal += magnitude;
        if (index < spectrum.length * 0.18) lowBand += magnitude;
        if (index > spectrum.length * 0.35) highBand += magnitude;
        if (previous) flux += Math.max(0, spectrum[index] - previous[index]) / 255;
      }
      previousSpectrumRef.current = spectrum;
      const centroid = spectrumTotal
        ? weightedFrequency / spectrumTotal / spectrum.length
        : 0.3;
      const texture = highBand / Math.max(1, highBand + lowBand);
      const target = {
        level,
        brightness: Math.min(1, centroid * 3.2),
        flux: Math.min(1, flux / 18),
        texture: Math.min(1, texture * 2.4),
      };
      const previousFeatures = featureRef.current;
      const smoothing = target.level > previousFeatures.level ? 0.2 : 0.06;
      return {
        level: previousFeatures.level + (target.level - previousFeatures.level) * smoothing,
        brightness:
          previousFeatures.brightness +
          (target.brightness - previousFeatures.brightness) * 0.08,
        flux: previousFeatures.flux + (target.flux - previousFeatures.flux) * 0.28,
        texture:
          previousFeatures.texture + (target.texture - previousFeatures.texture) * 0.08,
      };
    };

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const nextWidth = Math.max(1, Math.floor(bounds.width * dpr));
      const nextHeight = Math.max(1, Math.floor(bounds.height * dpr));
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }
    };

    const draw = (now: number) => {
      resizeCanvas();
      const delta = Math.min(50, Math.max(0, now - (lastFrameRef.current || now)));
      lastFrameRef.current = now;
      const active = phaseRef.current === "live" && !pausedRef.current;

      if (active) {
        elapsedRef.current += delta;
        if (elapsedRef.current - lastMinuteRef.current >= MINUTE_MS) {
          lastMinuteRef.current += MINUTE_MS;
          captureFossil();
        }
      }

      const features = active ? analyzeAudio(now) : EMPTY_FEATURES;
      featureRef.current = features;
      const voiceActive = features.level > 0.055;
      if (voiceActive) lastVoiceRef.current = now;
      const silenceDuration = now - lastVoiceRef.current;

      const accentPassed =
        moodConfig.injectionGate === "voice" ||
        features.flux > 0.22 ||
        features.level > 0.55;
      if (
        active &&
        now - lastMutationRef.current > moodConfig.mutationMs &&
        voiceActive &&
        accentPassed
      ) {
        lastMutationRef.current = now;
        const flow = flowRef.current;
        flow.angle +=
          moodConfig.driftBase +
          features.brightness * moodConfig.driftBrightness;
        flow.radius =
          moodConfig.radiusMin +
          features.texture * (moodConfig.radiusMax - moodConfig.radiusMin);
        const x = 0.5 + Math.cos(flow.angle * 0.71) * flow.radius;
        const y = 0.5 + Math.sin(flow.angle) * flow.radius;
        gridRef.current = injectSpores(gridRef.current, GRID_WIDTH, GRID_HEIGHT, {
          x,
          y,
          energy: Math.min(1, features.level * moodConfig.sensitivity * intensityRef.current),
          texture: features.texture,
          flux: features.flux,
          rng: rngRef.current,
        });
      }

      if (now - lastStepRef.current > moodConfig.stepMs) {
        lastStepRef.current = now;
        const density = populationDensity(gridRef.current);
        const silenceDecay =
          active && silenceDuration > 900
            ? Math.min(0.045, moodConfig.decay + silenceDuration / 300_000)
            : 0;
        gridRef.current = stepGrid(gridRef.current, GRID_WIDTH, GRID_HEIGHT, {
          survivalFourChance: active
            ? features.level * moodConfig.survivalFourScale
            : 0.015,
          mortality:
            silenceDecay + (density > moodConfig.densityCap ? 0.025 : 0),
          backgroundBirthChance:
            active && density < 0.075 && silenceDuration < 8_000
              ? moodConfig.backgroundBirth
              : 0,
          rng: rngRef.current,
        });

        for (let index = 0; index < gridRef.current.length; index += 1) {
          agesRef.current[index] = gridRef.current[index]
            ? Math.min(255, agesRef.current[index] + moodConfig.trailGain)
            : Math.max(
                0,
                agesRef.current[index] -
                  (silenceDuration > 1800
                    ? moodConfig.silenceFade
                    : moodConfig.trailFade),
              );
        }
      }

      const computed = getComputedStyle(shellRef.current ?? document.documentElement);
      const ground = computed.getPropertyValue("--ground").trim() || "#0d120e";
      context.fillStyle = ground;
      context.fillRect(0, 0, canvas.width, canvas.height);

      const cellWidth = canvas.width / GRID_WIDTH;
      const cellHeight = canvas.height / GRID_HEIGHT;
      const cellSize = Math.max(1, Math.min(cellWidth, cellHeight));
      const drawWidth = cellSize * GRID_WIDTH;
      const drawHeight = cellSize * GRID_HEIGHT;
      const offsetX = (canvas.width - drawWidth) / 2;
      const offsetY = (canvas.height - drawHeight) / 2;
      const colors = PALETTES[palette];
      const boost = projectorBoost ? 1 : 0.82;

      for (let index = 0; index < gridRef.current.length; index += 1) {
        const alive = gridRef.current[index] === 1;
        const age = agesRef.current[index] / 255;
        if (!alive && age < 0.035) continue;
        const x = index % GRID_WIDTH;
        const y = Math.floor(index / GRID_WIDTH);
        const isHot = alive && age < 0.34 && features.flux > 0.38;
        context.globalAlpha = Math.min(1, (alive ? 0.5 + age * 0.5 : age * 0.28) * boost);
        context.fillStyle = isHot ? colors.hot : alive ? colors.life : colors.dim;
        const inset = cellSize > 5 ? Math.max(0.5, cellSize * 0.12) : 0.25;
        context.fillRect(
          offsetX + x * cellSize + inset,
          offsetY + y * cellSize + inset,
          Math.max(0.6, cellSize - inset * 2),
          Math.max(0.6, cellSize - inset * 2),
        );
      }
      context.globalAlpha = 1;

      if (now > uiUpdateAt) {
        uiUpdateAt = now + 250;
        setElapsed(elapsedRef.current);
        if (phaseRef.current === "live" && !pausedRef.current) {
          setMicStatus(
            demoRef.current ? "demo" : voiceActive ? "listening" : "quiet",
          );
        }
      }
      animationFrame = requestAnimationFrame(draw);
    };

    animationFrame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationFrame);
  }, [captureFossil, moodConfig, palette, projectorBoost]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (phaseRef.current !== "live") return;
      const key = event.key.toLowerCase();
      if (key === "p") {
        setPaused((current) => !current);
      } else if (key === "b") {
        captureFossil();
      } else if (key === "r") {
        reseed();
      } else if (key === "-") {
        setIntensity((current) => Math.max(0.5, Number((current - 0.1).toFixed(1))));
      } else if (key === "=" || key === "+") {
        setIntensity((current) => Math.min(1.8, Number((current + 0.1).toFixed(1))));
      } else if (key === "c") {
        cyclePalette();
      } else if (key === "h") {
        setControlsHidden((current) => !current);
      } else if (key === "f") {
        void toggleFullscreen();
      } else if (key === "e") {
        finishTalk();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [captureFossil, cyclePalette, finishTalk, reseed, toggleFullscreen]);

  useEffect(() => {
    return () => {
      if (uiTimerRef.current) window.clearTimeout(uiTimerRef.current);
      stopAudio();
    };
  }, [stopAudio]);

  const wakeControls = () => {
    if (controlsHidden && document.fullscreenElement) setControlsHidden(false);
    if (uiTimerRef.current) window.clearTimeout(uiTimerRef.current);
    if (document.fullscreenElement && phase === "live") {
      uiTimerRef.current = window.setTimeout(() => setControlsHidden(true), 2600);
    }
  };

  const displayStatus = paused && phase === "live" ? "paused" : micStatus;

  return (
    <main
      ref={shellRef}
      className={`visualizer palette-${palette} phase-${phase} ${
        controlsHidden ? "controls-hidden" : ""
      }`}
      onPointerMove={wakeControls}
      data-testid="visualizer"
    >
      <canvas
        ref={canvasRef}
        className="life-field"
        role="img"
        aria-label={`Abstract cellular visualizer. ${getStatusLabel(
          displayStatus,
        )}. ${fossils.length} minute blocks saved.`}
      />
      <div className="scanlines" aria-hidden="true" />

      {phase === "setup" && (
        <section className="setup-panel" aria-labelledby="setup-title">
          <div className="wordmark" aria-hidden="true">
            <span>G</span>
            <span>O</span>
            <span>T</span>
          </div>
          <p className="eyebrow">A speaking instrument</p>
          <h1 id="setup-title">Game of Talk</h1>
          <p className="setup-intro">
            Your voice becomes climate inside a living field. Nothing is
            transcribed, recorded, or sent anywhere.
          </p>

          <fieldset>
            <legend>How should this talk feel?</legend>
            <div className="segmented mood-options">
              {(Object.keys(MOODS) as Mood[]).map((option) => (
                <button
                  type="button"
                  key={option}
                  aria-pressed={mood === option}
                  onClick={() => setMood(option)}
                >
                  {MOODS[option].label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Field color</legend>
            <div className="segmented">
              {(Object.keys(PALETTES) as Palette[]).map((option) => (
                <button
                  type="button"
                  key={option}
                  aria-pressed={palette === option}
                  onClick={() => setPalette(option)}
                >
                  <span
                    className="palette-dot"
                    style={{ backgroundColor: PALETTES[option].life }}
                    aria-hidden="true"
                  />
                  {PALETTES[option].label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="toggle-row">
            <span>
              <strong>Projector boost</strong>
              <small>Extra contrast for unpredictable rooms</small>
            </span>
            <input
              type="checkbox"
              checked={projectorBoost}
              onChange={(event) => setProjectorBoost(event.target.checked)}
            />
          </label>

          {micError && (
            <p className="setup-error" role="alert">
              {micError}
            </p>
          )}

          <div className="start-actions">
            <button
              type="button"
              className="primary-action"
              onClick={() => void beginTalk(false)}
              disabled={micStatus === "requesting"}
            >
              {micStatus === "requesting" ? "Connecting…" : "Begin with microphone"}
            </button>
            <button
              type="button"
              className="text-action"
              onClick={() => void beginTalk(true)}
            >
              Use autonomous mode
            </button>
          </div>

          <p className="companion-note">
            Tile this window beside windowed slides, or enter full screen once
            the talk begins.
          </p>
        </section>
      )}

      {phase === "live" && (
        <>
          <header className="live-status">
            <span className={`status-pip status-${displayStatus}`} aria-hidden="true" />
            <span>{getStatusLabel(displayStatus)}</span>
            <span className="status-divider" aria-hidden="true" />
            <time>{formatTime(elapsed)}</time>
            <span className="block-count">
              {fossils.length} {fossils.length === 1 ? "block" : "blocks"}
            </span>
          </header>

          {fossils.length > 0 && (
            <aside className="fossil-rail" aria-label="Saved minute blocks">
              {fossils.slice(-8).map((fossil, index) => (
                <FossilCanvas
                  key={fossil.id}
                  fossil={fossil}
                  palette={palette}
                  label={`Saved block ${Math.max(1, fossils.length - 7) + index}`}
                />
              ))}
            </aside>
          )}

          <nav className="live-controls" aria-label="Talk controls">
            <button
              type="button"
              onClick={() => setPaused((current) => !current)}
              title="Keyboard shortcut: P"
            >
              {paused ? "Resume" : "Pause"}
            </button>
            <button type="button" onClick={captureFossil} title="Keyboard shortcut: B">
              Save block
            </button>
            <button type="button" onClick={reseed} title="Keyboard shortcut: R">
              Reseed
            </button>
            <span className="intensity-control">
              <button
                type="button"
                aria-label="Decrease intensity"
                onClick={() =>
                  setIntensity((current) =>
                    Math.max(0.5, Number((current - 0.1).toFixed(1))),
                  )
                }
              >
                −
              </button>
              <output aria-label="Current intensity">
                {Math.round(intensity * 100)}%
              </output>
              <button
                type="button"
                aria-label="Increase intensity"
                onClick={() =>
                  setIntensity((current) =>
                    Math.min(1.8, Number((current + 0.1).toFixed(1))),
                  )
                }
              >
                +
              </button>
            </span>
            <button type="button" onClick={cyclePalette} title="Keyboard shortcut: C">
              Color
            </button>
            <button type="button" onClick={() => void toggleFullscreen()}>
              Full screen
            </button>
            <button type="button" className="end-action" onClick={finishTalk}>
              End talk
            </button>
          </nav>
        </>
      )}

      {phase === "finished" && (
        <section className="final-panel" aria-labelledby="final-title">
          <div className="final-heading">
            <div>
              <p className="eyebrow">Talk fossilized</p>
              <h1 id="final-title">A field made from your minutes.</h1>
            </div>
            <div className="final-meta">
              <span>{formatTime(elapsed)}</span>
              <span>{fossils.length} blocks</span>
            </div>
          </div>

          <div
            className="mosaic"
            style={{
              gridTemplateColumns: `repeat(${mosaicLayout.columns}, minmax(0, 1fr))`,
            }}
            aria-label="Chronological talk mosaic"
          >
            {fossils.map((fossil, index) => (
              <figure key={fossil.id}>
                <FossilCanvas
                  fossil={fossil}
                  palette={palette}
                  label={`Talk block ${index + 1}`}
                />
                <figcaption>{String(index + 1).padStart(2, "0")}</figcaption>
              </figure>
            ))}
          </div>

          <div className="final-actions">
            <button type="button" className="primary-action" onClick={downloadMosaic}>
              Download mosaic
            </button>
            <button type="button" onClick={resetTalk}>
              Start another talk
            </button>
          </div>
        </section>
      )}

    </main>
  );
}
