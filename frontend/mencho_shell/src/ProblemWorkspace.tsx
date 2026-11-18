import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { Alert, Box, Button, Chip, CircularProgress, Paper, Tab, Tabs, TextField, Typography } from '@mui/material'
import './ProblemWorkspace.css'
import { getUserUuid } from './userIdentity'

type Props = {
  slug: string
  statement: string
  loading: boolean
  error: string
  onRetry: () => void
}

function readDraft(slug: string) {
  try { return localStorage.getItem(`mencho:draft:${slug}`) || '' }
  catch { return '' }
}

export default function ProblemWorkspace({ slug, statement, loading, error, onRetry }: Props) {
  const [tab, setTab] = useState(0)
  const [code, setCode] = useState(() => readDraft(slug))
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ severity: 'error' | 'info'; message: string } | null>(null)
  const activeRequest = useRef<AbortController | null>(null)
  const lineCount = code.split('\n').length

  useEffect(() => () => activeRequest.current?.abort(), [])

  function updateCode(value: string) {
    setCode(value)
    setFeedback(null)
    try {
      localStorage.setItem(`mencho:draft:${slug}`, value)
      setSaved(true)
    } catch { setSaved(false) }
  }

  function editorKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const input = event.target
    if (!(input instanceof HTMLTextAreaElement)) return
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault()
      input.form?.requestSubmit()
    }
    if (event.key === 'Tab' && !event.shiftKey) {
      event.preventDefault()
      const start = input.selectionStart
      updateCode(`${code.slice(0, start)}    ${code.slice(input.selectionEnd)}`)
      requestAnimationFrame(() => input.setSelectionRange(start + 4, start + 4))
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (activeRequest.current || loading || error) return
    if (!code.trim()) {
      setFeedback({ severity: 'error', message: 'Add your C source code before submitting.' })
      return
    }
    const controller = new AbortController()
    activeRequest.current = controller
    setSubmitting(true)
    setFeedback(null)
    const timeout = window.setTimeout(() => controller.abort(), 30000)
    try {
      const userUuid = await getUserUuid()
      if (controller.signal.aborted) return
      const response = await fetch(`/api/questions/${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, session_id: userUuid }),
        signal: controller.signal,
      })
      if (!response.ok) {
        throw new Error(response.status === 422
          ? 'The API could not validate this submission. Please check your code and try again.'
          : `Submission failed (${response.status}). Please try again.`)
      }
      // The current API returns a placeholder, not a judge verdict.
      // Do not present a successful HTTP request as an accepted solution.
      setFeedback({
        severity: 'info',
        message: 'The API responded, but the judge is not connected yet. Your code has not been tested. Your draft is still here.',
      })
    } catch (err) {
      if (!controller.signal.aborted) {
        setFeedback({ severity: 'error', message: err instanceof TypeError
          ? 'Could not reach the API. Check your connection and make sure the backend is running.'
          : err instanceof Error ? err.message : 'Something went wrong. Please try again.' })
      } else {
        setFeedback({ severity: 'error', message: 'The request timed out. Your draft is safe; please try again.' })
      }
    } finally {
      window.clearTimeout(timeout)
      activeRequest.current = null
      setSubmitting(false)
    }
  }

  return (
    <Paper component="section" variant="outlined" className="statement-panel workspace">
      <div className="workspace-nav">
        <Tabs value={tab} onChange={(_, value: number) => setTab(value)} aria-label="Problem workspace">
          <Tab id="problem-tab" aria-controls="problem-panel" label="Problem" />
          <Tab id="submit-tab" aria-controls="submit-panel" label="Submit code" />
        </Tabs>
        <Chip label="C LANGUAGE" variant="outlined" size="small" />
      </div>

      <div id="problem-panel" role="tabpanel" aria-labelledby="problem-tab" hidden={tab !== 0}>
        <div className="panel-title"><span>≡</span><h2>Problem statement</h2><span className="file-label">sub.txt</span></div>
        {loading ? <div className="empty-state"><CircularProgress size={20} />Loading statement…</div>
          : error ? <div className="empty-state error" role="alert">{error}<Button onClick={onRetry}>Try again ↻</Button></div>
            : <pre className="statement">{statement}</pre>}
        <div className="statement-bottom">
          <span>Read carefully. Mind the edge cases.</span>
          <Button size="small" onClick={() => setTab(1)} disabled={loading || !!error}>Ready to submit? →</Button>
        </div>
      </div>

      <div id="submit-panel" role="tabpanel" aria-labelledby="submit-tab" hidden={tab !== 1}>
        <Box component="form" onSubmit={submit} className="submission-form">
          <div className="submission-intro">
            <div className="eyebrow">YOUR NEXT ATTEMPT</div>
            <Typography component="h2">Let your code do the talking<span className="accent">.</span></Typography>
            <p>Paste your solution below. Keep the expected filename and allowed functions in mind.</p>
          </div>
          <Alert severity="info" variant="outlined" className="judge-notice">
            Submission preview: the editor is ready, but automated judging is not connected yet.
          </Alert>
          <div className="editor-shell">
            <div className="editor-toolbar">
              <span><span className="green-dot" /> {slug}.c</span>
              <span>C · SOURCE CODE</span>
            </div>
            <TextField
              className="source-editor"
              value={code}
              onChange={(event) => updateCode(event.target.value)}
              onKeyDown={editorKeyDown}
              placeholder={'/* Your next breakthrough starts here. */\n\n#include <unistd.h>\n\n'}
              multiline
              minRows={17}
              maxRows={35}
              fullWidth
              disabled={submitting}
              slotProps={{ htmlInput: {
                'aria-label': `C source code for ${slug}`,
                spellCheck: false,
                autoCapitalize: 'off',
                autoCorrect: 'off',
                maxLength: 100000,
              } }}
            />
            <div className="editor-status">
              <span>{saved ? '✓ Draft saved in this browser' : 'Drafts stay in this browser'}</span>
              <span>{lineCount} {lineCount === 1 ? 'line' : 'lines'} · {code.length.toLocaleString()} characters</span>
            </div>
          </div>
          <div aria-live="polite" aria-atomic="true">
            {feedback && <Alert severity={feedback.severity} variant="outlined">{feedback.message}</Alert>}
          </div>
          <div className="submission-actions">
            <span><kbd>Ctrl</kbd> + <kbd>Enter</kbd> to submit · Tab inserts spaces</span>
            <Button variant="contained" type="submit" disabled={submitting || !code.trim() || loading || !!error} startIcon={submitting ? <CircularProgress size={15} color="inherit" /> : undefined}>
              {submitting ? 'Submitting…' : 'Submit solution ↗'}
            </Button>
          </div>
          <div className="submission-footnote">One attempt is a step forward. You’ve got this.</div>
        </Box>
      </div>
    </Paper>
  )
}
