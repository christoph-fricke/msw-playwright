import type {
  BrowserContext,
  Page,
  Route,
  WebSocketRoute,
} from '@playwright/test'
import { isCommonAssetRequest } from 'msw'
import { NetworkSource } from 'msw/experimental'
import { PlaywrightHttpNetworkFrame } from './frames/http-frame.js'
import { PlaywrightWebSocketNetworkFrame } from './frames/websocket-frame.js'
import {
  convertToRequest,
  inferPageBaseUrl,
  inferRouteBaseUrl,
  INTERNAL_MATCH_ALL_REG_EXP,
  passthroughRequest,
  registerRouteHandler,
  registerWebSocketRouteHandler,
  type UnrouteFn,
} from './route-utils.js'

export interface PlaywrightSourceOptions {
  skipAssetRequests?: boolean
}

export class PlaywrightSource extends NetworkSource<
  PlaywrightHttpNetworkFrame | PlaywrightWebSocketNetworkFrame
> {
  #target: BrowserContext | Page
  #skipAssetRequests: boolean

  #routeCleanup: UnrouteFn | null = null
  #wsRouteCleanup: UnrouteFn | null = null

  constructor(
    target: BrowserContext | Page,
    options?: PlaywrightSourceOptions,
  ) {
    super()
    this.#target = target
    this.#skipAssetRequests = options?.skipAssetRequests ?? true
  }

  async enable(): Promise<void> {
    this.#routeCleanup ??= await registerRouteHandler(
      this.#target,
      INTERNAL_MATCH_ALL_REG_EXP,
      this.#handleRequestRoute.bind(this),
    )
    this.#wsRouteCleanup ??= await registerWebSocketRouteHandler(
      this.#target,
      INTERNAL_MATCH_ALL_REG_EXP,
      this.#handleWebSocketRoute.bind(this),
    )
  }

  async disable(): Promise<void> {
    super.disable()
    await this.#routeCleanup?.()
    await this.#wsRouteCleanup?.()
    this.#routeCleanup = null
    this.#wsRouteCleanup = null
  }

  async #handleRequestRoute(route: Route): Promise<void> {
    const request = await convertToRequest(route)

    /**
     * @note Skip common asset requests (default).
     * Playwright seems to experience performance degradation when routing all
     * requests through the matching logic below.
     * @see https://github.com/mswjs/playwright/issues/13
     */
    if (this.#skipAssetRequests && isCommonAssetRequest(request)) {
      return await passthroughRequest(route)
    }

    const frame = new PlaywrightHttpNetworkFrame({
      route,
      request,
      inferredBaseUrl: inferRouteBaseUrl(route),
    })
    await this.queue(frame)
  }

  async #handleWebSocketRoute(route: WebSocketRoute): Promise<void> {
    const frame = new PlaywrightWebSocketNetworkFrame({
      route,
      inferredBaseUrl: inferPageBaseUrl(this.#target),
    })
    await this.queue(frame)
  }
}
