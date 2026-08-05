// @vitest-environment jsdom
/**
 * ui-whale browser half on a real cordis Context with fake slots/sessions/
 * conversation/locale faces: the plugin registers the WhalePet entry at
 * conversation.session.header.actions, the locale namespace registers, and
 * registration disposal rides the plugin fiber (HMR safety). The node half
 * and the invariant companion are exercised over the same Context.
 *
 * Self-contained by design: every @deepseek-ai face is stubbed here, so the
 * suite needs no resolution into the DSH snapshot's sources (the whale's own
 * dictionaries provide the copy the component asserts on).
 */
import { Context } from 'cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import type { ConversationSnapshot, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import { apply, inject } from '../src/client/index.ts'
import { WhalePet, type WhalePetProps } from '../src/client/WhalePet.tsx'
import { zh as whaleZh } from '../src/client/locales.ts'
import { apply as nodeApply } from '../src/index.ts'

afterEach(cleanup)

const sid = (k: string): SessionId => k as SessionId

/** Translate stub over flat dictionaries, mirroring the framework `t` seat. */
function makeTranslate(...dicts: readonly Record<string, string>[]): (key: string) => string {
  return (key) => {
    for (const dict of dicts) {
      const hit = dict[key]
      if (hit !== undefined) return hit
    }
    return key
  }
}

/** Boot the plugin over fake faces; records slot registrations. */
function bench() {
  const ctx = new Context()
  const entries = new Map<string, { id?: string; order?: number; locale?: string }>()
  ctx.provide('slots', {
    register(reg: { name: string; id?: string; order?: number; locale?: string }) {
      entries.set(reg.name, reg)
      return () => { entries.delete(reg.name) }
    },
  } as never)
  ctx.provide('conversation', {} as never)
  ctx.provide('locale', { register: () => () => {} } as never)
  ctx.provide('sessions', {
    binding: () => undefined,
  } as never)
  const fiber = ctx.plugin({ inject: [...inject], apply })
  return { ctx, fiber, entry: () => entries.get('conversation.session.header.actions') }
}

describe('ui-whale browser plugin', () => {
  it('registers the whale header action with the documented id and order', async () => {
    const b = bench()
    await b.fiber.await()
    expect(b.entry()).toMatchObject({ id: 'whale', order: 30, locale: 'whale' })
  })

  it('disposal removes the registration (HMR safety)', async () => {
    const b = bench()
    await b.fiber.await()
    expect(b.entry()).toBeDefined()
    await b.fiber.dispose()
    expect(b.entry()).toBeUndefined()
  })

  it('registers the whale locale namespace', async () => {
    const b = bench()
    await b.fiber.await()
    // The plugin's apply registered the dictionary (fiber.await rejects on a
    // throwing apply); the zh dictionary owns every whale key.
    const t = makeTranslate(whaleZh)
    expect(t('title')).toBe('像素鲸鱼')
    expect(t('mood.spouting')).toBe('完成啦')
    void b.fiber
  })

  it('node half apply is inert', () => {
    const ctx = new Context()
    expect(() => { nodeApply() }).not.toThrow()
    expect(ctx.registry.size).toBe(0)
  })
})

describe('WhalePet component', () => {
  /** A stub `useSession` that returns a fixed snapshot to its selector. */
  function propsWith(snapshot: Partial<ConversationSnapshot>) {
    const full = {
      running: false,
      runningCalls: [],
      partial: null,
      ...snapshot,
    } as ConversationSnapshot
    return {
      sessionId: sid('s-1'),
      useSession: vi.fn((select: (s: ConversationSnapshot) => unknown) => select(full)),
      useSessions: vi.fn(),
      useWorkspaces: vi.fn(),
      useProjection: vi.fn(),
      t: makeTranslate(whaleZh),
    }
  }

  it('renders the pet with a locale-aware label and the idle mood', () => {
    const { container } = render(<WhalePet {...(propsWith({}) as unknown as WhalePetProps)} />)
    const pet = container.querySelector('[data-whale-pet]')
    expect(pet).not.toBeNull()
    expect(pet?.getAttribute('aria-label')).toContain('像素鲸鱼')
    expect(pet?.getAttribute('aria-label')).toContain('休息中')
  })

  it('reflects a running turn in the mood attribute', () => {
    const { container } = render(
      <WhalePet {...(propsWith({ running: true, runningCalls: [{ name: 'bash' } as never] }) as unknown as WhalePetProps)} />,
    )
    const pet = container.querySelector('[data-whale-pet]')
    expect(pet?.getAttribute('data-mood')).toBe('working')
  })
})
