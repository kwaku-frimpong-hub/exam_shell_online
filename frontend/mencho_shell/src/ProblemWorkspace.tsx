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
  onPassed?: () => void
}

export default function ProblemWorkspace({ slug, statement, loading, error, onRetry, onPassed }: Props) {
  const [tab, setTab] = useState(0)
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ severity: 'error' | 'info' | 'success'; message: string; output?: string } | null>(null)
  const activeRequest = useRef<AbortController | null>(null)
  const lineCount = code.split('\n').length

  useEffect(() => {
    // Remove drafts saved by the previous version; code now lives only in state.
    try { localStorage.removeItem(`mencho:draft:${slug}`) } catch { /* Storage may be blocked. */ }
    return () => activeRequest.current?.abort()
  }, [slug])

  function updateCode(value: string) {
    setCode(value)
    setFeedback(null)
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
    const timeout = window.setTimeout(() => controller.abort(), 60000)
    try {
      const userUuid = await getUserUuid()
      if (controller.signal.aborted) return
      const response = await fetch(`/api/questions/${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, session_id: userUuid }),
        signal: controller.signal,
      })
      const result = await response.json()
      if (controller.signal.aborted) return
      if (!response.ok) {
        throw new Error(response.status === 422
          ? 'The API could not validate this submission. Please check your code and try again.'
          : typeof result.detail === 'string' ? result.detail : `Submission failed (${response.status}). Please try again.`)
      }
      if (!['passed', 'failed', 'time_limit_exceeded', 'judge_error'].includes(result.status)
        || typeof result.message !== 'string' || typeof result.output !== 'string') {
        throw new Error('The judge returned an unexpected response. Please try again.')
      }
      setFeedback({
        severity: result.status === 'passed' ? 'success' : 'error',
        message: result.message,
        output: result.output,
      })
      if (result.status === 'passed') onPassed?.()
    } catch (err) {
      if (!controller.signal.aborted) {
        setFeedback({ severity: 'error', message: err instanceof TypeError
          ? 'Could not reach the API. Check your connection and make sure the backend is running.'
          : err instanceof Error ? err.message : 'Something went wrong. Please try again.' })
      } else {
        setFeedback({ severity: 'error', message: 'The request timed out. Your code is still in the editor; please try again.' })
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
            Local practice judge · Your code is compiled and checked against the problem’s tester. Each run has a 10-second limit.
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
              <span>Code is cleared when you leave this problem</span>
              <span>{lineCount} {lineCount === 1 ? 'line' : 'lines'} · {code.length.toLocaleString()} characters</span>
            </div>
          </div>
          <div aria-live="polite" aria-atomic="true">
            {feedback && <>
              <Alert severity={feedback.severity} variant="outlined">{feedback.message}</Alert>
              {feedback.output && <Paper variant="outlined" className="judge-output">
                <Typography component="h3">Tester output</Typography>
                <pre>{feedback.output}</pre>
              </Paper>}
            </>}
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
