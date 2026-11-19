import { useEffect, useState } from 'react'
import { Box, Button, Chip, CircularProgress, InputBase, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import './App.css'
import ProblemWorkspace from './ProblemWorkspace'
import { getUserUuid } from './userIdentity'
import ExamPage from './ExamPage'

type Problem = { slug: string; level: number }
const levels = ['Foundations', 'Building blocks', 'Problem solving', 'The final stretch']
const pad = (n: number) => String(n).padStart(2, '0')

async function request(path: string, signal: AbortSignal) {
  const response = await fetch(`/api${path}`, { signal })
  if (!response.ok) throw new Error('The problem archive is unavailable. Please try again.')
  return response.json()
}

function App() {
  const [route, setRoute] = useState(window.location.hash.slice(1).split('?')[0] || '/')
  const [problems, setProblems] = useState<Problem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState(new URLSearchParams(window.location.hash.split('?')[1]).get('level') || 'all')
  const [statement, setStatement] = useState('')
  const [detailError, setDetailError] = useState('')
  const [detailLoading, setDetailLoading] = useState(true)
  const isList = route === '/problems'
  const isDetail = route.startsWith('/problems/')
  const isExam = route === '/exams'
  const slug = isDetail ? route.slice('/problems/'.length) : ''
  const problem = problems.find((item) => item.slug === slug)
  const filtered = problems.filter((item) => (level === 'all' || item.level === Number(level)) && item.slug.toLowerCase().includes(search.toLowerCase()))
  const retryRequest = () => {
    setLoading(true)
    setError('')
    setDetailLoading(true)
    setDetailError('')
    setStatement('')
    setRetry((n) => n + 1)
  }

  useEffect(() => {
    // Warm up identity on arrival. Failed requests are retried, with feedback,
    // when the visitor submits; browsing does not require an ID.
    void getUserUuid().catch(() => {})
  }, [])

  useEffect(() => {
    const navigate = () => {
      setRoute(window.location.hash.slice(1).split('?')[0] || '/')
      setDetailLoading(true)
      setDetailError('')
      setStatement('')
      const requestedLevel = new URLSearchParams(window.location.hash.split('?')[1]).get('level')
      if (requestedLevel !== null) setLevel(requestedLevel)
      window.scrollTo(0, 0)
    }
    const shortcut = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      const input = document.querySelector<HTMLInputElement>('.search input')
      if (input) { event.preventDefault(); input.focus() }
    }
    window.addEventListener('hashchange', navigate)
    window.addEventListener('keydown', shortcut)
    return () => {
      window.removeEventListener('hashchange', navigate)
      window.removeEventListener('keydown', shortcut)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    Promise.all(levels.map(async (_, index) => {
      const data = await request(`/?rank=rank02&level=level${index}`, controller.signal)
      if (!Array.isArray(data.data)) throw new Error('Could not load the problem archive.')
      return data.data.map((name: string) => ({ slug: name, level: index })) as Problem[]
    })).then((groups) => setProblems(groups.flat()))
      .catch((err: Error) => { if (!controller.signal.aborted) setError(err.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [retry])

  useEffect(() => {
    if (!slug) return
    const controller = new AbortController()
    request(`/questions/${encodeURIComponent(slug)}`, controller.signal)
      .then((data) => {
        if (typeof data.msg?.question !== 'string') throw new Error('This problem could not be found.')
        setStatement(data.msg.question)
      })
      .catch((err: Error) => { if (!controller.signal.aborted) setDetailError(err.message) })
      .finally(() => { if (!controller.signal.aborted) setDetailLoading(false) })
    return () => controller.abort()
  }, [slug, retry])

  const status = loading ? <div className="empty-state"><CircularProgress size={20} thickness={3} /> Loading the archive…</div> : error ? <div className="empty-state error" role="alert">{error}<Button onClick={retryRequest}>Try again ↻</Button><small>Make sure the FastAPI server is running on port 8000.</small></div> : null
  const problemLink = (item: Problem) => `#/problems/${item.slug}`

  return (
    <Box className="app">
      <header className="site-header">
        <a className="brand" href="#/" aria-label="Mencho Shell home"><span className="brand-icon">m<span>_</span></span>mencho<span className="brand-light">shell</span><span className="beta">BETA</span></a>
        <nav aria-label="Main navigation"><a className={!isList && !isDetail && !isExam ? 'active' : ''} href="#/">Overview</a><a className={isList || isDetail ? 'active' : ''} href="#/problems">Problemset <span className="nav-count">02</span></a><a className={isExam ? 'active' : ''} href="#/exams">Exam practice</a></nav>
        <span className="header-note"><span className="green-dot" /> Built for the grind.</span>
      </header>

      <main>
        {isExam ? <ExamPage /> : !isList && !isDetail ? <>
          <section className="hero">
            <div className="hero-copy">
              <div className="eyebrow"><span className="green-dot" /> YOUR NEXT RANK STARTS HERE</div>
              <Typography component="h1">Less scrolling.<br />More <span className="accent">solving.</span><span className="cursor">_</span></Typography>
              <p>A little practice. A lot of progress. Sharpen your C skills with a focused problemset built for the 42 exam.</p>
              <div className="hero-actions"><Button variant="contained" className="button primary" href="#/problems">Explore the problemset <span>↗</span></Button><Button href="#/exams" size="small">Try an exam →</Button></div>
              <div className="hero-tags"><span>⌘ C language</span><span>◷ At your own pace</span><span>↗ From basics to bitwise</span></div>
            </div>
            <Paper className="terminal">
              <div className="terminal-top"><div className="window-dots"><i /><i /><i /></div><span>your-next-breakthrough.c</span><span>C</span></div>
              <div className="terminal-code" aria-label="Example C program">
                <div><b>01</b><span className="syntax-purple">#include</span> <span className="syntax-green">&lt;unistd.h&gt;</span></div>
                <div><b>02</b></div>
                <div><b>03</b><span className="syntax-purple">int</span> <span className="syntax-yellow">main</span>(<span className="syntax-purple">void</span>)</div>
                <div><b>04</b>{'{'}</div>
                <div><b>05</b>    <span className="syntax-muted">// Small steps. Real progress.</span></div>
                <div><b>06</b>    <span className="syntax-yellow">write</span>(<span className="syntax-orange">1</span>, <span className="syntax-green">"hello, next level\\n"</span>, <span className="syntax-orange">18</span>);</div>
                <div><b>07</b>    <span className="syntax-purple">return</span> (<span className="syntax-orange">0</span>);</div>
                <div><b>08</b>{'}'}</div>
              </div>
              <div className="terminal-output"><span>~/mencho</span> $ ./your_next_level<br /><strong>hello, next level</strong><br /><span className="output-success">✓ A good place to start.</span></div>
              <div className="terminal-bottom"><span><span className="green-dot" /> Ready when you are</span><span>UTF-8 · C</span></div>
            </Paper>
          </section>
          <section className="stat-strip" aria-label="Archive overview"><div><strong>{loading || error ? '—' : problems.length}<span> problems</span></strong><small>One focused archive</small></div><div><strong>04<span> levels</span></strong><small>A clear path forward</small></div><div><strong>01<span> language</span></strong><small>Get closer to C</small></div><div><strong>∞<span> possibilities</span></strong><small>Keep showing up</small></div></section>
          <section className="archive-preview">
            <div className="section-title"><div><div className="eyebrow">THE PROBLEMSET</div><h2>Pick a problem. Find your flow.</h2></div><a className="text-link" href="#/problems">View all problems <span>→</span></a></div>
             <div className="level-grid">{levels.map((name, index) => <Paper component="a" variant="outlined" className="level-card" href={`#/problems?level=${index}`} key={name} onClick={() => setLevel(String(index))}><div className="card-top"><Chip className={`level-label level-${index}`} label={`LEVEL ${pad(index)}`} /><span>↗</span></div><Typography component="h3">{name}</Typography><p>{['Start small. Strings, loops, and the essentials.', 'Connect the dots. Functions, bits, and logic.', 'Go deeper. Memory, lists, and new patterns.', 'Bring it together. One challenge at a time.'][index]}</p><div className="card-bottom"><span>RANK 02</span><span>{loading || error ? '—' : problems.filter((p) => p.level === index).length} problems</span></div></Paper>)}</div>
          </section>
          <div className="bottom-note"><span>/*</span> There’s no shortcut to understanding. There is a good place to practice. <span>*/</span></div>
        </> : isList ? <>
          <div className="page-heading"><div className="breadcrumb"><a href="#/">Home</a><span>/</span>Problemset</div><div className="eyebrow">PRACTICE WITH PURPOSE</div><h1>The problemset<span className="accent">.</span></h1><p>One problem at a time. One step closer to your next rank.</p></div>
          <div className="problem-layout"><Paper component="section" variant="outlined" className="problem-panel">
            <div className="table-toolbar"><label className="search"><span aria-hidden="true">⌕</span><InputBase placeholder="Search problems…" value={search} onChange={(event) => setSearch(event.target.value)} inputProps={{ 'aria-label': 'Search problems' }} fullWidth /><kbd>/</kbd></label><span className="result-count">{filtered.length} problems</span></div>
            <div className="level-tabs" aria-label="Filter by level"><Button aria-pressed={level === 'all'} className={level === 'all' ? 'selected' : ''} onClick={() => setLevel('all')}>All levels</Button>{levels.map((_, index) => <Button aria-pressed={level === String(index)} className={level === String(index) ? 'selected' : ''} onClick={() => setLevel(String(index))} key={index}>Level {pad(index)}</Button>)}</div>
            {status || (filtered.length ? <TableContainer className="table-scroll"><Table aria-label="Rank 02 problems"><TableHead><TableRow><TableCell>#</TableCell><TableCell>PROBLEM</TableCell><TableCell>LEVEL</TableCell><TableCell>LANGUAGE</TableCell><TableCell><span className="sr-only">Open problem</span></TableCell></TableRow></TableHead><TableBody>{filtered.map((item) => <TableRow key={item.slug}><TableCell className="problem-number">{pad(problems.indexOf(item) + 1)}</TableCell><TableCell><a className="problem-name" href={problemLink(item)}>{item.slug}<small>{levels[item.level]}</small></a></TableCell><TableCell><Chip className={`level-label level-${item.level}`} label={`LEVEL ${pad(item.level)}`} /></TableCell><TableCell><Chip variant="outlined" className="language-tag" label="C" /></TableCell><TableCell><a className="row-arrow" href={problemLink(item)} aria-label={`View ${item.slug}`}>↗</a></TableCell></TableRow>)}</TableBody></Table></TableContainer> : <div className="empty-state">No problems match your search.<Button onClick={() => { setSearch(''); setLevel('all') }}>Clear filters</Button></div>)}
            <div className="table-footer"><span>RANK 02 ARCHIVE</span><span>Consistency beats intensity.</span></div>
          </Paper><aside><Paper variant="outlined" className="sidebar-card"><span className="eyebrow">YOUR PRACTICE GROUND</span><h3>Rank 02</h3><p>The fundamentals, without the distractions. Work through four levels of C challenges at your own pace.</p><div className="sidebar-divider" />{levels.map((name, index) => <Button className="sidebar-level" key={name} onClick={() => setLevel(String(index))}><span className={`level-label level-${index}`}>{pad(index)}</span><span>{name}</span><span>→</span></Button>)}</Paper><div className="tip"><span>↳ A small reminder</span><p>Read the statement twice.<br />Write the code once. (Maybe.)</p></div></aside></div>
        </> : <>
          <div className="page-heading detail-heading"><div className="breadcrumb"><a href="#/">Home</a><span>/</span><a href="#/problems">Problemset</a><span>/</span>{slug}</div><a className="text-link" href="#/problems">← Back to problems</a><h1>{slug}<span className="accent">.</span></h1><div className="detail-tags"><span className={`level-label level-${problem?.level ?? 0}`}>{problem ? `LEVEL ${pad(problem.level)}` : 'PROBLEM'}</span><span className="language-tag">C</span><span>Rank 02</span></div></div>
          <div className="problem-layout">
            <ProblemWorkspace key={slug} slug={slug} statement={statement} loading={detailLoading} error={detailError} onRetry={retryRequest} />
            <aside><Paper variant="outlined" className="sidebar-card"><span className="eyebrow">THE BRIEF</span><h3>Before you begin</h3><ul className="checklist"><li><span>01</span> Check the allowed functions.</li><li><span>02</span> Match the expected filename.</li><li><span>03</span> Don’t forget the edge cases.</li><li><span>04</span> Review before submitting.</li></ul><div className="local-note"><span className="green-dot" /> Your next attempt starts here.<p>Open the Submit code tab to write your solution. Copy anything you want to keep before leaving this problem; the editor will be cleared.</p></div></Paper><div className="tip"><span>↳ Make it a habit</span><p>Stuck? Step away, then come back with fresh eyes.</p></div></aside>
          </div>
        </>}
      </main>
      <footer><a className="footer-brand" href="#/">m_ <span>menchoshell</span></a><span>A quieter corner of competitive programming.</span><span>Built for learners. <span className="accent">Keep going ↗</span></span></footer>
    </Box>
  )
}

export default App
