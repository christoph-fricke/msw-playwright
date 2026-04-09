import type { WebSocketRoute } from '@playwright/test'
import type { AnyHandler, WebSocketHandler } from 'msw'
import { NetworkFrame } from 'msw/experimental'

import type { NetworkFrameResolutionContext } from '../../node_modules/msw/lib/core/experimental/frames/network-frame.mjs'
import type { HandlersController } from '../../node_modules/msw/lib/core/experimental/handlers-controller.mjs'
import type { UnhandledFrameHandle } from '../../node_modules/msw/lib/core/experimental/on-unhandled-frame.mjs'

interface PlaywrightWebSocketNetworkFrameOptions {
  route: WebSocketRoute
}

export class PlaywrightWebSocketNetworkFrame extends NetworkFrame<
  'ws',
  null,
  {}
> {
  #route: WebSocketRoute

  constructor(options: PlaywrightWebSocketNetworkFrameOptions) {
    super('ws', null)
    this.#route = options.route
  }

  getHandlers(controller: HandlersController): Array<AnyHandler> {
    return controller.getHandlersByKind('websocket')
  }

  public async resolve(
    handlers: Array<WebSocketHandler>,
    onUnhandledFrame: UnhandledFrameHandle,
    resolutionContext?: NetworkFrameResolutionContext,
  ): Promise<boolean | null> {
    return Promise.resolve(null)
  }

  passthrough(): void {
    throw new Error('Method not implemented.')
  }

  errorWith(reason?: unknown): void {
    throw new Error('Method not implemented.')
  }

  getUnhandledMessage(): Promise<string> {
    const details = `\n\n  \u2022 ${this.#route.url()}\n\n`
    return Promise.resolve(
      `intercepted a WebSocket connection without a matching event handler:${details}If you still wish to intercept this unhandled connection, please create an event handler for it.\nRead more: https://mswjs.io/docs/websocket`,
    )
  }
}
