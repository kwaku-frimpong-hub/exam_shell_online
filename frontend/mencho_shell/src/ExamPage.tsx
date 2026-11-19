import { useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, LinearProgress, Paper, Typography } from '@mui/material'
import ProblemWorkspace from './ProblemWorkspace'
import { fetchExam, readExam, saveExam } from './examApi'
import './ExamPage.css'
import { isQuestionUnlocked } from './examProgress'

function ExamQuestion({ slug, onPassed }: { slug: string; onPassed: () => void }) {
  const [statement, setStatement] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/questions/${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load this question.')
        const data = await response.json()
        if (typeof data.msg?.question !== 'string') throw new Error('This question could not be found.')
        if (!controller.signal.aborted) setStatement(data.msg.question)
      })
      .catch((err: Error) => { if (!controller.signal.aborted) setError(err.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [slug, attempt])
  return <ProblemWorkspace slug={slug} statement={statement} loading={loading} error={error}
    onPassed={onPassed}
    onRetry={() => { setLoading(true); setError(''); setAttempt((n) => n + 1) }} />
}

export default function ExamPage() {
  const [questions, setQuestions] = useState(readExam)
  const [selected, setSelected] = useState(0)
  const [passed, setPassed] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const request = useRef<AbortController | null>(null)
  const slug = questions[selected]
  const progress = questions.length ? passed.length / questions.length * 100 : 0
  const complete = questions.length > 0 && passed.length === questions.length
  const nextUnlocked = isQuestionUnlocked(questions, passed, selected + 1)

  function selectQuestion(index: number) {
    if (!loading && isQuestionUnlocked(questions, passed, index)) setSelected(index)
  }
  useEffect(() => () => request.current?.abort(), [])

  async function generate() {
    if (request.current) return
    setConfirmReset(false)
    const controller = new AbortController()
    request.current = controller
    setLoading(true)
    setError('')
    const timeout = window.setTimeout(() => controller.abort(), 15000)
    try {
      const next = await fetchExam(controller.signal)
      if (controller.signal.aborted) return
      if (!next.length) throw new Error('No exam questions are available for Rank 02 yet.')
      setQuestions(next)
      saveExam(next)
      setSelected(0)
      setPassed([])
    } catch (err) {
      setError(controller.signal.aborted ? 'The request timed out. Please try again.'
        : err instanceof Error ? err.message : 'Could not load the exam.')
    } finally {
      window.clearTimeout(timeout)
      request.current = null
      setLoading(false)
    }
  }

  return <Box className="exam-page">
    <div className="page-heading">
      <div className="breadcrumb"><a href="#/">Home</a><span>/</span>Exam practice</div>
      <div className="exam-heading-row">
        <div><div className="eyebrow"><span className="green-dot" /> LESS GUESSWORK. MORE PREPARATION.</div>
          <Typography component="h1">Your next dress rehearsal<span className="accent">.</span></Typography>
          <p>A random question from each level. One focused practice session.</p>
        </div>
        <Chip label="RANK 02" variant="outlined" color="primary" />
      </div>
    </div>

    {!questions.length ? <Paper variant="outlined" className="exam-start">
      <div className="exam-start-art" aria-hidden="true"><span>01</span><i /><span>02</span><i /><span>03</span><i /><span>04</span></div>
      <div className="eyebrow">A FRESH SET. A FRESH START.</div>
      <Typography component="h2">Practice the climb, not just the questions.</Typography>
      <p>Generate a Rank 02 practice set with one randomly selected problem per level. Pass each question to reveal the next. Read, solve, submit, repeat.</p>
      <div className="exam-rules"><span>↳ One question per level</span><span>◷ Untimed practice</span><span>⌘ C language</span></div>
      <Button variant="contained" disabled={loading} onClick={generate} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}>
        {loading ? 'Preparing your questions…' : 'Generate practice exam ↗'}
      </Button>
      <small>No account. No leaderboard. Just you and the next problem.</small>
    </Paper> : <>
      <Paper variant="outlined" className="exam-session-bar">
        <div><div className="eyebrow">YOUR PRACTICE SET</div><Typography component="h2">{questions.length} questions. One level at a time.</Typography></div>
        <Button variant="outlined" disabled={loading} onClick={() => setConfirmReset(true)}>
          {loading ? 'Preparing…' : 'New question set ↻'}
        </Button>
      </Paper>
      <div className="exam-layout">
        <aside className="exam-sidebar">
          <Paper variant="outlined" className="exam-question-list">
            <div className="exam-list-title"><span>THE CLIMB</span><span>{passed.length}/{questions.length} passed</span></div>
            <LinearProgress variant="determinate" value={progress} aria-label="Practice questions passed" />
            {questions.map((question, index) => {
              const unlocked = isQuestionUnlocked(questions, passed, index)
              if (!unlocked) return <div key={index} className="exam-question exam-question-locked" aria-label={`Question ${index + 1} locked. Pass all previous questions to reveal it.`}>
                <span className="exam-step" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <span><small>LEVEL {String(index).padStart(2, '0')}</small><strong>Question hidden</strong><span className="exam-lock-hint">Pass the previous question to reveal</span></span>
                <span className="exam-step-arrow" aria-hidden="true">—</span>
              </div>
              return <Button key={index} className={`exam-question ${selected === index ? 'current' : ''}`}
                aria-current={selected === index ? 'step' : undefined} onClick={() => selectQuestion(index)} disabled={loading}>
                <span className={`exam-step ${passed.includes(question) ? 'passed' : ''}`}>{passed.includes(question) ? '✓' : String(index + 1).padStart(2, '0')}</span>
                <span><small>LEVEL {String(index).padStart(2, '0')}</small><strong>{question}</strong></span>
                <span className="exam-step-arrow">→</span>
              </Button>
            })}
            <p>Pass each question to unlock the next. Switching questions clears the editor; copy any code you want to keep.</p>
          </Paper>
          <div className="tip"><span>↳ Practice, not pressure</span><p>This is an untimed, browser-only practice set—not an official exam. Pass markers reset when you leave.</p></div>
        </aside>
        <div className="exam-workspace">
          <div className="exam-current-heading"><div><span className="eyebrow">QUESTION {String(selected + 1).padStart(2, '0')} / {String(questions.length).padStart(2, '0')}</span>
            <Typography component="h2">{slug}</Typography></div><Chip variant="outlined" label={passed.includes(slug) ? '✓ Passed checks' : 'In progress'} color={passed.includes(slug) ? 'primary' : 'default'} /></div>
          {loading ? <div className="empty-state"><CircularProgress size={22} /> Preparing your next set…</div>
            : <ExamQuestion key={slug} slug={slug} onPassed={() => setPassed((previous) => previous.includes(slug) ? previous : [...previous, slug])} />}
          <div className="exam-bottom-nav">
            <Button disabled={selected === 0 || loading} onClick={() => selectQuestion(selected - 1)}>← Previous question</Button>
            <Button disabled={!nextUnlocked || loading} onClick={() => selectQuestion(selected + 1)}>Next question →</Button>
          </div>
          {!nextUnlocked && selected < questions.length - 1 && <p className="exam-unlock-note" role="status">Pass this question’s tester checks to reveal the next question.</p>}
          {nextUnlocked && <Alert severity="success" variant="outlined">The next question is unlocked. Continue when you’re ready.</Alert>}
          {complete && <Alert severity="success" variant="outlined">You made the climb. Every question in this practice set passed its available tester checks.</Alert>}
        </div>
      </div>
    </>}
    {error && <Alert severity="error" variant="outlined" className="exam-error" action={<Button size="small" color="inherit" onClick={generate} disabled={loading}>Retry</Button>}>{error}</Alert>}
    <div className="exam-disclaimer">Generated by the exam API · Judging still requires the local development judge to be enabled.</div>
    <Dialog open={confirmReset} onClose={() => setConfirmReset(false)} aria-labelledby="new-exam-title">
      <DialogTitle id="new-exam-title">Start a fresh question set?</DialogTitle>
      <DialogContent><DialogContentText>Your current code and pass markers will be cleared. Random selection may include questions you have seen before.</DialogContentText></DialogContent>
      <DialogActions><Button onClick={() => setConfirmReset(false)}>Keep practicing</Button><Button variant="contained" onClick={generate}>Generate new set</Button></DialogActions>
    </Dialog>
  </Box>
}
