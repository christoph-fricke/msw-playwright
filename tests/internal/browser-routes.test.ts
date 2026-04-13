/**
 * @note This test suite aims to verify the fixture's operability
 * with Playwright internals. It is not ideal but the best we can do,
 * given Playwright doesn't expose proper means to list route handlers.
 */
import { test as testBase, expect } from '@playwright/test'
import type { AnyHandler } from 'msw'
import { defineNetwork } from 'msw/experimental'
import { PlaywrightSource } from '../../src/index.js'
import { INTERNAL_MATCH_ALL_REG_EXP } from '../../src/utils.js'

interface Fixtures {
  handlers: Array<AnyHandler>
  network: ReturnType<typeof defineNetwork<PlaywrightSource[]>>
}

const test = testBase.extend<Fixtures>({
  handlers: [[], { option: true }],
  network: [
    async ({ context, handlers }, use) => {
      const network = defineNetwork({
        sources: [new PlaywrightSource(context)],
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

test('registers a single HTTP route', async ({ context }) => {
  expect(Reflect.get(context, '_routes')).toEqual([
    expect.objectContaining({ url: INTERNAL_MATCH_ALL_REG_EXP }),
  ])
})

test('unroutes the HTTP route when the fixture is stopped', async ({
  context,
  network,
}) => {
  await network.disable()
  expect(Reflect.get(context, '_routes')).toEqual([])
})

test('preserves user-defined HTTP routes', async ({ context, network }) => {
  const routeHandler = () => {}
  await context.route('/user-defined', routeHandler)

  expect(Reflect.get(context, '_routes')).toEqual([
    expect.objectContaining({ url: '/user-defined', handler: routeHandler }),
    expect.objectContaining({ url: INTERNAL_MATCH_ALL_REG_EXP }),
  ])

  await network.disable()
  expect(Reflect.get(context, '_routes')).toEqual([
    expect.objectContaining({ url: '/user-defined', handler: routeHandler }),
  ])
})

test('registers a single WebSocket handler', async ({ context }) => {
  expect(Reflect.get(context, '_webSocketRoutes')).toEqual([
    expect.objectContaining({ url: INTERNAL_MATCH_ALL_REG_EXP }),
  ])
})

test('unroutes the WebSocket handler when the fixture is stopped', async ({
  context,
  network,
}) => {
  await network.disable()
  expect(Reflect.get(context, '_webSocketRoutes')).toEqual([])
})

test('preserves user-defined WebSocket routes', async ({
  context,
  network,
}) => {
  const routeHandler = () => {}
  await context.routeWebSocket('/user-defined', routeHandler)

  expect(Reflect.get(context, '_webSocketRoutes')).toEqual([
    expect.objectContaining({ url: '/user-defined', handler: routeHandler }),
    expect.objectContaining({ url: INTERNAL_MATCH_ALL_REG_EXP }),
  ])

  await network.disable()
  expect(Reflect.get(context, '_webSocketRoutes')).toEqual([
    expect.objectContaining({ url: '/user-defined', handler: routeHandler }),
  ])
})
