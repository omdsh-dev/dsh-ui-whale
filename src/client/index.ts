/**
 * Pixel-whale pet plugin, browser half: registers the resident WhalePet into
 * the session-header actions slot, always visible, animated from the live
 * conversation snapshot (see WhalePet.tsx). Export discipline:
 * packages/client/AGENTS.md — only the cordis apply surface and contract
 * types leave this package.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the ui-conversation SlotMap merge (the header.actions entry).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { WhalePet } from './WhalePet.tsx'
import { en, zh, type WhaleKey } from './locales.ts'

export type { WhalePetProps } from './WhalePet.tsx'
export type { WhaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The whale pet's copy. */
    whale: WhaleKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'whale'

/**
 * Required services (cordis fiber inject). 'conversation' is an ordering
 * edge, not a call dependency: 'conversation.session.header.actions' is
 * declared by ui-conversation's apply, and register() into an undeclared
 * slot throws — service waiting orders this apply after the declaring one.
 */
export const inject = ['slots', 'conversation', 'locale']

/**
 * Client plugin body: register the `whale` dictionaries and the resident
 * header pet.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-whale: dictionaries')

  // Conditional mount: the header actions slot is declared by the
  // conversation entry; waiting on the conversation service is the
  // registration-safe signal.
  ctx.inject(['slots', 'conversation', 'sessions'], (scope: ClientContext) => {
    scope.effect(
      () => scope.slots.register(
        { name: 'conversation.session.header.actions', id: 'whale', order: 30, locale: NS },
        WhalePet,
      ),
      'ui-whale: header pet',
    )
  })
}
