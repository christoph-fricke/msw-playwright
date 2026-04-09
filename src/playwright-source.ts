import type { BrowserContext, Route, WebSocketRoute } from '@playwright/test'
import { isCommonAssetRequest } from 'msw'
import { NetworkSource } from 'msw/experimental'
import { PlaywrightHttpNetworkFrame } from './frames/http-frame.js'
import {
  convertToRequest,
  handleRouteSafely,
  INTERNAL_MATCH_ALL_REG_EXP,
  unrouteWebSocket,
} from './utils.js'
import { PlaywrightWebSocketNetworkFrame } from './frames/websocket-frame.js'

export interface PlaywrightSourceOptions {
  context: BrowserContext
  skipAssetRequests?: boolean
}

export class PlaywrightSource extends NetworkSource<
  PlaywrightHttpNetworkFrame | PlaywrightWebSocketNetworkFrame
> {
  #context: BrowserContext
  #skipAssetRequests: boolean

  constructor(options: PlaywrightSourceOptions) {
    super()
    this.#context = options.context
    this.#skipAssetRequests = options.skipAssetRequests ?? true
  }

  async enable(): Promise<void> {
    await this.#context.route(
      INTERNAL_MATCH_ALL_REG_EXP,
      this.#handleRequestRoute.bind(this),
    )

    await this.#context.routeWebSocket(
      INTERNAL_MATCH_ALL_REG_EXP,
      this.#handleWebSocketRoute.bind(this),
    )
  }

  async disable(): Promise<void> {
    super.disable()
    await this.#context.unroute(INTERNAL_MATCH_ALL_REG_EXP)
    await unrouteWebSocket(this.#context, INTERNAL_MATCH_ALL_REG_EXP)
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
      return await handleRouteSafely(() => route.fallback())
    }

    const frame = new PlaywrightHttpNetworkFrame({ route, request })
    await this.queue(frame)
  }

  async #handleWebSocketRoute(route: WebSocketRoute): Promise<void> {
    const frame = new PlaywrightWebSocketNetworkFrame({ route })
    await this.queue(frame)
  }
}
