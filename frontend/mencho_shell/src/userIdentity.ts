const storageKey = 'user_uuid'
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
let pendingIdentity: Promise<string> | null = null

/** Reuse the browser's anonymous ID; share a single request during startup. */
export function getUserUuid(): Promise<string> {
  try {
    const existing = localStorage.getItem(storageKey)
    if (existing && uuidPattern.test(existing)) return Promise.resolve(existing)
  } catch {
    return Promise.reject(new Error('Browser storage is unavailable. Enable localStorage to save your anonymous ID before submitting.'))
  }

  if (pendingIdentity) return pendingIdentity

  pendingIdentity = createUserUuid().finally(() => {
    pendingIdentity = null
  })
  return pendingIdentity
}

async function createUserUuid(): Promise<string> {
  let response: Response
  try {
    response = await fetch('/api/uuid', {
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    })
  } catch {
    throw new Error('Could not get your anonymous ID. Check that the backend is running and try again.')
  }
  if (!response.ok) throw new Error('Could not get your anonymous ID. Please try again.')

  const data = await response.json()
  if (typeof data.msg !== 'string' || !uuidPattern.test(data.msg)) {
    throw new Error('The API returned an invalid anonymous ID. Please try again.')
  }

  try {
    // Another tab may have saved an ID while this request was in flight.
    const existing = localStorage.getItem(storageKey)
    if (existing && uuidPattern.test(existing)) return existing
    localStorage.setItem(storageKey, data.msg)
  } catch {
    throw new Error('Your anonymous ID could not be saved. Enable localStorage before submitting.')
  }
  return data.msg
}
