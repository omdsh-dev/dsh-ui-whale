/**
 * Pixel-whale plugin, node half. Registers the self-update endpoint (the
 * user-initiated one-click update from the update chip); the browser half
 * ships the pet via exports["./client"].
 */
import type { Context } from '@deepseek-ai/cordis'
import { registerUpdateEndpoint } from './update-endpoint.ts'

/** Stable Cordis plugin name (matches the manifest id). */
export const name = '@dsh-external/dsh-ui-whale'

/** The web server is required before the update endpoint can register. */
export const inject = ['webServer']

/**
 * Host plugin body: register the update endpoint.
 * @param ctx - host context carrying the webServer service.
 */
export function apply(ctx: Context): void {
  registerUpdateEndpoint(ctx)
}
