/**
 * Animation engine behavior: mood derivation from snapshot signals, tick
 * advancement (idle thump/flutter vs continuous motion, blink cadence, the
 * one-way spout), and the resolved frames. Pure-function tests — no timers.
 */
import { describe, expect, it } from 'vitest'
import {
  advance, frameOf, initialState, moodKey, moodOf, SPOUT_DURATION,
} from '../src/client/animation.ts'

/** Run `n` idle ticks and return the tail index each tick. */
function idleTailTrace(ticks: number): number[] {
  let s = initialState()
  const trace: number[] = []
  for (let i = 0; i < ticks; i += 1) {
    s = advance(s, 'idle')
    trace.push(frameOf(s).tail)
  }
  return trace
}

describe('moodOf', () => {
  it('maps snapshot signals to moods', () => {
    expect(moodOf(false, false, false)).toBe('idle')
    expect(moodOf(true, false, false)).toBe('running')
    expect(moodOf(true, true, false)).toBe('thinking')
    expect(moodOf(true, false, true)).toBe('working')
    expect(moodOf(true, true, true)).toBe('working')
  })
})

describe('advance / frameOf', () => {
  it('starts at the resting pose', () => {
    expect(frameOf(initialState())).toEqual({ tail: 0, fin: 0, spout: 0, heart: 0, blink: false })
  })

  it('idle mostly rests, then gives one tail thump (single pass, back to rest)', () => {
    const trace = idleTailTrace(200)
    // Most ticks hold the resting pose (tail 0).
    const resting = trace.filter(t => t === 0).length
    expect(resting).toBeGreaterThan(100)
    // The thump is a contiguous run of non-rest frames, then rest resumes.
    const nonRestRuns: number[] = []
    let run = 0
    for (const t of trace) {
      if (t !== 0) run += 1
      else if (run > 0) { nonRestRuns.push(run); run = 0 }
    }
    if (run > 0) nonRestRuns.push(run)
    expect(nonRestRuns.length).toBeGreaterThanOrEqual(1)
    // A single pass is at most WAG_SEQUENCE.length frames * hold, well under 40 ticks.
    expect(Math.max(...nonRestRuns)).toBeLessThan(40)
    // The pass moves forward then back: 1-2-3-2-1 (each pose held a few ticks).
    const poses: number[] = []
    for (const t of trace) {
      if (t !== 0 && poses[poses.length - 1] !== t) poses.push(t)
    }
    expect(poses).toEqual([1, 2, 3, 2, 1])
  })

  it('idle also flutters the fins occasionally (single pass, back to rest)', () => {
    let s = initialState()
    const finRuns: number[] = []
    let run = 0
    for (let i = 0; i < 200; i += 1) {
      s = advance(s, 'idle')
      const fin = frameOf(s).fin
      if (fin !== 0) run += 1
      else if (run > 0) { finRuns.push(run); run = 0 }
    }
    if (run > 0) finRuns.push(run)
    expect(finRuns.length).toBeGreaterThanOrEqual(1)
    // The flutter pass is short: 1-2-1 at the idle hold cadence.
    expect(Math.max(...finRuns)).toBeLessThan(25)
  })

  it('wags and flutters continuously while working, cycling through several frames', () => {
    let s = initialState()
    const tails = new Set<number>()
    const fins = new Set<number>()
    for (let i = 0; i < 60; i += 1) {
      s = advance(s, 'working')
      tails.add(frameOf(s).tail)
      fins.add(frameOf(s).fin)
    }
    expect(tails.size).toBeGreaterThan(2)
    expect(fins.size).toBeGreaterThan(1)
  })

  it('blinks on the blink cadence, exactly one tick at a time', () => {
    let s = initialState()
    const blinkTicks: number[] = []
    for (let i = 0; i < 200; i += 1) {
      s = advance(s, 'idle')
      if (frameOf(s).blink) blinkTicks.push(i)
    }
    // Idle blinks every 42 ticks; in 200 ticks expect 4-5 blinks, never adjacent.
    expect(blinkTicks.length).toBeGreaterThanOrEqual(4)
    for (let i = 1; i < blinkTicks.length; i += 1) {
      expect((blinkTicks[i] ?? 0) - (blinkTicks[i - 1] ?? 0)).toBeGreaterThan(1)
    }
  })

  it('spouts one-way 0-1-2-3-4-5-6 while spouting and clears after', () => {
    let s = initialState()
    const frames: number[] = []
    for (let i = 0; i < SPOUT_DURATION; i += 1) {
      s = advance(s, 'spouting')
      frames.push(frameOf(s).spout)
    }
    // The sequence climbs to the last droplet frame and holds — never reverses.
    expect(frames[0]).toBe(1)
    expect(frames[frames.length - 1]).toBe(6)
    for (let i = 1; i < frames.length; i += 1) {
      expect(frames[i] ?? 0).toBeGreaterThanOrEqual(frames[i - 1] ?? 0)
    }
    expect(frames).toContain(2)
    expect(frames).toContain(4)
    // Returning to idle clears the spout.
    s = advance(s, 'idle')
    expect(frameOf(s).spout).toBe(0)
  })

  it('moodKey addresses the locale namespace', () => {
    expect(moodKey('idle')).toBe('mood.idle')
    expect(moodKey('spouting')).toBe('mood.spouting')
  })

  it('plays one heart pass 0-1-2-3-0 on a click and clears after', () => {
    let s = initialState()
    s = advance(s, 'idle', true) // the click arms the pass
    const trace: number[] = [frameOf(s).heart]
    for (let i = 0; i < 12; i += 1) {
      s = advance(s, 'idle')
      trace.push(frameOf(s).heart)
    }
    // One-way growth: small → medium → large (each held 3 ticks), then back
    // to no heart — never a reverse pass, and the resting pose is unaffected.
    expect(trace).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 3, 0, 0, 0, 0])
    expect(frameOf(initialState()).heart).toBe(0)
  })

  it('a second click restarts the heart pass from the small heart', () => {
    let s = initialState()
    s = advance(s, 'idle', true)
    s = advance(s, 'idle') // mid-pass, still on the small heart
    s = advance(s, 'idle', true) // click again → restart
    const trace: number[] = [frameOf(s).heart]
    for (let i = 0; i < 9; i += 1) {
      s = advance(s, 'idle')
      trace.push(frameOf(s).heart)
    }
    // The restart yields a complete fresh 1-2-3-0 pass.
    expect(trace).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 3, 0])
  })

  it('the heart is an independent overlay: other limbs keep animating', () => {
    let s = initialState()
    s = advance(s, 'working', true)
    const tails = new Set<number>()
    for (let i = 0; i < 30; i += 1) {
      s = advance(s, 'working')
      tails.add(frameOf(s).tail)
    }
    // The whale kept wagging during the heart pass…
    expect(tails.size).toBeGreaterThan(2)
    // …and the heart finished its one-way pass back to none.
    expect(frameOf(s).heart).toBe(0)
  })
})
