# Game of Talk Design System

## Physical Scene

A speaker starts the tool on a laptop moments before walking onstage, then glances at it only occasionally while its cellular field is projected beside slides in a room whose light and projector quality are unknown.

## Theme

Dark, high-contrast, and matte. The terminal reference comes from phosphor, grid logic, and monospaced instrumentation, not hacker nostalgia.

## Color Strategy

Restrained by default. Tinted near-black surfaces carry a warm-green field with
a small amber signal color. Every alternate palette is a paired theme: ground,
panel, living cells, trails, controls, and signals shift together while
preserving contrast and hierarchy. Palette controls preview both the ground and
cell colors. Custom mode accepts one color for each and derives the supporting
interface colors automatically.

### Terminal

- Ground: `oklch(0.105 0.008 145)`
- Panel: `oklch(0.145 0.010 145)`
- Grid: `oklch(0.245 0.018 145 / 35%)`
- Life: `oklch(0.82 0.17 145)`
- Life hot: `oklch(0.93 0.12 124)`
- Signal: `oklch(0.79 0.15 83)`
- Text: `oklch(0.90 0.025 145)`
- Muted text: `oklch(0.65 0.025 145)`

### Ember

- Ground: `oklch(0.14 0.038 35)`
- Life: `oklch(0.80 0.19 38)`
- Life hot: `oklch(0.91 0.15 72)`
- Signal: `oklch(0.73 0.16 20)`

### Ice

- Ground: `oklch(0.14 0.04 245)`
- Life: `oklch(0.79 0.14 215)`
- Life hot: `oklch(0.91 0.11 185)`
- Signal: `oklch(0.76 0.15 285)`

### Sodium

- Ground: `oklch(0.145 0.035 78)`
- Life: `oklch(0.84 0.14 92)`
- Life hot: `oklch(0.95 0.07 105)`
- Signal: `oklch(0.77 0.16 48)`

### Bone

- Ground: `oklch(0.89 0.024 85)`
- Life: `oklch(0.24 0.05 70)`
- Life hot: `oklch(0.14 0.055 65)`
- Signal: `oklch(0.55 0.15 50)`

### Ultraviolet

- Ground: `oklch(0.14 0.045 300)`
- Life: `oklch(0.80 0.14 300)`
- Life hot: `oklch(0.93 0.075 325)`
- Signal: `oklch(0.81 0.13 85)`

### Rosewood

- Ground: `oklch(0.14 0.04 355)`
- Life: `oklch(0.80 0.14 355)`
- Life hot: `oklch(0.92 0.09 25)`
- Signal: `oklch(0.82 0.13 105)`

## Talk Feels

The feel control changes the simulation's mutation rhythm, spatial drift,
density ceiling, survival variation, and decay. It is not a simple speed
control.

- Glacial: slow, durable structures that the voice nudges rather than erupts
- Meditative: sparse and patient, with long visual memory
- Balanced: the neutral instrument setting
- Tidal: broad wandering bands that swell with sustained speech
- Staccato: sharp phrase-triggered blooms with fast clearing
- Restless: frequent movement and shorter-lived colonies
- Electric: fast, bright, high-sensitivity mutation
- Overgrown: dense, persistent colonies that remain inhabited in quiet

## Typography

Use the system monospace stack for all controls and labels. Use tabular numerals for timers and counters. Hierarchy comes from size, weight, tracking, and case rather than a second typeface.

## Layout

- The living field owns the surface.
- A narrow setup rail appears before a talk and collapses once live.
- The live interface uses edge instrumentation rather than cards.
- Companion mode holds a useful composition down to a narrow browser window.
- Full-screen mode removes all persistent controls except a restrained status line.

## Components

- Primary action: solid field-color button with dark text
- Secondary action: quiet outlined button
- Segmented options: simple grouped buttons with explicit selected state
- Live meter: a small stepped signal, never an audio waveform
- Fossils: minute-sized pixel blocks arranged chronologically
- Final mosaic: a denser composition built from all fossil blocks

## Motion

Simulation motion is continuous and meaningful. Interface transitions use 160 to 220ms ease-out. Silence gradually lowers energy, thins cells, and darkens recent trails. Reduced-motion mode removes interface flourishes and lowers simulation cadence.
