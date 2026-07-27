# Game of Talk

Game of Talk is a private, microphone-driven cellular visualizer for live
presentations. It turns the energy, brightness, texture, and cadence of a
speaker's voice into environmental forces inside a Life-inspired field.

It does not transcribe, record, upload, or semantically analyze speech.

## Use it for a talk

1. Open the site in Chrome, Edge, or Arc on your laptop.
2. Choose the talk's character and field color.
3. Leave **Projector boost** on unless the display has excellent contrast.
4. Select **Begin with microphone** and allow microphone access.
5. Tile the browser beside windowed slides, or use **Full screen**.
6. Select **End talk** to assemble and download the final mosaic.

Every minute becomes a small chronological fossil block. **Save block** can
capture an extra moment manually.

## Presenter controls

| Key | Action |
| --- | --- |
| `P` | Pause or resume voice response |
| `B` | Save a block now |
| `R` | Reseed the field |
| `-` / `+` | Adjust intensity |
| `C` | Cycle the palette |
| `H` | Hide or show controls |
| `F` | Enter or leave full screen |
| `E` | End the talk |

If microphone access is unavailable, **Use autonomous mode** runs the same
field with a synthetic, speech-like climate.

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Run `npm test` for the production build and deterministic simulation tests.
