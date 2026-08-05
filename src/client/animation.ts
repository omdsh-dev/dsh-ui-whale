/**
 * WhalePet animation driver: turns the conversation snapshot's live state
 * into the pet's current pose (eye / tail / fin / spout frame selection) and a
 * mood label. Pure functions — the component feeds the latest snapshot and
 * a tick counter, this module decides what to show. The tick advances on a
 * fixed interval in the component; all timing decisions live here so the
 * animation rules are unit-testable without timers.
 *
 * Behavior: while idle the whale mostly rests — it blinks on a slow cadence
 * and occasionally gives one tail "thump" or one fin flutter (a single pass,
 * then back to rest). While thinking/working/running the tail wags and the
 * fins flutter continuously (faster the busier the mood), and the blink
 * cadence tightens. When a turn settles the whale spouts a water fountain
 * (one-way frame run 0-1-2-3-4-5-6) for a short celebration.
 */

import type { WhaleFrame } from './sprite.ts'

/** The pet's observable moods, from most to least idle. */
export type WhaleMood = 'idle' | 'thinking' | 'working' | 'running' | 'spouting'

/** One animation tick = one advance call (component drives the cadence). */
export const TICK_MS = 120

/** Tail-wag cadence per mood: frame hold time in ticks. */
const WAG_HOLD: Record<WhaleMood, number> = {
  idle: 6,
  thinking: 8,
  working: 3,
  running: 5,
  spouting: 3,
}

/** Fin-flutter cadence per mood: frame hold time in ticks. */
const FIN_HOLD: Record<WhaleMood, number> = {
  idle: 5,
  thinking: 6,
  working: 2,
  running: 4,
  spouting: 2,
}

/** Blink cadence per mood: ticks between blinks (0 = never blinks). */
const BLINK_GAP: Record<WhaleMood, number> = {
  idle: 42,
  thinking: 26,
  working: 14,
  running: 20,
  spouting: 8,
}

/** Spout-droplet cadence per mood: ticks between droplet advances (0 = no spout). */
const SPOUT_GAP: Record<WhaleMood, number> = {
  idle: 0,
  thinking: 0,
  working: 0,
  running: 0,
  spouting: 2,
}

/** Ticks of rest between idle tail thumps. */
const IDLE_THUMP_GAP = 90

/** Ticks of rest between idle fin flutters. */
const IDLE_FLUTTER_GAP = 60

/**
 * Tail pose sequence for one full wag pass (resting pose is index 0):
 * 0-1-2-3-2-1-0 — the user's forward-and-back rule for multi-frame actions.
 */
const WAG_SEQUENCE: readonly number[] = [1, 2, 3, 2, 1]

/** Fin pose sequence for one flutter pass (resting pose is index 0): 0-1-2-1-0. */
const FIN_SEQUENCE: readonly number[] = [1, 2, 1]

/**
 * Spout droplet poses for one complete spout (resting is index 0). Special
 * case: the spout plays ONE-WAY 0-1-2-3-4-5-6 — the fountain bursts up and
 * spreads, then the celebration ends (no reverse pass).
 */
const SPOUT_SEQUENCE: readonly number[] = [1, 2, 3, 4, 5, 6]

/** How long the spout celebration lasts after a turn settles (ticks). */
export const SPOUT_DURATION = 18

/**
 * The animation state accumulated across ticks.
 */
export interface WhaleAnimationState {
  /** Current mood. */
  readonly mood: WhaleMood
  /** Monotonic tick counter (component-driven cadence). */
  readonly tick: number
  /** Tail frame hold position within WAG_SEQUENCE; -1 = holding the resting pose. */
  readonly wagStep: number
  /** Ticks remaining before the current tail frame advances. */
  readonly wagHold: number
  /** Ticks until the next idle tail thump fires (only tracked while idle). */
  readonly thumpCountdown: number
  /** Fin frame hold position within FIN_SEQUENCE; -1 = holding the resting pose. */
  readonly finStep: number
  /** Ticks remaining before the current fin frame advances. */
  readonly finHold: number
  /** Ticks until the next idle fin flutter fires (only tracked while idle). */
  readonly flutterCountdown: number
  /** Ticks until the next blink fires (0 = this tick blinks). */
  readonly blinkCountdown: number
  /** True for exactly one tick when the blink fires. */
  readonly blink: boolean
  /** Spout frame hold position within SPOUT_SEQUENCE; -1 = no spout. */
  readonly spoutStep: number
  /** Ticks remaining before the current spout frame advances. */
  readonly spoutHold: number
}

/** The initial animation state (resting pose). */
export function initialState(): WhaleAnimationState {
  return {
    mood: 'idle',
    tick: 0,
    wagStep: -1,
    wagHold: 0,
    thumpCountdown: IDLE_THUMP_GAP,
    finStep: -1,
    finHold: 0,
    flutterCountdown: IDLE_FLUTTER_GAP,
    blinkCountdown: BLINK_GAP.idle,
    blink: false,
    spoutStep: -1,
    spoutHold: 0,
  }
}

/**
 * Derive the pet mood from the conversation snapshot.
 * @param running - whether the session's turn is active.
 * @param thinking - whether the model is emitting reasoning (no tool in flight).
 * @param toolRunning - whether a tool call is in flight.
 */
export function moodOf(running: boolean, thinking: boolean, toolRunning: boolean): WhaleMood {
  if (!running) return 'idle'
  if (toolRunning) return 'working'
  if (thinking) return 'thinking'
  return 'running'
}

/** Whether the tail wags / fins flutter continuously in this mood (vs the occasional idle pass). */
function continuousMotion(mood: WhaleMood): boolean {
  return mood !== 'idle'
}

/**
 * Advance one animated limb through its pose sequence: continuous cycling in
 * active moods, one occasional pass while idle, always landing back on the
 * resting pose (index 0). Returns the next (step, hold, countdown) triple.
 * @param step - current pose index; -1 = resting.
 * @param hold - ticks until the pose advances.
 * @param countdown - ticks until the next idle pass fires.
 * @param sequence - the pose indices of one full pass.
 * @param holdFor - per-mood frame hold time.
 * @param idleGap - rest between idle passes.
 * @param continuous - whether the limb moves continuously this tick.
 */
function advanceLimb(
  step: number,
  hold: number,
  countdown: number,
  sequence: readonly number[],
  holdFor: number,
  idleGap: number,
  continuous: boolean,
): { step: number; hold: number; countdown: number } {
  if (continuous) {
    // Active moods cycle continuously through the pass.
    if (step < 0) return { step: 0, hold: holdFor - 1, countdown: idleGap }
    if (hold <= 0) return { step: (step + 1) % sequence.length, hold: holdFor - 1, countdown: idleGap }
    return { step, hold: hold - 1, countdown: idleGap }
  }
  // Idle: rest, then one pass per idleGap ticks (forward then back, then rest).
  if (step >= 0) {
    if (hold <= 0) {
      if (step >= sequence.length - 1) return { step: -1, hold: 0, countdown: idleGap }
      return { step: step + 1, hold: holdFor - 1, countdown: idleGap }
    }
    return { step, hold: hold - 1, countdown: idleGap }
  }
  if (countdown <= 0) return { step: 0, hold: holdFor - 1, countdown: idleGap }
  return { step: -1, hold: 0, countdown: countdown - 1 }
}

/**
 * Advance the animation one tick.
 * @param state - the previous animation state.
 * @param mood - the mood derived from the snapshot (spouting when celebrating).
 * @returns the next animation state.
 */
export function advance(state: WhaleAnimationState, mood: WhaleMood): WhaleAnimationState {
  const continuous = continuousMotion(mood)

  const tail = advanceLimb(
    state.wagStep, state.wagHold, state.thumpCountdown,
    WAG_SEQUENCE, WAG_HOLD[mood], IDLE_THUMP_GAP, continuous,
  )
  const fin = advanceLimb(
    state.finStep, state.finHold, state.flutterCountdown,
    FIN_SEQUENCE, FIN_HOLD[mood], IDLE_FLUTTER_GAP, continuous,
  )

  // Spout: one-way droplet run only while the celebration mood is active; the
  // last frame holds until the component ends the celebration.
  const spoutGap = SPOUT_GAP[mood]
  let spoutStep = -1
  let spoutHold = 0
  if (spoutGap > 0) {
    if (state.spoutStep < 0) {
      spoutStep = 0
      spoutHold = spoutGap - 1
    } else if (state.spoutHold <= 0) {
      spoutStep = Math.min(state.spoutStep + 1, SPOUT_SEQUENCE.length - 1)
      spoutHold = spoutGap - 1
    } else {
      spoutStep = state.spoutStep
      spoutHold = state.spoutHold - 1
    }
  }

  // Blink: this tick blinks when the countdown reaches zero, then reset.
  let blink = false
  let blinkCountdown = state.blinkCountdown
  if (state.blinkCountdown <= 0) {
    blink = true
    blinkCountdown = BLINK_GAP[mood] - 1
  } else {
    blinkCountdown = state.blinkCountdown - 1
  }

  return {
    mood,
    tick: state.tick + 1,
    wagStep: tail.step,
    wagHold: tail.hold,
    thumpCountdown: tail.countdown,
    finStep: fin.step,
    finHold: fin.hold,
    flutterCountdown: fin.countdown,
    blinkCountdown,
    blink,
    spoutStep,
    spoutHold,
  }
}

/** Resolve the visible frame from the animation state. */
export function frameOf(state: WhaleAnimationState): WhaleFrame {
  const tailIndex = state.wagStep < 0 ? 0 : (WAG_SEQUENCE[state.wagStep] ?? 0)
  const finIndex = state.finStep < 0 ? 0 : (FIN_SEQUENCE[state.finStep] ?? 0)
  const spoutIndex = state.spoutStep < 0 ? 0 : (SPOUT_SEQUENCE[state.spoutStep] ?? 0)
  return {
    tail: tailIndex,
    fin: finIndex,
    spout: spoutIndex,
    blink: state.blink,
  }
}

/** The mood label keys of the `whale` locale namespace. */
export type WhaleMoodKey = `mood.${WhaleMood}`

/** Human-readable mood key for the aria-label (locale namespace `whale`). */
export function moodKey(mood: WhaleMood): WhaleMoodKey {
  return `mood.${mood}`
}
