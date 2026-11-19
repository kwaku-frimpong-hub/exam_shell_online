export function isQuestionUnlocked(questions: string[], passed: string[], index: number): boolean {
  return index >= 0 && index < questions.length
    && questions.slice(0, index).every((slug) => passed.includes(slug))
}
