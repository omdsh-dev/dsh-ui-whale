/**
 * Sprite layering invariants: the body/eye/tail/fin/spout layers must tile
 * the source frames exactly. Composing any pure pose (resting, one tail
 * frame, one fin frame, one spout frame, eyes closed) reproduces that source
 * frame cell-for-cell, and the motion regions are pairwise disjoint.
 */
import { describe, expect, it } from 'vitest'
import { FRAMES, SPRITE_HEIGHT, SPRITE_WIDTH } from '../src/client/sprite-data.ts'
import { framePixelsFor, LAYER_SIZES, RESTING_FRAME } from '../src/client/sprite.ts'

/** Reconstruct the full pixel grid of a composed frame (x,y → palette). */
function gridOf(frame: ReturnType<typeof framePixelsFor>): Map<string, number> {
  const grid = new Map<string, number>()
  for (const p of frame) grid.set(`${p.x},${p.y}`, p.c)
  return grid
}

/** Parse an "x,y" grid key back into coordinates. */
function keyXY(key: string): [number, number] {
  const [xs, ys] = key.split(',')
  return [Number(xs ?? 0), Number(ys ?? 0)]
}

/** Assert the composed frame paints exactly the source frame. */
function expectEqualsSource(frame: { tail: number; fin: number; spout: number; blink: boolean }, source: readonly string[]): void {
  const grid = gridOf(framePixelsFor(frame))
  expect(grid.size, `composed ${JSON.stringify(frame)} paints ${grid.size} cells`).toBeGreaterThan(0)
  for (let y = 0; y < SPRITE_HEIGHT; y += 1) {
    for (let x = 0; x < SPRITE_WIDTH; x += 1) {
      const expected = Number(source[y]?.[x])
      const actual = grid.get(`${x},${y}`) ?? 0
      expect(actual, `cell (${x},${y}) of ${JSON.stringify(frame)}`).toBe(expected)
    }
  }
}

describe('sprite layers', () => {
  it('resting pose equals STANDARD exactly', () => {
    expectEqualsSource(RESTING_FRAME, FRAMES.STANDARD)
  })

  it('each tail pose equals its TAIL_k frame exactly', () => {
    expectEqualsSource({ tail: 1, fin: 0, spout: 0, blink: false }, FRAMES.TAIL_1)
    expectEqualsSource({ tail: 2, fin: 0, spout: 0, blink: false }, FRAMES.TAIL_2)
    expectEqualsSource({ tail: 3, fin: 0, spout: 0, blink: false }, FRAMES.TAIL_3)
  })

  it('each fin pose equals its FIN_k frame exactly', () => {
    expectEqualsSource({ tail: 0, fin: 1, spout: 0, blink: false }, FRAMES.FIN_1)
    expectEqualsSource({ tail: 0, fin: 2, spout: 0, blink: false }, FRAMES.FIN_2)
  })

  it('each spout pose equals its SPOUT_k frame exactly', () => {
    expectEqualsSource({ tail: 0, fin: 0, spout: 1, blink: false }, FRAMES.SPOUT_1)
    expectEqualsSource({ tail: 0, fin: 0, spout: 3, blink: false }, FRAMES.SPOUT_3)
    expectEqualsSource({ tail: 0, fin: 0, spout: 6, blink: false }, FRAMES.SPOUT_6)
  })

  it('blink pose equals the BLINK frame exactly', () => {
    expectEqualsSource({ tail: 0, fin: 0, spout: 0, blink: true }, FRAMES.BLINK)
  })

  it('tail poses differ from STANDARD only outside the resting pose', () => {
    const rest = gridOf(framePixelsFor(RESTING_FRAME))
    const tail1 = gridOf(framePixelsFor({ tail: 1, fin: 0, spout: 0, blink: false }))
    let diffCells = 0
    for (const [key, c] of tail1) {
      if (rest.get(key) !== c) diffCells += 1
    }
    expect(diffCells).toBeGreaterThan(0)
    // The wag only touches the tail region (the right side of the canvas).
    for (const key of tail1.keys()) {
      if (rest.get(key) !== tail1.get(key)) {
        const [x] = keyXY(key)
        expect(x).toBeGreaterThanOrEqual(23)
      }
    }  })

  it('spout poses add droplets above the blowhole without touching the body', () => {
    const rest = gridOf(framePixelsFor(RESTING_FRAME))
    const spout6 = gridOf(framePixelsFor({ tail: 0, fin: 0, spout: 6, blink: false }))
    const added: string[] = []
    for (const [key, c] of spout6) {
      if (rest.get(key) !== c) added.push(key)
    }
    expect(added.length).toBeGreaterThan(0)
    // Droplets sit in the top rows (above the body, y < 7) and STANDARD is empty there.
    for (const key of added) {
      const [x, y] = keyXY(key)
      expect(y).toBeLessThan(7)
      expect(FRAMES.STANDARD[y]?.[x]).toBe('0')
    }
  })

  it('reports consistent layer sizes', () => {
    expect(LAYER_SIZES.body).toBeGreaterThan(0)
    expect(LAYER_SIZES.tailFrames).toBe(4)
    expect(LAYER_SIZES.finFrames).toBe(3)
    expect(LAYER_SIZES.spoutFrames).toBe(7)
    expect(LAYER_SIZES.eyeOpen).toBeGreaterThan(0)
    expect(LAYER_SIZES.eyeClosed).toBeGreaterThan(0)
    // The resting pose is index 0 in every animated layer.
    expect(RESTING_FRAME.tail).toBe(0)
    expect(RESTING_FRAME.fin).toBe(0)
    expect(RESTING_FRAME.spout).toBe(0)
    expect(RESTING_FRAME.blink).toBe(false)
  })
})
