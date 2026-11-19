const key = 'mencho:exam:rank02'

export function parseExamQuestions(data: unknown): string[] {
  if (typeof data !== 'object' || data === null || !('msg' in data)
    || !Array.isArray(data.msg)
    || !data.msg.every((slug: unknown) => typeof slug === 'string' && /^[a-zA-Z0-9_]+$/.test(slug))
    || new Set(data.msg).size !== data.msg.length) {
    throw new Error('The API could not generate an exam. Please try again.')
  }
  return data.msg
}

export function readExam(): string[] {
  try {
    const saved = sessionStorage.getItem(key)
    return saved ? parseExamQuestions(JSON.parse(saved)) : []
  } catch { return [] }
}

export function saveExam(questions: string[]) {
  try { sessionStorage.setItem(key, JSON.stringify({ msg: questions })) }
  catch { /* Practice can continue without session storage. */ }
}

export async function fetchExam(signal: AbortSignal): Promise<string[]> {
  const response = await fetch('/api/exams/rank02', { signal, cache: 'no-store' })
  if (!response.ok) throw new Error('The exam archive is unavailable. Please try again.')
  return parseExamQuestions(await response.json())
}
