import { test, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { fetchSetDefaults } from '@datastream/fetch'

import {
  setAPIKey,
  setUserAgent,
  metadata,
  locations,
  observations,
  records
} from './index.js'

const calls = []
globalThis.fetch = async (url, options) => {
  calls.push({ url: new URL(url), headers: options.headers })
  return new globalThis.Response(JSON.stringify({ value: [{ Id: 1 }] }), {
    headers: { 'content-type': 'application/json' }
  })
}

const drain = async (stream) => {
  const items = []
  for await (const item of stream) {
    items.push(item)
  }
  return items
}
const qs = (index = 0) => Object.fromEntries(calls[index].url.searchParams)
const userAgent = (index = 0) => calls[index].headers['User-Agent']

// setUserAgent mutates the defaults shared by every test, so capture the
// library-only value up front and restore it between tests
let libraryUserAgent
before(async () => {
  await drain(await locations({}))
  libraryUserAgent = userAgent()
})
beforeEach(() => {
  calls.length = 0
  if (libraryUserAgent) {
    fetchSetDefaults({ headers: { 'User-Agent': libraryUserAgent } })
  }
})

test('identifies the library without being asked', async () => {
  await drain(await locations({}))

  assert.match(userAgent(), /^datastreamjs\/\d+\.\d+\.\d+/)
})

test('sends the api key', async () => {
  setAPIKey('xxxxxxxxxx')
  await drain(await locations({}))

  assert.equal(calls[0].headers['x-api-key'], 'xxxxxxxxxx')
  assert.equal(userAgent(), libraryUserAgent)
})

test('lists the caller product before the library', async () => {
  setUserAgent('MyProject', '1.0')
  await drain(await locations({}))

  assert.equal(userAgent(), `MyProject/1.0 ${libraryUserAgent}`)
})

test('version is optional', async () => {
  setUserAgent('MyProject')
  await drain(await locations({}))

  assert.equal(userAgent(), `MyProject ${libraryUserAgent}`)
})

test('repeat calls replace rather than accumulate', async () => {
  setUserAgent('First', '1.0')
  setUserAgent('Second', '2.0')
  await drain(await locations({}))

  assert.equal(userAgent(), `Second/2.0 ${libraryUserAgent}`)
})

test('rejects values that could inject headers', async () => {
  for (const name of [
    'My Project',
    'X\r\nHost: example.org',
    'a\nb',
    '',
    'Project/1.0/extra',
    '(comment)'
  ]) {
    assert.throws(() => setUserAgent(name), /invalid User-Agent product/)
  }

  await drain(await locations({}))
  assert.equal(userAgent(), libraryUserAgent)
})

test('metadata pages smaller than the other endpoints', async () => {
  await drain(await metadata({}))

  assert.equal(qs().$top, '100')
})

test('other endpoints default to the larger page size', async () => {
  await drain(await locations({}))

  assert.equal(qs().$top, '10000')
})

test('an explicit $top wins over the default', async () => {
  await drain(await metadata({ $top: 50 }))

  assert.equal(qs().$top, '50')
})

test('$count is not partitioned', async () => {
  const count = await records({
    $filter: "DOI eq '10.25976/abc-1234'",
    $count: 'true'
  })

  assert.equal(calls.length, 1)
  assert.equal(qs().$count, 'true')
  assert.doesNotMatch(qs().$filter, /LocationId/)
  assert.deepEqual(count, { Id: 1 })
})

test('$count is not partitioned when passed as a boolean', async () => {
  await observations({ $filter: "DOI eq '10.25976/abc-1234'", $count: true })

  assert.equal(calls.length, 1)
  assert.doesNotMatch(qs().$filter, /LocationId/)
})

test('$count returns the value rather than a stream', async () => {
  for (const endpoint of [metadata, locations, observations, records]) {
    calls.length = 0
    const count = await endpoint({ $count: 'true' })

    assert.equal(typeof count?.[Symbol.asyncIterator], 'undefined')
    assert.deepEqual(count, { Id: 1 })
  }
})

test('a non-count request is partitioned by location', async () => {
  await drain(await observations({ $filter: "DOI eq '10.25976/abc-1234'" }))

  // one request to enumerate locations, then one per location
  assert.equal(calls.length, 2)
  assert.equal(qs(0).$select, 'Id')
  assert.match(qs(1).$filter, /^LocationId eq 1 and DOI eq/)
})

test('a LocationId filter skips partitioning', async () => {
  await drain(await records({ $filter: 'LocationId eq 43' }))

  assert.equal(calls.length, 1)
  assert.equal(qs().$filter, 'LocationId eq 43')
})
