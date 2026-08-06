/**
 * WhalePet: the pixel-whale companion living in the session header. Always
 * visible; its pose follows the live conversation snapshot — the tail wags
 * (slowly while idle, faster while thinking/working), the eyes blink on a
 * per-mood cadence, and when a turn settles the whale spouts a droplet
 * fountain for a short celebration. Clicking the pet plays a pink-heart
 * celebration (0-1-2-3-0, growing in the top-left corner) on top of whatever
 * the whale is doing. The pet renders as layered CSS box-shadow pixel art
 * (body + eyes + tail + spout + heart), each layer a 1x1 div whose shadow
 * list is the frame data, so animation is pure style swaps on a fixed DOM
 * tree — no re-layout, no per-frame React churn beyond one style update per
 * layer.
 */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import {
  advance, frameOf, initialState, moodKey, moodOf, SPOUT_DURATION, TICK_MS, type WhaleMood, type WhaleAnimationState,
} from './animation.ts'
import { boxShadow, framePixelsFor, type WhaleFrame } from './sprite.ts'
import css from './WhalePet.module.css'

/** Full props of the header pet: session standard kit + locale seat. */
export type WhalePetProps = PropsRuntime<'conversation.session.header.actions'> & PropsLocale<'whale'>

/** Whether the snapshot shows the model emitting reasoning with no tool in flight. */
function isThinking(snapshot: ConversationSnapshot): boolean {
  return snapshot.partial?.blocks.some(block => block.kind === 'reasoning') ?? false
}

/**
 * The header pet. Renders the layered whale and drives its animation on a
 * fixed tick; a completed turn (running true → false edge) arms the spout
 * celebration for SPOUT_DURATION ticks; a click arms one heart pass.
 */
export function WhalePet({ useSession, t }: WhalePetProps) {
  const running = useSession(s => s.running)
  const thinking = useSession(isThinking)
  const toolRunning = useSession(s => s.runningCalls.length > 0)

  // Animation tick loop. The state machine is pure (animation.ts); the
  // component only advances it on a fixed cadence and hands the derived
  // frame to the pixel layers. The initial state seeds the live mood so the
  // first paint already reflects a running turn.
  const [anim, setAnim] = useState<WhaleAnimationState>(() => ({
    ...initialState(),
    mood: moodOf(running, thinking, toolRunning),
  }))
  const spoutLeftRef = useRef(0)
  const prevRunningRef = useRef(running)

  useEffect(() => {
    // A completed turn (running true → false) arms the spout celebration.
    if (prevRunningRef.current && !running && spoutLeftRef.current <= 0) {
      spoutLeftRef.current = SPOUT_DURATION
    }
    prevRunningRef.current = running

    const timer = setInterval(() => {
      spoutLeftRef.current = Math.max(0, spoutLeftRef.current - 1)
      const base = moodOf(running, thinking, toolRunning)
      const mood: WhaleMood = spoutLeftRef.current > 0 ? 'spouting' : base
      setAnim(prev => advance(prev, mood))
    }, TICK_MS)
    return () => { clearInterval(timer) }
  }, [running, thinking, toolRunning])

  // Precompute the box-shadow strings once per frame; the layers re-render
  // only when their own shadow list changes.
  const frame: WhaleFrame = frameOf(anim)
  const shadows = useMemo(() => {
    const all = framePixelsFor(frame)
    // Split by palette value so each shadow string carries its own color:
    // group consecutive pixels is unnecessary — one box-shadow per pixel is
    // fine at this size and keeps the mapping trivially correct.
    return {
      body: boxShadow(all),
    }
  }, [frame])

  const mood = anim.mood
  return (
    <div
      className={css.pet}
      data-mood={mood}
      data-heart={frame.heart}
      data-whale-pet
      role="img"
      aria-label={`${t('title')} · ${t(moodKey(mood))}`}
      title={t(moodKey(mood))}
      onClick={() => setAnim(prev => advance(prev, prev.mood, true))}
    >
      <span className={css.pixels} style={{ '--whale-shadows': shadows.body } as CSSProperties} />
    </div>
  )
}
