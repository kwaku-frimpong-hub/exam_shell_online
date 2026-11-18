import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const id = 'b2d21481-42b8-4718-807f-05a105737352'
const source = ts.transpileModule(
  readFileSync(new URL('./userIdentity.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText

function setup(fetch, stored = null) {
  const values = new Map(stored ? [['user_uuid', stored]] : [])
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
  const context = { exports: {}, localStorage: storage, fetch, AbortSignal }
  vm.runInNewContext(source, context)
  return { getUserUuid: context.exports.getUserUuid, storage }
}

test('returning visitors reuse localStorage without calling the API', async () => {
  const { getUserUuid } = setup(() => assert.fail('Unexpected fetch'), id)
  assert.equal(await getUserUuid(), id)
})

test('first visits share one request and persist the server UUID', async () => {
  let calls = 0
  const { getUserUuid, storage } = setup(async (url, options) => {
    calls++
    assert.equal(url, '/api/uuid')
    assert.equal(options.cache, 'no-store')
    return { ok: true, json: async () => ({ msg: id }) }
  })
  const results = await Promise.all([getUserUuid(), getUserUuid()])
  assert.deepEqual(results, [id, id])
  assert.equal(storage.getItem('user_uuid'), id)
  assert.equal(await getUserUuid(), id)
  assert.equal(calls, 1)
})

test('failed requests can be retried', async () => {
  let calls = 0
  const { getUserUuid } = setup(async () => {
    if (++calls === 1) throw new Error('Offline')
    return { ok: true, json: async () => ({ msg: id }) }
  })
  await assert.rejects(getUserUuid(), /Could not get your anonymous ID/)
  assert.equal(await getUserUuid(), id)
  assert.equal(calls, 2)
})

test('invalid server UUIDs are not stored', async () => {
  const { getUserUuid, storage } = setup(async () => ({
    ok: true, json: async () => ({ msg: 'not-a-uuid' }),
  }), 'invalid-stored-value')
  await assert.rejects(getUserUuid(), /invalid anonymous ID/)
  assert.equal(storage.getItem('user_uuid'), 'invalid-stored-value')
})

test('blocked storage reports an actionable error', async () => {
  const { getUserUuid, storage } = setup(() => assert.fail('Unexpected fetch'))
  storage.getItem = () => { throw new Error('Storage blocked') }
  await assert.rejects(getUserUuid(), /Enable localStorage/)
})
