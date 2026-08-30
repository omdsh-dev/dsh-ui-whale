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
// Type-only: pulls the renderer-owned slots service (ctx.slots Context merge).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import { WhalePet } from './WhalePet.tsx'
import { en, zh, type WhaleKey } from './locales.ts'
import { applyWithCompat } from './compat.ts'

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
import { startUpdateChip } from './update-chip.ts'

export function apply(ctx: ClientContext): void {
  startUpdateChip()
  // Graceful compatibility: if the running DSH lacks the client APIs this
  // plugin needs (e.g. an older DSH without ctx.slots.inject), render a
  // remediation banner instead of throwing.
  applyWithCompat(
    '@dsh-external/dsh-ui-whale',
    '当前 DSH 客户端 API 与插件不匹配',
    [
      '将 DSH 升级到已适配的版本（dsh-v0.1.2-alpha.1，源码构建安装）。',
      '或将插件更新到适配当前 DSH 的版本（仓库最新 tag）。',
      '如仍显示，请在插件目录执行 pnpm run build 后刷新页面。',
    ],
    [
      ['slots.inject', ctx?.slots?.inject],
      ['slots.register', ctx?.slots?.register],
      ['locale.register', ctx?.locale?.register],
    ],
    () => {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-whale: dictionaries')

      ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register(
        { name: 'conversation.session.header.actions', id: 'whale', order: 30, locale: NS },
        WhalePet,
      ))
    },
  )
}
