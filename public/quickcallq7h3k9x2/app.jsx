const { useState, useMemo } = React;

/* ---------- icons ---------- */
const Icon = {
  check: <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 5.5L4.5 8L9 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  arrow: <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 6h6m0 0L6 3m3 3L6 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

/* ---------- data ---------- */
// Tier 1 — the must-haves. Enough for Brenda to quote. Ask these every call.
const TIER1 = [
  { id: 'occasion', label: "What's the occasion?",    script: 'What are we celebrating?',                          hint: 'Wedding, birthday, shower, corporate, grad, or something else.' },
  { id: 'date',     label: 'When is it?',             script: 'What date are we looking at?',                      hint: 'Firm date, or still tentative?' },
  { id: 'venue',    label: 'Where?',                  script: "Where's it being held?",                           hint: 'City or venue, indoor or outdoor, booked yet?' },
  { id: 'pieces',   label: 'What are they picturing?', script: 'What did you have in mind for placements?',        hint: 'Arch, backdrop, ceiling piece, columns, centerpieces, bouquets.' },
  { id: 'theme',    label: 'Theme / vibe',            script: "What's the vibe you're going for?",                hint: 'A word or two: boho, classic, modern, fun, elegant, kids-themed.' },
  { id: 'colours',  label: 'Colours',                 script: 'What colours are we working with?',                hint: 'Specific colours or a general direction.' },
  { id: 'budget',   label: 'Budget',                  script: 'Do you have a budget in mind, or want to see a few options?' },
  { id: 'contact',  label: 'Name + contact',          script: 'Best name, email, and phone for Brenda to send the quote to?' },
];

// Tier 2 — more detail. Ask if the call has room. Nice to have, not required to quote.
const TIER2 = [
  { id: 'guests', label: 'Guest count',       script: 'Roughly how many guests are you expecting?' },
  { id: 'refs',   label: 'Reference photos',  script: 'Got a Pinterest board or saved pics you can send over?', hint: 'Get the link. It helps Brenda match the vision.' },
  { id: 'must',   label: 'Must-haves',        script: 'Anything that absolutely has to be in there?' },
  { id: 'avoid',  label: 'Anything to avoid', script: "Anything you definitely don't want?",                    hint: 'Colours, allergies, a theme to steer clear of.' },
  { id: 'when',   label: 'Decision timeline', script: 'When do you need to have this locked in?' },
  { id: 'setup',  label: 'Setup access',      script: 'What time can we get in to set up at the venue?' },
];

/* ---------- components ---------- */
function Q({ data, done, onToggle }) {
  return (
    <button type="button" className="q" data-done={done} onClick={onToggle} aria-pressed={done}>
      <span className="check" aria-hidden="true">{Icon.check}</span>
      <span className="q-body">
        <span className="q-label">{data.label}</span>
        {data.script && <span className="q-script" style={{ display: 'block' }}>“{data.script}”</span>}
        {data.hint && <span className="q-hint" style={{ display: 'block' }}>{data.hint}</span>}
      </span>
    </button>
  );
}

function App() {
  const [t1done, setT1done] = useState({});
  const [t2done, setT2done] = useState({});
  const [showMore, setShowMore] = useState(false);

  const progress = useMemo(() => {
    const t1 = Object.values(t1done).filter(Boolean).length;
    return Math.min(100, (t1 / TIER1.length) * 100);
  }, [t1done]);

  const reset = () => {
    setT1done({});
    setT2done({});
    setShowMore(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app">
      {/* ─── Top bar ─── */}
      <div className="topbar">
        <div className="left">
          <div className="brand-dot" aria-hidden="true"></div>
          <div style={{ minWidth: 0 }}>
            <h1>Call questions</h1>
            <div className="sub">Balloonia · quick lead capture</div>
          </div>
        </div>
        <div className="right" aria-label="Live call">
          <span className="dot"></span>
          LIVE
        </div>
      </div>
      <div className="progress" aria-label="Call progress">
        <div style={{ width: `${progress}%` }}></div>
      </div>

      {/* ─── TIER 1 — MUST ASK ─── */}
      <section className="phase">
        <div className="phase-head">
          <span className="phase-num">Tier 01 · Must ask</span>
          <span className="phase-time">every call</span>
        </div>
        <h2 className="phase-title">The <em>essentials</em></h2>
        <p className="phase-desc">Enough for Brenda to quote. Get these on every call.</p>
        <div className="qlist">
          {TIER1.map(q => (
            <Q key={q.id} data={q} done={!!t1done[q.id]} onToggle={() => setT1done(d => ({ ...d, [q.id]: !d[q.id] }))} />
          ))}
        </div>
      </section>

      {/* ─── TIER 2 — MORE DETAIL (optional) ─── */}
      <section className="phase">
        {!showMore ? (
          <button className="jumpbtn" type="button" onClick={() => setShowMore(true)}>
            <span>More detail <strong>if there's time</strong> (optional)</span>
            <span className="ar">{Icon.arrow}</span>
          </button>
        ) : (
          <div>
            <div className="phase-head">
              <span className="phase-num">Tier 02 · If there's time</span>
              <span className="phase-time">optional</span>
            </div>
            <h2 className="phase-title">More <em>detail</em></h2>
            <p className="phase-desc">Nice to have. Skip any that don't fit the call.</p>
            <div className="qlist">
              {TIER2.map(q => (
                <Q key={q.id} data={q} done={!!t2done[q.id]} onToggle={() => setT2done(d => ({ ...d, [q.id]: !d[q.id] }))} />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ─── End ─── */}
      <div className="endcard">
        <div className="ts">Then: create the HoneyBook lead + send to Brenda</div>
        <button className="reset" type="button" onClick={reset}>↻ Start new call</button>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
