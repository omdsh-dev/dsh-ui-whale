/**
 * WhalePet animation driver: turns the conversation snapshot's live state
 * into the pet's current pose (eye / tail / fin / spout / sleep-Z frame
 * selection) and a mood label. Pure functions — the component feeds the
 * latest snapshot and a tick counter, this module decides what to show. The
 * tick advances on a fixed interval in the component; all timing decisions
 * live here so the animation rules are unit-testable without timers.
 *
 * Behavior: while idle the whale mostly rests — it blinks on a slow cadence
 * and occasionally gives one tail "thump" or one fin flutter (a single pass,
 * then back to rest). After SLEEP_DELAY_MS of continuous idle the whale falls
 * asleep: a gray Z rises above the blowhole, shrinks, and fades on the loop
 * 0-1-2-3-4-5-6-1-2-3-... (frame 0 is the resting pose played once as the
 * whale settles, then the Z frames cycle) while the fins keep fluttering and
 * the tail keeps thumping on the idle cadence; any activity (thinking,
 * working, running, spouting) wakes it. While thinking/working/running the
 * tail wags and the fins flutter continuously (faster the busier the mood),
 * and the blink cadence tightens. When a turn settles the whale spouts a
 * water fountain (one-way frame run 0-1-2-3-4-5-6) for a short celebration.
 * A click on the pet requests one heart pass (one-way frame run 0-1-2-3-0 —
 * a pink heart grows from small to large in the top-left corner, then
 * disappears); a second click restarts it.
 */

import type { WhaleFrame } from './sprite.ts'

/** The pet's observable moods, from most to least idle. */
export type WhaleMood = 'idle' | 'sleeping' | 'thinking' | 'working' | 'running' | 'spouting'

/** One animation tick = one advance call (component drives the cadence). */
export const TICK_MS = 120

/** Continuous idle before the whale falls asleep (10 s). */
export const SLEEP_DELAY_MS = 10_000

/** Continuous idle ticks before sleep starts: the first tick past the delay. */
export const SLEEP_DELAY_TICKS = Math.ceil(SLEEP_DELAY_MS / TICK_MS)

/** Sleep-Z frame hold time in ticks (one dreamy float step). */
export const SLEEP_HOLD = 3

/** Tail-wag cadence per mood: frame hold time in ticks. */
const WAG_HOLD: Record<WhaleMood, number> = {
  idle: 6,
  sleeping: 6,
  thinking: 8,
  working: 3,
  running: 5,
  spouting: 3,
}

/** Fin-flutter cadence per mood: frame hold time in ticks. */
const FIN_HOLD: Record<WhaleMood, number> = {
  idle: 5,
  sleeping: 5,
  thinking: 6,
  working: 2,
  running: 4,
  spouting: 2,
}

/** Blink cadence per mood: ticks between blinks (0 = never blinks). */
const BLINK_GAP: Record<WhaleMood, number> = {
  idle: 42,
  sleeping: 42,
  thinking: 26,
  working: 14,
  running: 20,
  spouting: 8,
}

/** Spout-droplet cadence per mood: ticks between droplet advances (0 = no spout). */
const SPOUT_GAP: Record<WhaleMood, number> = {
  idle: 0,
  sleeping: 0,
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

/**
 * Heart poses for one full click pass (resting pose is index 0). Special
 * case: the heart plays ONE-WAY 0-1-2-3-0 — it grows small → medium → large
 * in the top-left corner, then the pass ends (no reverse pass).
 */
const HEART_SEQUENCE: readonly number[] = [1, 2, 3]

/** How long each heart size is held (ticks). */
const HEART_HOLD = 3

/** How long the spout celebration lasts after a turn settles (ticks). */
export const SPOUT_DURATION = 18

/**
 * The animation state accumulated across ticks.
 */
export interface WhaleAnimationState {
  /** Current mood (effective: includes the derived 'sleeping'). */
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
  /** Heart frame hold position within HEART_SEQUENCE; -1 = no heart. */
  readonly heartStep: number
  /** Ticks remaining before the current heart frame advances. */
  readonly heartHold: number
  /** Consecutive idle ticks (reset by any activity); drives the sleep delay. */
  readonly idleStreak: number
  /** Sleep-Z frame position; -1 = awake, 0..6 = the Z loop (0 is the resting pose). */
  readonly sleepStep: number
  /** Ticks remaining before the sleep-Z frame advances. */
  readonly sleepHold: number
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
    heartStep: -1,
    heartHold: 0,
    idleStreak: 0,
    sleepStep: -1,
    sleepHold: 0,
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
  // Sleeping keeps the idle cadence: the fins keep fluttering and the tail
  // keeps thumping on their occasional passes, never frozen mid-pose.
  return mood !== 'idle' && mood !== 'sleeping'
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
 * @param mood - the mood derived from the snapshot (spouting when
 * celebrating). 'sleeping' is accepted as an input only when the component
 * re-feeds its own effective mood (a click during sleep); it is treated as
 * the 'idle' base so the whale stays asleep.
 * @param heartRequested - true when the pet was clicked: (re)arms the one-way
 *   0-1-2-3-0 heart pass from the small heart.
 * @returns the next animation state.
 */
export function advance(state: WhaleAnimationState, mood: WhaleMood, heartRequested = false): WhaleAnimationState {
  // The input mood is a base mood (idle/thinking/working/running/spouting);
  // 'sleeping' is derived below from the continuous-idle streak and can only
  // arrive as an input when the component re-feeds its own effective mood.
  const base = mood === 'sleeping' ? 'idle' : mood
  const idle = base === 'idle'
  // Cap the streak: once the sleep threshold is reached, extra idle ticks add
  // nothing (the whale is already asleep).
  const idleStreak = idle ? Math.min(state.idleStreak + 1, SLEEP_DELAY_TICKS) : 0
  // Sleep is sticky while idle: once asleep, a click (or any idle re-feed)
  // must not wake the whale; only activity (a non-idle base) wakes it.
  const asleep = state.sleepStep >= 0
  const effective: WhaleMood = idle && (asleep || idleStreak >= SLEEP_DELAY_TICKS) ? 'sleeping' : base
  const continuous = continuousMotion(effective)

  const tail = advanceLimb(
    state.wagStep, state.wagHold, state.thumpCountdown,
    WAG_SEQUENCE, WAG_HOLD[effective], IDLE_THUMP_GAP, continuous,
  )
  const fin = advanceLimb(
    state.finStep, state.finHold, state.flutterCountdown,
    FIN_SEQUENCE, FIN_HOLD[effective], IDLE_FLUTTER_GAP, continuous,
  )

  // Sleep-Z: one-way loop 0-1-2-3-4-5-6-1-2-3-... while asleep — the resting
  // pose (0) plays once as the whale settles, then the Z frames cycle (6
  // wraps back to 1, never to 0). Activity clears the Z.
  let sleepStep = state.sleepStep
  let sleepHold = state.sleepHold
  if (effective === 'sleeping') {
    if (sleepStep < 0) {
      sleepStep = 0
      sleepHold = SLEEP_HOLD - 1
    } else if (sleepHold <= 0) {
      sleepStep = sleepStep >= 6 ? 1 : sleepStep + 1
      sleepHold = SLEEP_HOLD - 1
    } else {
      sleepHold -= 1
    }
  } else {
    sleepStep = -1
    sleepHold = 0
  }

  // Spout: one-way droplet run only while the celebration mood is active; the
  // last frame holds until the component ends the celebration.
  const spoutGap = SPOUT_GAP[effective]
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
    blinkCountdown = BLINK_GAP[effective] - 1
  } else {
    blinkCountdown = state.blinkCountdown - 1
  }

  // Heart: a click (re)arms the one-way 0-1-2-3-0 pass — each size holds
  // HEART_HOLD ticks, then the pass ends back on no heart.
  let heartStep = state.heartStep
  let heartHold = state.heartHold
  if (heartRequested) {
    heartStep = 0
    heartHold = HEART_HOLD - 1
  } else if (heartStep >= 0) {
    if (heartHold <= 0) {
      if (heartStep >= HEART_SEQUENCE.length - 1) {
        heartStep = -1
      } else {
        heartStep += 1
        heartHold = HEART_HOLD - 1
      }
    } else {
      heartHold -= 1
    }
  }

  return {
    mood: effective,
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
    heartStep,
    heartHold,
    idleStreak,
    sleepStep,
    sleepHold,
  }
}

/** Resolve the visible frame from the animation state. */
export function frameOf(state: WhaleAnimationState): WhaleFrame {
  const tailIndex = state.wagStep < 0 ? 0 : (WAG_SEQUENCE[state.wagStep] ?? 0)
  const finIndex = state.finStep < 0 ? 0 : (FIN_SEQUENCE[state.finStep] ?? 0)
  const spoutIndex = state.spoutStep < 0 ? 0 : (SPOUT_SEQUENCE[state.spoutStep] ?? 0)
  const heartIndex = state.heartStep < 0 ? 0 : (HEART_SEQUENCE[state.heartStep] ?? 0)
  return {
    tail: tailIndex,
    fin: finIndex,
    spout: spoutIndex,
    heart: heartIndex,
    sleep: state.sleepStep < 0 ? 0 : state.sleepStep,
    blink: state.blink,
  }
}

/** The mood label keys of the `whale` locale namespace. */
export type WhaleMoodKey = `mood.${WhaleMood}`

/** Human-readable mood key for the aria-label (locale namespace `whale`). */
export function moodKey(mood: WhaleMood): WhaleMoodKey {
  return `mood.${mood}`
}
