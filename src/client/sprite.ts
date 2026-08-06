/**
 * Whale sprite layering: split the frame set into static body + animated
 * layers (eyes / tail / fins / spout / heart) so the pet can blink, wag,
 * flutter, spout, and show a heart independently of the still pose. Each
 * layer is a list of pixels rendered as CSS box-shadow entries
 * (`x y 0 0 var(--whale-cN)`); colors stay CSS variables so the artwork
 * palette lives in the module stylesheet.
 *
 * The frames come from the user's `whale_frames` (25x40 grids): STANDARD is
 * the resting pose; TAIL_1..3 are the tail-wag cycle (rightward swing, back
 * to STANDARD); FIN_1..2 are the pectoral-fin flutter; SPOUT_1..6 are the
 * one-way water-spout celebration (droplets rising and spreading above the
 * blowhole); BLINK closes both eyes (the two dark pupil pixels turn body
 * blue); HEART_1..3 are the click celebration — a pink heart in the top-left
 * corner growing from small to large. Each animated region is derived from
 * the source frames — the pixels any animation frame changes — so the body
 * layer never paints over motion.
 */
import { FRAMES, SPRITE_WIDTH } from './sprite-data.ts'

/** One sprite pixel: column, row, and palette key (1 dark, 2 body, 3 light, 4 white, 5 pink). */
export interface Pixel {
  readonly x: number
  readonly y: number
  readonly c: 1 | 2 | 3 | 4 | 5
}

/** Palette keys used by the artwork. */
export type PaletteKey = Pixel['c']

/** Render one layer as a CSS box-shadow list (offsets in px, colors via the module palette vars). */
export function boxShadow(pixels: readonly Pixel[]): string {
  return pixels.map(p => `${p.x}px ${p.y}px 0 0 var(--whale-c${p.c})`).join(', ')
}

/** All non-empty pixels of a frame. */
function framePixels(rows: readonly string[]): Pixel[] {
  const out: Pixel[] = []
  rows.forEach((row, y) => {
    for (let x = 0; x < SPRITE_WIDTH; x += 1) {
      const c = Number(row[x] ?? 0)
      if (c !== 0) out.push({ x, y, c: c as PaletteKey })
    }
  })
  return out
}

/** The set of cells any frame of an animation changes relative to STANDARD. */
function motionRegion(names: readonly (keyof typeof FRAMES)[]): ReadonlySet<string> {
  const region = new Set<string>()
  const standard = FRAMES.STANDARD
  for (const name of names) {
    FRAMES[name].forEach((row, y) => {
      const standardRow = standard[y] ?? ''
      for (let x = 0; x < SPRITE_WIDTH; x += 1) {
        if ((row[x] ?? '0') !== (standardRow[x] ?? '0')) region.add(`${x},${y}`)
      }
    })
  }
  return region
}

/** The eye pupils: two dark-blue pixels on the head (row 14, cols 7 and 14). */
const EYE_CELLS: ReadonlySet<string> = new Set(['7,14', '14,14'])

/** Open eyes: the dark pupil pixels from STANDARD. */
const EYE_OPEN: readonly Pixel[] = [
  { x: 7, y: 14, c: 1 }, { x: 14, y: 14, c: 1 },
]

/** Closed eyes: the blink frame paints the pupils body blue (they vanish). */
const EYE_CLOSED: readonly Pixel[] = [
  { x: 7, y: 14, c: 2 }, { x: 14, y: 14, c: 2 },
]

const TAIL = motionRegion(['TAIL_1', 'TAIL_2', 'TAIL_3'])
const FIN = motionRegion(['FIN_1', 'FIN_2'])
const SPOUT = motionRegion(['SPOUT_1', 'SPOUT_2', 'SPOUT_3', 'SPOUT_4', 'SPOUT_5', 'SPOUT_6'])
const HEART = motionRegion(['HEART_1', 'HEART_2', 'HEART_3'])

/** The still body: STANDARD minus the eye pupils and every motion region. */
const BODY: readonly Pixel[] = framePixels(FRAMES.STANDARD)
  .filter(p => !EYE_CELLS.has(`${p.x},${p.y}`) && !TAIL.has(`${p.x},${p.y}`) && !FIN.has(`${p.x},${p.y}`) && !SPOUT.has(`${p.x},${p.y}`) && !HEART.has(`${p.x},${p.y}`))

/** Pixels of one source frame restricted to its animation's motion region. */
function regionFrame(name: keyof typeof FRAMES, region: ReadonlySet<string>): readonly Pixel[] {
  return framePixels(FRAMES[name]).filter(p => region.has(`${p.x},${p.y}`))
}

/** Tail layer per pose index (0 = STANDARD resting pose, 1..3 = TAIL_1..3). */
const TAIL_FRAMES: readonly (readonly Pixel[])[] = (
  ['STANDARD', 'TAIL_1', 'TAIL_2', 'TAIL_3'] as const
).map(name => regionFrame(name, TAIL))

/** Fin layer per pose index (0 = STANDARD resting pose, 1..2 = FIN_1..2). */
const FIN_FRAMES: readonly (readonly Pixel[])[] = (
  ['STANDARD', 'FIN_1', 'FIN_2'] as const
).map(name => regionFrame(name, FIN))

/** Spout droplet layer per frame index (0 = no droplets, 1..6 = SPOUT_1..6). */
const SPOUT_FRAMES: readonly (readonly Pixel[])[] = (
  [undefined, 'SPOUT_1', 'SPOUT_2', 'SPOUT_3', 'SPOUT_4', 'SPOUT_5', 'SPOUT_6'] as const
).map(name => name === undefined ? [] : regionFrame(name, SPOUT))

/** Heart overlay layer per frame index (0 = no heart, 1..3 = HEART_1..3, growing). */
const HEART_FRAMES: readonly (readonly Pixel[])[] = (
  [undefined, 'HEART_1', 'HEART_2', 'HEART_3'] as const
).map(name => name === undefined ? [] : regionFrame(name, HEART))

/** The pet's visible frame: which eye/tail/fin/spout/heart sub-frames are showing right now. */
export interface WhaleFrame {
  /** 0-based index into TAIL_FRAMES; 0 is the resting pose (== STANDARD's tail). */
  readonly tail: number
  /** 0-based index into FIN_FRAMES; 0 is the resting pose (== STANDARD's fins). */
  readonly fin: number
  /** 0-based index into SPOUT_FRAMES; 0 has no droplets. */
  readonly spout: number
  /** 0-based index into HEART_FRAMES; 0 has no heart. */
  readonly heart: number
  /** Eyes open or closed. */
  readonly blink: boolean
}

/** Render the complete pixel set for a frame: body + eyes + tail + fins + spout + heart (ordered, no overlaps). */
export function framePixelsFor(frame: WhaleFrame): readonly Pixel[] {
  const tail = TAIL_FRAMES[frame.tail] ?? []
  const fin = FIN_FRAMES[frame.fin] ?? []
  const spout = SPOUT_FRAMES[frame.spout] ?? []
  const heart = HEART_FRAMES[frame.heart] ?? []
  const eyes = frame.blink ? EYE_CLOSED : EYE_OPEN
  return [...BODY, ...eyes, ...tail, ...fin, ...spout, ...heart]
}

/** Pixel counts per layer (exported for tests and the invariant companion). */
export const LAYER_SIZES = {
  body: BODY.length,
  tail: TAIL_FRAMES.map(f => f.length),
  fin: FIN_FRAMES.map(f => f.length),
  spout: SPOUT_FRAMES.map(f => f.length),
  heart: HEART_FRAMES.map(f => f.length),
  eyeOpen: EYE_OPEN.length,
  eyeClosed: EYE_CLOSED.length,
  tailFrames: TAIL_FRAMES.length,
  finFrames: FIN_FRAMES.length,
  spoutFrames: SPOUT_FRAMES.length,
  heartFrames: HEART_FRAMES.length,
} as const

/** The resting frame (eyes open, tail/fins/spout/heart in their STANDARD poses). */
export const RESTING_FRAME: WhaleFrame = { tail: 0, fin: 0, spout: 0, heart: 0, blink: false }
