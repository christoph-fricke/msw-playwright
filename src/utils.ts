import type { BrowserContext, Route } from '@playwright/test'

/**
 * @note Use a match-all RegExp with an optional group as the predicate
 * for the `page.route()`/`page.unroute()` calls. Playwright treats given RegExp
 * as the handler ID, which allows us to remove only those handlers introduces by us
 * without carrying the reference to the handler function around.
 */
export const INTERNAL_MATCH_ALL_REG_EXP = /.+(__MSW_PLAYWRIGHT_PREDICATE__)?/

export async function convertToRequest(route: Route): Promise<Request> {
  const request = route.request()
  return new Request(request.url(), {
    method: request.method(),
    headers: new Headers(await request.allHeaders()),
    // TODO: Can we get rid of the type cast?
    body: request.postDataBuffer() as null | ArrayBuffer,
  })
}

export function inferBaseUrl(route: Route): string | undefined {
  const request = route.request()
  let url = request.headers().referer

  if (!url && request.isNavigationRequest()) {
    url = request.url()
  } else if (!url && request.serviceWorker() === null) {
    url = request.frame().url()
  }

  return url ? new URL(url).origin : undefined
}

export async function fulfillResponse(
  route: Route,
  response: Response,
): Promise<void> {
  await route.fulfill({
    status: response.status,
    headers: Object.fromEntries(response.headers),
    body: response.body ? Buffer.from(await response.arrayBuffer()) : undefined,
  })
}

export async function handleRouteSafely(
  callback: () => Promise<void>,
): Promise<void> {
  try {
    await callback()
  } catch (error) {
    /**
     * @note Ignore "Route is already handled!" errors.
     * Playwright has a bug where requests terminated due to navigation
     * cause your in-flight route handlers to throw. There's no means to
     * detect that scenario as both "route.handled" and "route._handlingPromise" are internal.
     * @see https://github.com/mswjs/playwright/issues/35
     */
    if (
      error instanceof Error &&
      /route is already handled/i.test(error.message)
    ) {
      return
    }

    throw error
  }
}

interface InternalWebSocketRoute {
  url: Parameters<BrowserContext['routeWebSocket']>[0]
  handler: Parameters<BrowserContext['routeWebSocket']>[1]
}

/**
 * Custom implementation of the missing `page.unrouteWebSocket()` to remove
 * WebSocket route handlers from the page. Loosely inspired by `page.unroute()`.
 */
export async function unrouteWebSocket(
  target: BrowserContext,
  url: InternalWebSocketRoute['url'],
  handler?: InternalWebSocketRoute['handler'],
): Promise<void> {
  if (
    !('_webSocketRoutes' in target && Array.isArray(target._webSocketRoutes))
  ) {
    return
  }

  for (let i = target._webSocketRoutes.length - 1; i >= 0; i--) {
    const route = target._webSocketRoutes[i] as InternalWebSocketRoute

    if (
      route.url === url &&
      (handler != null ? route.handler === handler : true)
    ) {
      target._webSocketRoutes.splice(i, 1)
    }
  }
}
