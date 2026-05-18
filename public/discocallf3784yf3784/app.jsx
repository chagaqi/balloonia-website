const { useState, useMemo, useRef, useEffect } = React;

/* ---------- icons ---------- */
const Icon = {
  ring: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 4l-3 4 3 4 3-4-3-4z"/><circle cx="8" cy="11" r="2.5"/></svg>,
  building: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="10" height="11" rx="0.5"/><path d="M6 7h1M9 7h1M6 10h1M9 10h1M6 13v-2h4v2"/></svg>,
  shower: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="6" r="2.5"/><path d="M4 13c0-2.2 1.8-4 4-4s4 1.8 4 4"/></svg>,
  cake: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 13h10v-4H3v4z"/><path d="M3 9c1 0 1-1.5 2.5-1.5S7 9 8 9s1-1.5 2.5-1.5S12 9 13 9"/><path d="M5.5 6V4M8 6V4M10.5 6V4"/></svg>,
  cap: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 6.5L8 4l6 2.5L8 9 2 6.5z"/><path d="M5 8v3c0 0.8 1.3 1.5 3 1.5s3-0.7 3-1.5V8"/></svg>,
  spark: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2v3M8 11v3M2 8h3M11 8h3M4 4l2 2M10 10l2 2M12 4l-2 2M6 10l-2 2"/></svg>,
  check: <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 5.5L4.5 8L9 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  arrow: <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 6h6m0 0L6 3m3 3L6 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

/* ---------- data ---------- */
const EVENT_TYPES = [
  { id: 'wedding',    name: 'Wedding',     meta: 'Ceremony, reception',  glyph: Icon.ring },
  { id: 'corporate',  name: 'Corporate',   meta: 'Brand, launch, party', glyph: Icon.building },
  { id: 'shower',     name: 'Shower',      meta: 'Baby or bridal',       glyph: Icon.shower },
  { id: 'birthday',   name: 'Birthday',    meta: 'Kids, milestone',      glyph: Icon.cake },
  { id: 'graduation', name: 'Graduation',  meta: 'School, class of',     glyph: Icon.cap },
  { id: 'other',      name: 'Other',       meta: 'Custom occasion',      glyph: Icon.spark },
];

const COMMON_Q = [
  { id: 'vision',   label: 'The vision',     script: 'So what are we celebrating? Tell me about how you envision this moment.' },
  { id: 'date',     label: 'Event date',     script: 'What date is the event?',                                    hint: 'Note: firm date or tentative?' },
  { id: 'venue',    label: 'Venue',          script: "Where's it being held?",                                     hint: "If they don't know — indoor or outdoor? Booked yet?" },
  { id: 'budget',   label: 'Budget',         script: 'Do you have a budget range in mind, or are you open to seeing options?', hint: 'If they ticked a range on the form, confirm it instead.' },
];

const BRANCHES = {
  wedding: [
    { id: 'couple',  label: "Couple's names",     script: "And the couple's names, for the file?" },
    { id: 'style',   label: 'Style / vibe',       script: "How would you describe the look you're going for?", hint: 'Boho, classic, modern, garden, glam?' },
    { id: 'palette', label: 'Colour palette',     script: 'What colours are we working with?',               hint: 'Specific hex codes from your planner, or just descriptors?' },
    { id: 'pieces',  label: 'What pieces',        script: "What's on your radar?",                            hint: 'Ceremony arches, reception backdrops, ceiling installs, centerpieces, photo booth backdrops…' },
    { id: 'refs',    label: 'Reference photos',   script: 'Do you have a Pinterest board or saved images you can send me?', hint: 'Critical for the render — get the link.' },
    { id: 'florist', label: 'Florist',            script: 'Are you working with a florist? Will their flowers be incorporated into the arch?' },
    { id: 'must',    label: 'Must-haves',         script: 'Anything that absolutely has to be in there?' },
    { id: 'avoid',   label: 'Things to avoid',    script: "Anything you definitely don't want?", hint: 'Latex allergies, specific colours, themes from previous events.' },
    { id: 'when',    label: 'Decision timeline',  script: 'When do you need to lock the vendor in by?' },
  ],
  corporate: [
    { id: 'company', label: 'Company + your role', script: 'Company name and your role, for the file?' },
    { id: 'subtype', label: 'Type of event',       script: 'Grand opening, brand activation, product launch, holiday party, office event?' },
    { id: 'brand',   label: 'Brand colours',       script: 'What are the brand colours you need matched?', hint: 'Hex codes if they have them, otherwise screenshots of brand assets.' },
    { id: 'branded', label: 'Branded elements',    script: 'Logo cutouts, signage with company name, branded photo backdrop — anything else?' },
    { id: 'refs',    label: 'Reference photos',    script: 'Any past events you liked the look of? A mood board?' },
    { id: 'aud',     label: 'Audience',            script: "Who's the event for — clients, internal team, press, mixed?", hint: 'Affects formality level.' },
    { id: 'must',    label: 'Must-haves',          script: 'Anything that has to be there for the brand?' },
    { id: 'avoid',   label: 'Things to avoid',     script: 'Anything off-brand or off-limits?' },
    { id: 'approve', label: 'Approval process',    script: 'Who needs to sign off on the quote — you, or someone else?' },
    { id: 'recur',   label: 'Recurring opportunity', script: 'Is this a one-off, or do you run events like this regularly?', hint: 'Tag for future outreach.' },
  ],
  shower: [
    { id: 'host',    label: 'Host + relationship', script: 'Are you the host? Sister, friend, mom?' },
    { id: 'type',    label: 'Type of shower',      script: 'Baby shower, bridal shower, or both?' },
    { id: 'theme',   label: 'Theme',               script: 'Any theme — boho, jungle, floral, gender-reveal palette, name accents?' },
    { id: 'palette', label: 'Colour palette',      script: 'Hex codes or descriptors?', hint: 'Capture references too.' },
    { id: 'pieces',  label: 'What pieces',         script: 'Full package usually means arch + backdrop + centerpieces. Are you thinking smaller, or the full setup?' },
    { id: 'refs',    label: 'Reference photos',    script: 'Do you have Pinterest pins or screenshots you’ve been saving?' },
    { id: 'name',    label: 'Name accent',         script: "Want the baby's name or 'Mama' as a letter accent in the build?" },
    { id: 'surprise', label: 'Surprise element',   script: 'Is this a surprise for the guest of honour, or are they involved in planning?', hint: 'Affects how we communicate.' },
    { id: 'when',    label: 'Decision timeline',   script: 'When do you need to lock this in?' },
  ],
  birthday: [
    { id: 'who',     label: 'Whose birthday + age', script: "Who's it for and what age?", hint: "Kid's party vs adult milestone vs grown-up surprise — totally different builds." },
    { id: 'theme',   label: 'Theme',               script: 'Any theme — specific characters, animals, sports, an era, colour scheme?' },
    { id: 'palette', label: 'Colour palette',      script: 'Hex codes or descriptors?' },
    { id: 'pieces',  label: 'What pieces',         script: 'Most birthdays are an arch or backdrop plus a number column. Full themed setup or something smaller?' },
    { id: 'refs',    label: 'Reference photos',    script: 'Pinterest, IG, any references you can send?' },
    { id: 'number',  label: 'Number accent',       script: 'Number column for the age? What numbers? Standalone or part of the backdrop?' },
    { id: 'booth',   label: 'Photo booth area',    script: 'Do you want a dedicated photo backdrop for the kids or guests?' },
    { id: 'surprise', label: 'Surprise factor',    script: 'Is this a surprise? Will the guest of honour see it before?', hint: 'Affects delivery timing.' },
  ],
  graduation: [
    { id: 'grad',    label: 'Grad + school + year', script: "Class of what year, and what school?", hint: 'Tag for school-specific outreach later.' },
    { id: 'size',    label: 'Event size',          script: 'Backyard family party, school event, or full school-board event?' },
    { id: 'colours', label: 'School colours',      script: 'Need the school colours matched? What are they?' },
    { id: 'pieces',  label: 'What pieces',         script: 'Most grads include a Class-of arch or backdrop, number/letter columns for the year, maybe a photo backdrop. What’s on your list?' },
    { id: 'refs',    label: 'Reference photos',    script: 'Anything you’ve saved we can pull from?' },
    { id: 'mascot',  label: 'Themed elements',     script: 'Subject mascot, school mascot, anything specific?' },
    { id: 'when',    label: 'Decision timeline',   script: 'When do you need to lock this in?', hint: 'Grad season is tight — usually a hard deadline.' },
  ],
  other: [
    { id: 'what',    label: 'What is the event',   script: "Tell me about it — what's the occasion?" },
    { id: 'vision',  label: 'The vision',          script: 'What do you have in mind? Walk me through the picture in your head.' },
    { id: 'refs',    label: 'Reference photos',    script: 'Anything you’ve saved that’s close?' },
    { id: 'palette', label: 'Colour palette',      script: 'Hex codes or descriptors?' },
    { id: 'pieces',  label: 'What pieces',         script: 'What kind of install — arch, backdrop, ceiling, centerpieces, bouquets, something else?' },
    { id: 'must',    label: 'Must-haves & avoid',  script: 'Anything that has to be in there, and anything to steer clear of?' },
    { id: 'when',    label: 'Decision timeline',   script: 'When do you need to lock this in?' },
  ],
};

/* ---------- helpers ---------- */
function makeCheckKey(prefix, id) { return `${prefix}:${id}`; }

/* ---------- components ---------- */
function Q({ data, done, onToggle }) {
  return (
    <button
      type="button"
      className="q"
      data-done={done}
      onClick={onToggle}
      aria-pressed={done}
    >
      <span className="check" aria-hidden="true">{Icon.check}</span>
      <span className="q-body">
        <span className="q-label">{data.label}</span>
        {data.script && <span className="q-script" style={{display:'block'}}>“{data.script}”</span>}
        {data.hint && <span className="q-hint" style={{display:'block'}}>{data.hint}</span>}
      </span>
    </button>
  );
}

function TypePicker({ value, onChange }) {
  return (
    <div className="type-grid" role="radiogroup" aria-label="Event type">
      {EVENT_TYPES.map(t => (
        <button
          key={t.id}
          type="button"
          className="type"
          role="radio"
          aria-checked={value === t.id}
          aria-pressed={value === t.id}
          onClick={() => onChange(t.id)}
        >
          <span className="glyph">{t.glyph}</span>
          <span className="name">{t.name}</span>
          <span className="meta">{t.meta}</span>
        </button>
      ))}
    </div>
  );
}

function Branch({ eventType }) {
  const branchRef = useRef(null);
  const questions = eventType ? BRANCHES[eventType] : null;
  const typeMeta = EVENT_TYPES.find(t => t.id === eventType);

  const [done, setDone] = useState({});

  useEffect(() => {
    // reset checks when branch changes so the next call starts fresh-looking
    setDone({});
    if (eventType && branchRef.current) {
      branchRef.current.scrollIntoView({behavior:'smooth', block:'start'});
    }
  }, [eventType]);

  if (!eventType) {
    return (
      <div className="branch-empty">
        <strong>Pick an event type above</strong>
        The follow-up questions change depending on what they’re booking.
        <div className="arrow">↑ select to continue</div>
      </div>
    );
  }

  return (
    <div className="branch" ref={branchRef} key={eventType}>
      <div className="branch-tag">
        <span className="dot"></span>
        Branch · {typeMeta?.name?.toUpperCase()}
      </div>
      <div className="qlist">
        {questions.map(q => (
          <Q
            key={q.id}
            data={q}
            done={!!done[q.id]}
            onToggle={() => setDone(d => ({...d, [q.id]: !d[q.id]}))}
          />
        ))}
      </div>
    </div>
  );
}

function App() {
  const [eventType, setEventType] = useState('');
  const [commonDone, setCommonDone] = useState({});

  // progress: rough estimate of completion (event type + common + branch picked)
  const progress = useMemo(() => {
    const totalCommon = COMMON_Q.length;
    const doneCommon = Object.values(commonDone).filter(Boolean).length;
    const base = 5; // opening
    const commonPct = (doneCommon / totalCommon) * 50;
    const branchPct = eventType ? 25 : 0;
    return Math.min(100, base + commonPct + branchPct);
  }, [commonDone, eventType]);

  const branchRef = useRef(null);
  const onJump = () => {
    if (branchRef.current) {
      branchRef.current.scrollIntoView({behavior:'smooth', block:'start'});
    }
  };

  const reset = () => {
    setEventType('');
    setCommonDone({});
    window.scrollTo({top:0, behavior:'smooth'});
  };

  const typeMeta = EVENT_TYPES.find(t => t.id === eventType);

  return (
    <div className="app">
      {/* ─── Top bar ─── */}
      <div className="topbar">
        <div className="left">
          <div className="brand-dot" aria-hidden="true"></div>
          <div style={{minWidth:0}}>
            <h1>Discovery call</h1>
            <div className="sub">Lead qualification · 8–12 min</div>
          </div>
        </div>
        <div className="right" aria-label="Live call">
          <span className="dot"></span>
          LIVE
        </div>
      </div>
      <div className="progress" aria-label="Call progress">
        <div style={{width:`${progress}%`}}></div>
      </div>

      {/* ─── PHASE 1 — OPEN ─── */}
      <section className="phase">
        <div className="phase-head">
          <span className="phase-num">Phase 01</span>
          <span className="phase-time">~ 30s</span>
        </div>
        <h2 className="phase-title">Open the <em>call</em></h2>

        <div className="script">
          <div className="script-label">Read aloud</div>
          <div className="script-body">
            “Hey <span className="field">name</span>, thanks for sending the inquiry through.
            I’ve got your details in front of me — I want to confirm a few things,
            ask about the vibe you’re picturing, and then Brenda will have a quote back
            in your inbox within a few hours. Sound good?”
          </div>
        </div>
      </section>

      {/* ─── PHASE 2 — COMMON ─── */}
      <section className="phase">
        <div className="phase-head">
          <span className="phase-num">Phase 02</span>
          <span className="phase-time">~ 2 min</span>
        </div>
        <h2 className="phase-title">Every <em>event</em></h2>
        <p className="phase-desc">Ask in order. Same four no matter the booking.</p>

        <div className="group-label">The four common questions</div>
        <div className="qlist">
          {COMMON_Q.map(q => (
            <Q
              key={q.id}
              data={q}
              done={!!commonDone[q.id]}
              onToggle={() => setCommonDone(d => ({...d, [q.id]: !d[q.id]}))}
            />
          ))}
        </div>

        <div className="group-label" style={{marginTop: 22}}>Confirm event type</div>
        <TypePicker value={eventType} onChange={setEventType} />

        {eventType && (
          <button className="jumpbtn" onClick={onJump} type="button">
            <span>
              Continue to <strong>{typeMeta.name.toLowerCase()}</strong> questions
            </span>
            <span className="ar">{Icon.arrow}</span>
          </button>
        )}
      </section>

      {/* ─── PHASE 3 — BRANCH ─── */}
      <section className="phase" ref={branchRef}>
        <div className="phase-head">
          <span className="phase-num">Phase 03</span>
          <span className="phase-time">~ 5 min</span>
        </div>
        <h2 className="phase-title">
          By <em>type</em>
          {eventType && (
            <span className="chip">
              <span className="gl">{typeMeta.glyph}</span>
              {typeMeta.name}
            </span>
          )}
        </h2>
        <p className="phase-desc">These swap based on what they’re booking.</p>

        <Branch eventType={eventType} />
      </section>

      {/* ─── PHASE 4 — CLOSE ─── */}
      <section className="phase">
        <div className="phase-head">
          <span className="phase-num">Phase 04</span>
          <span className="phase-time">~ 1 min</span>
        </div>
        <h2 className="phase-title">Close it <em>out</em></h2>

        <div className="script">
          <div className="script-label">Read aloud</div>
          <div className="script-body">
            “Perfect, that’s everything I need. Brenda will send you a quote within
            a few hours. It’ll include a render of what your install would actually
            look like in your venue, so you can see the vision before committing.
            If anything needs tweaking after you see it, we can iterate and discuss
            with Brenda on the call. Sound good?”
          </div>
        </div>

        <div className="qlist">
          <Q
            data={{label: 'Confirm contact', script: 'And is this the best number to reach you at? The email we have on file is … is that correct?'}}
            done={false}
            onToggle={() => {}}
          />
        </div>
      </section>

      {/* ─── End ─── */}
      <div className="endcard">
        <div className="ts">End of call</div>
        <button className="reset" type="button" onClick={reset}>↻ Start new call</button>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
