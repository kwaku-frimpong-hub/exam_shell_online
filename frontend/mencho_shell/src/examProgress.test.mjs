import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const source = ts.transpileModule(
  readFileSync(new URL('./examProgress.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText
const context = { exports: {} }
vm.runInNewContext(source, context)
const { isQuestionUnlocked } = context.exports
const questions = ['q1', 'q2', 'q3', 'q4']

test('only Q1 is unlocked initially', () => {
  assert.deepEqual(questions.map((_, index) => isQuestionUnlocked(questions, [], index)), [true, false, false, false])
})

test('passing a question unlocks exactly the next question', () => {
  assert.deepEqual(questions.map((_, index) => isQuestionUnlocked(questions, ['q1'], index)), [true, true, false, false])
  assert.deepEqual(questions.map((_, index) => isQuestionUnlocked(questions, ['q1', 'q2'], index)), [true, true, true, false])
})

test('cannot skip a missing earlier pass', () => {
  assert.equal(isQuestionUnlocked(questions, ['q2', 'q3'], 3), false)
})

test('all questions are accessible after completing the sequence', () => {
  assert.equal(questions.every((_, index) => isQuestionUnlocked(questions, questions, index)), true)
})

test('resetting passes locks future questions and invalid indices stay locked', () => {
  assert.equal(isQuestionUnlocked(questions, [], 1), false)
  assert.equal(isQuestionUnlocked(questions, questions, -1), false)
  assert.equal(isQuestionUnlocked(questions, questions, 4), false)
  assert.equal(isQuestionUnlocked([], [], 0), false)
})
