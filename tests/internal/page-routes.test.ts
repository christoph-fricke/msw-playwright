/**
 * @note This test suite aims to verify the fixture's operability
 * with Playwright internals. It is not ideal but the best we can do,
 * given Playwright doesn't expose proper means to list route handlers.
 */
import { test as testBase, expect } from '@playwright/test'
import type { AnyHandler } from 'msw'
import { defineNetwork } from 'msw/experimental'
import { PlaywrightSource } from '../../src/index.js'

interface Fixtures {
  handlers: Array<AnyHandler>
  network: ReturnType<typeof defineNetwork<PlaywrightSource[]>>
}

const DEFAULT_PATTERN = '**'
const test = testBase.extend<Fixtures>({
  handlers: [[], { option: true }],
  network: [
    async ({ page, handlers }, use) => {
      const network = defineNetwork({
        sources: [new PlaywrightSource(page)],
        handlers,
      })

      await network.enable()
      await use(network)
      // FIXME: Should be able to use `NetworkReadyState` or a string literal comparison...
      if (network.readyState === 1) {
        await network.disable()
      }
    },
    { auto: true },
  ],
})

test('registers a single HTTP route', async ({ page }) => {
  expect(Reflect.get(page, '_routes')).toEqual([
    expect.objectContaining({ url: DEFAULT_PATTERN }),
  ])
})

test('unroutes the HTTP route when the fixture is stopped', async ({
  page,
  network,
}) => {
  await network.disable()
  expect(Reflect.get(page, '_routes')).toEqual([])
})

test('preserves user-defined HTTP routes', async ({ page, network }) => {
  const routeHandler = () => {}
  await page.route('/user-defined', routeHandler)

  expect(Reflect.get(page, '_routes')).toEqual([
    expect.objectContaining({ url: '/user-defined', handler: routeHandler }),
    expect.objectContaining({ url: DEFAULT_PATTERN }),
  ])

  await network.disable()
  expect(Reflect.get(page, '_routes')).toEqual([
    expect.objectContaining({ url: '/user-defined', handler: routeHandler }),
  ])
})

test('preserves user-defined HTTP routes with the same pattern', async ({
  page,
  network,
}) => {
  const routeHandler = () => {}
  await page.route(DEFAULT_PATTERN, routeHandler)

  expect(Reflect.get(page, '_routes')).toEqual([
    expect.objectContaining({ url: DEFAULT_PATTERN, handler: routeHandler }),
    expect.objectContaining({ url: DEFAULT_PATTERN }),
  ])

  await network.disable()
  expect(Reflect.get(page, '_routes')).toEqual([
    expect.objectContaining({ url: DEFAULT_PATTERN, handler: routeHandler }),
  ])
})

test('registers a single WebSocket handler', async ({ page }) => {
  expect(Reflect.get(page, '_webSocketRoutes')).toEqual([
    expect.objectContaining({ url: DEFAULT_PATTERN }),
  ])
})

test('unroutes the WebSocket handler when the fixture is stopped', async ({
  page,
  network,
}) => {
  await network.disable()
  expect(Reflect.get(page, '_webSocketRoutes')).toEqual([])
})

test('preserves user-defined WebSocket routes', async ({ page, network }) => {
  const routeHandler = () => {}
  await page.routeWebSocket('/user-defined', routeHandler)

  expect(Reflect.get(page, '_webSocketRoutes')).toEqual([
    expect.objectContaining({ url: '/user-defined', handler: routeHandler }),
    expect.objectContaining({ url: DEFAULT_PATTERN }),
  ])

  await network.disable()
  expect(Reflect.get(page, '_webSocketRoutes')).toEqual([
    expect.objectContaining({ url: '/user-defined', handler: routeHandler }),
  ])
})

test('preserves user-defined WebSocket routes with the same pattern', async ({
  page,
  network,
}) => {
  const routeHandler = () => {}
  await page.routeWebSocket(DEFAULT_PATTERN, routeHandler)

  expect(Reflect.get(page, '_webSocketRoutes')).toEqual([
    expect.objectContaining({ url: DEFAULT_PATTERN, handler: routeHandler }),
    expect.objectContaining({ url: DEFAULT_PATTERN }),
  ])

  await network.disable()
  expect(Reflect.get(page, '_webSocketRoutes')).toEqual([
    expect.objectContaining({ url: DEFAULT_PATTERN, handler: routeHandler }),
  ])
})
