import type { Route } from '@playwright/test'
import { HttpNetworkFrame } from 'msw/experimental'
import { fulfillResponse, handleRouteSafely } from '../utils.js'

interface PlaywrightHttpNetworkFrameOptions {
  request: Request
  id?: string
  route: Route
}

export class PlaywrightHttpNetworkFrame extends HttpNetworkFrame {
  #route: Route

  constructor(options: PlaywrightHttpNetworkFrameOptions) {
    super(options)
    this.#route = options.route
  }

  async respondWith(response?: Response): Promise<void> {
    if (!response) return

    if (response.status === 0) {
      return await handleRouteSafely(() => this.#route.abort())
    }

    return await handleRouteSafely(() => fulfillResponse(this.#route, response))
  }

  passthrough(): Promise<void> {
    return handleRouteSafely(() => this.#route.fallback())
  }

  errorWith(reason?: unknown): Promise<void> {
    if (reason instanceof Response) {
      return handleRouteSafely(() => fulfillResponse(this.#route, reason))
    }

    return handleRouteSafely(() => this.#route.abort())
  }
}
