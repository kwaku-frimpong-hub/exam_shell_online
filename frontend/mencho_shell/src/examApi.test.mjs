import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const source = ts.transpileModule(
  readFileSync(new URL('./examApi.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText

function setup(fetch = () => assert.fail('Unexpected fetch')) {
  const values = new Map()
  const context = {
    exports: {}, fetch,
    sessionStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
  }
  vm.runInNewContext(source, context)
  return context.exports
}

test('accepts exam question lists including empty results', () => {
  const { parseExamQuestions } = setup()
  assert.deepEqual(parseExamQuestions({ msg: ['fizzbuzz', 'alpha_mirror'] }), ['fizzbuzz', 'alpha_mirror'])
  assert.deepEqual(parseExamQuestions({ msg: [] }), [])
})

test('rejects endpoint errors, invalid slugs, and duplicates', () => {
  const { parseExamQuestions } = setup()
  for (const data of [null, {}, { msg: 'Error occured' }, { msg: [42] }, { msg: ['../bad'] }, { msg: ['max', 'max'] }]) {
    assert.throws(() => parseExamQuestions(data), /could not generate an exam/)
  }
})

test('persists only the question set for the current browser tab', () => {
  const { saveExam, readExam } = setup()
  assert.deepEqual(Array.from(readExam()), [])
  saveExam(['fizzbuzz', 'max'])
  assert.deepEqual(Array.from(readExam()), ['fizzbuzz', 'max'])
})

test('fetches the new exam endpoint with its expected response shape', async () => {
  const { fetchExam } = setup(async (url, options) => {
    assert.equal(url, '/api/exams/rank02')
    assert.equal(options.cache, 'no-store')
    return { ok: true, json: async () => ({ msg: ['fizzbuzz'] }) }
  })
  assert.deepEqual(await fetchExam(new AbortController().signal), ['fizzbuzz'])
})

test('reports unsuccessful HTTP responses', async () => {
  const { fetchExam } = setup(async () => ({ ok: false }))
  await assert.rejects(fetchExam(new AbortController().signal), /unavailable/)
})
