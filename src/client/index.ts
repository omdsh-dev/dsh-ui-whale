/**
 * Pixel-whale pet plugin, browser half: registers the resident WhalePet into
 * the session-header actions slot, always visible, animated from the live
 * Session and Conversation snapshots (see WhalePet.tsx). Export discipline:
 * packages/client/AGENTS.md — only the cordis apply surface and contract
 * types leave this package.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the Session lifecycle snapshot behind the useSession seat.
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the Chat Conversation view (views.get('chat') typing).
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
// Type-only: pulls the header.actions slot and the useConversation seat.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: pulls the useSession seat over the Session snapshot.
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
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
 * Required services (cordis fiber inject): the slot registry for the header
 * contribution and the locale service for the dictionary registration.
 */
export const inject = ['slots', 'locale']

/**
 * Client plugin body: register the `whale` dictionaries and the resident
 * header pet. slots.inject waits for the header-actions declaration owned by
 * ui-conversation and rolls the contribution back with this plugin's fiber.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-whale: dictionaries')

  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register(
    { name: 'conversation.session.header.actions', id: 'whale', order: 30, locale: NS },
    WhalePet,
  ))
}
