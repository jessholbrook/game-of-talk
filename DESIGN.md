# Game of Talk Design System

## Physical Scene

A speaker starts the tool on a laptop moments before walking onstage, then glances at it only occasionally while its cellular field is projected beside slides in a room whose light and projector quality are unknown.

## Theme

Dark, high-contrast, and matte. The terminal reference comes from phosphor, grid logic, and monospaced instrumentation, not hacker nostalgia.

## Color Strategy

Restrained by default. Tinted near-black surfaces carry a warm-green field with a small amber signal color. Alternate palettes change the field and signal colors while preserving contrast and hierarchy.

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

- Ground: `oklch(0.115 0.014 35)`
- Life: `oklch(0.78 0.18 38)`
- Life hot: `oklch(0.91 0.15 72)`
- Signal: `oklch(0.73 0.16 20)`

### Ice

- Ground: `oklch(0.115 0.012 245)`
- Life: `oklch(0.79 0.14 215)`
- Life hot: `oklch(0.91 0.11 185)`
- Signal: `oklch(0.76 0.15 285)`

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
