// Quo (OpenPhone) → discovery pipeline.
//
// Receives the `call.summary.completed` webhook from Quo. Pulls the transcript
// + AI summary. Sends to MiniMax M3 for structured field extraction
// using the Balloonia discovery script as the schema. Formats a Telegram
// packet with click-to-copy fields + render prompts and ships it to Brenda.
//
// Required env vars:
//   MINIMAX_API_KEY     - LLM for field extraction (MiniMax M3, Anthropic-compatible endpoint)
//   TELEGRAM_BOT_TOKEN  - same bot as @Balloonia_Media_Bot
//   BRENDA_CHAT_ID      - Brenda's chat (packet is sent here)
//   DH_CHAT_ID          - DH's chat (packet is ALSO sent here; set both to notify both)
//   QUO_API_KEY         - Quo API for fetching transcript by call id
//   QUO_SIGNING_KEY     - (optional) webhook signature secret if Quo signs
//
// Quo webhook setup: POST https://balloonia.events/api/quo-webhook
//   on event `call.summary.completed` (and optionally `call.transcript.completed`)
//
//   THE URL MATTERS AND IT HAS BITTEN US TWICE. Vercel serves ONE of the two
//   hostnames and 30x-redirects the other, and webhook senders do not follow
//   redirects — a POST to the redirecting host is silently dropped. Which host
//   is canonical FLIPS whenever the primary domain changes in the Vercel
//   dashboard (2026-07: apex -> www, so we registered www; 2026-08: www -> apex,
//   which killed delivery again).
//
//   Never trust this comment. Ask the endpoint:
//     curl -s 'https://balloonia.events/api/quo-webhook?health=1'
//   The health report lists every webhook Quo has registered, probes each one,
//   and flags any that redirect. Whatever it reports as `reachable` is the URL
//   that belongs in the Quo dashboard.

export const config = { runtime: 'edge' };

const VERSION = 'quo-webhook v4';

type ExtractedLead = {
  event_type: string;
  event_date: string;
  venue: string;
  city: string;
  headcount: string;
  budget: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  style: string;
  palette: string;
  references: string;
  wants: string[];
  must_avoid: string[];
  decision_timeline: string;
  red_flags: string;
  render_prompts: string[];
};

const SYSTEM_PROMPT = `You are an extraction agent for Balloonia Events, a custom balloon installation business in London Ontario.

You receive transcripts of discovery calls between Blake (sales rep) and a prospect.
Your job: extract structured fields needed for Brenda to quote within 24 hours, plus generate 2-3 render prompts.

Return ONLY a valid JSON object matching this schema (no markdown, no commentary):

{
  "event_type": "Wedding | Corporate | Shower | Birthday | Graduation | Other",
  "event_date": "YYYY-MM-DD or descriptive if not confirmed",
  "venue": "venue name and any helpful detail (indoor/outdoor)",
  "city": "city name",
  "headcount": "rough guest count or descriptive",
  "budget": "tier from call or descriptive",
  "contact_name": "first and last name",
  "contact_email": "email",
  "contact_phone": "phone in any format",
  "style": "boho/classic/modern/etc - what they described",
  "palette": "colours mentioned, hex codes if any, plus general description",
  "references": "Pinterest links, IG handles, or descriptions of references they shared",
  "wants": ["each install piece they want as a separate item"],
  "must_avoid": ["each constraint as a separate item, or empty array"],
  "decision_timeline": "when they need to book by, or what they said about timing",
  "red_flags": "budget vs scope mismatch, rush date, missing decision maker, vague on budget - or 'None'",
  "render_prompts": [
    "full prompt 1 ready to paste into image gen, with all variables filled in from the call",
    "full prompt 2",
    "(optional) full prompt 3"
  ]
}

For render_prompts: write 2-3 photorealistic image generation prompts in this style:
"Photorealistic photo of a [install type] at a [venue type]. Install: [details with dimensions]. Palette: [colours]. Style: [style modifiers]. [Setting details]. [Lighting]. Wide shot, professional event photography, no people in frame."

If a field is missing from the call, return empty string "" or "(not captured)". Never invent data.`;

// ---- LLM provider: MiniMax M3 via its Anthropic-compatible endpoint ----
// URL and model are env-overridable so the provider can be repointed without a code change.
const LLM_API_URL = process.env.LLM_API_URL || 'https://api.minimax.io/anthropic/v1/messages';
const LLM_MODEL = process.env.LLM_MODEL || 'MiniMax-M3';

// The edge runtime kills the whole invocation at ~25s. A slow provider must
// never eat that budget, or the function dies mid-await and NOTHING is sent —
// not even the raw fallback. Every outbound call is time-boxed.
const LLM_TIMEOUT_MS = 12_000;
const QUO_TIMEOUT_MS = 6_000;
const TELEGRAM_TIMEOUT_MS = 8_000;

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number, label: string): Promise<Response> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    throw new Error(aborted ? `${label} timed out after ${ms}ms` : `${label} failed: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timer);
  }
}

async function extractFields(transcript: string): Promise<ExtractedLead> {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) throw new Error('MINIMAX_API_KEY missing');
  const r = await fetchWithTimeout(LLM_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      // M-series can emit a `thinking` block before the `text` block, so keep
      // max_tokens generous enough for any reasoning plus the JSON payload.
      model: LLM_MODEL,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Extract from this discovery call transcript:\n\n${transcript}`,
        },
      ],
    }),
  }, LLM_TIMEOUT_MS, 'LLM API');
  if (!r.ok) {
    throw new Error(`LLM API ${r.status}: ${(await r.text()).slice(0, 300)}`);
  }
  const data = (await r.json()) as { content: { type: string; text: string }[] };
  const text = data.content.find((c) => c.type === 'text')?.text ?? '';
  // Trim any accidental code fences
  const json = text.replace(/^```json\s*|\s*```$/g, '').trim();
  return JSON.parse(json) as ExtractedLead;
}

function buildTelegramMessage(lead: ExtractedLead, callMeta: { id: string; duration?: string; recordingUrl?: string }): string {
  const lines: string[] = [];
  const code = (v: string) => '`' + (v || '(empty)').replace(/`/g, 'ˋ') + '`';

  lines.push('🎈 *NEW LEAD PACKET*');
  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push(`📞 Call: ${mdEscape(lead.contact_name) || '(name?)'} · ${callMeta.duration || '?'}`);
  // Quo deep links are full of underscores, which is exactly what the legacy
  // Markdown parser chokes on.
  if (callMeta.recordingUrl) lines.push(`🎵 Recording: ${mdEscape(callMeta.recordingUrl)}`);
  lines.push('');

  lines.push('*CONTACT*');
  lines.push(`Name: ${code(lead.contact_name)}`);
  lines.push(`Email: ${code(lead.contact_email)}`);
  lines.push(`Phone: ${code(lead.contact_phone)}`);
  lines.push('');

  lines.push('*EVENT*');
  lines.push(`Type: ${code(lead.event_type)}`);
  lines.push(`Date: ${code(lead.event_date)}`);
  lines.push(`Venue: ${code(lead.venue)}`);
  lines.push(`City: ${code(lead.city)}`);
  lines.push(`Headcount: ${code(lead.headcount)}`);
  lines.push(`Budget: ${code(lead.budget)}`);
  lines.push('');

  lines.push('*VIBE*');
  lines.push(`Style: ${code(lead.style)}`);
  lines.push(`Palette: ${code(lead.palette)}`);
  lines.push(`References: ${code(lead.references)}`);
  lines.push('');

  if (lead.wants?.length) {
    lines.push('*WANTS*');
    lead.wants.forEach((w) => lines.push(`• ${mdEscape(w)}`));
    lines.push('');
  }

  if (lead.must_avoid?.length) {
    lines.push('*MUST AVOID*');
    lead.must_avoid.forEach((m) => lines.push(`• ${mdEscape(m)}`));
    lines.push('');
  }

  lines.push('*DECISION TIMELINE*');
  lines.push(mdEscape(lead.decision_timeline) || '(not captured)');
  lines.push('');

  lines.push('*RED FLAGS*');
  lines.push(mdEscape(lead.red_flags) || 'None');
  lines.push('');

  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push('*RENDER PROMPTS* (tap to copy, paste into Nano Banana)');
  lines.push('');
  lead.render_prompts?.forEach((p, i) => {
    lines.push(`*${i + 1}.*`);
    lines.push('```');
    lines.push((p || '').replace(/`/g, 'ˋ'));
    lines.push('```');
    lines.push('');
  });

  return lines.join('\n');
}

// Telegram's legacy Markdown parser rejects the ENTIRE message with a 400 if
// these characters appear unbalanced anywhere in it. Call transcripts are full
// of them, which made delivery depend on the wording of the call.
function mdEscape(v: string): string {
  return (v || '').replace(/([_*[`])/g, '\\$1');
}

// Telegram caps a message at 4096 characters. Splitting naively can cut a ```
// fence in half, which breaks parsing on both halves, so carry the fence over.
function chunkForTelegram(text: string, limit = 3500): string[] {
  const chunks: string[] = [];
  let buf = '';
  let fenceOpen = false;

  const flush = () => {
    if (!buf.trim()) {
      buf = '';
      return;
    }
    chunks.push(fenceOpen ? buf + '```' : buf);
    buf = fenceOpen ? '```\n' : '';
  };

  for (const rawLine of text.split('\n')) {
    // A single line longer than the limit still has to be broken up.
    const pieces =
      rawLine.length > limit ? rawLine.match(new RegExp(`.{1,${limit}}`, 'g')) || [rawLine] : [rawLine];
    for (const line of pieces) {
      if ((buf + line + '\n').length > limit) flush();
      buf += line + '\n';
      if (line.trim() === '```') fenceOpen = !fenceOpen;
    }
  }
  if (buf.trim()) chunks.push(fenceOpen ? buf + '```' : buf);
  return chunks;
}

async function tgPost(
  token: string,
  chatId: string,
  text: string,
  parseMode?: string,
): Promise<{ ok: boolean; status: number; body: string; retryAfter?: number }> {
  const payload: Record<string, unknown> = { chat_id: chatId, text, disable_web_page_preview: true };
  if (parseMode) payload.parse_mode = parseMode;

  let r: Response;
  try {
    r = await fetchWithTimeout(
      `https://api.telegram.org/bot${token}/sendMessage`,
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) },
      TELEGRAM_TIMEOUT_MS,
      'Telegram sendMessage',
    );
  } catch (err) {
    return { ok: false, status: 0, body: err instanceof Error ? err.message : 'network error' };
  }

  const body = await r.text();
  let retryAfter: number | undefined;
  try {
    retryAfter = JSON.parse(body)?.parameters?.retry_after;
  } catch {
    // non-JSON error body, nothing to read
  }
  return { ok: r.ok, status: r.status, body: body.slice(0, 300), retryAfter };
}

// Returns whether every chunk landed. A dropped packet is a lost lead, so this
// never gives up after one try: bad formatting falls back to plain text, rate
// limits wait out their retry_after, and network blips get one more shot.
export async function sendTelegram(chatId: string, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN missing');

  let allDelivered = true;

  for (const chunk of chunkForTelegram(text)) {
    let delivered = false;

    const attempts: { parseMode?: string; label: string }[] = [
      { parseMode: 'Markdown', label: 'markdown' },
      { parseMode: undefined, label: 'plain' },
      { parseMode: undefined, label: 'plain-retry' },
    ];

    for (const attempt of attempts) {
      let res = await tgPost(token, chatId, chunk, attempt.parseMode);
      if (!res.ok && res.status === 429) {
        const wait = Math.min((res.retryAfter ?? 1) * 1000, 5000);
        console.warn(`[telegram] 429 for ${chatId}, waiting ${wait}ms`);
        await sleep(wait);
        res = await tgPost(token, chatId, chunk, attempt.parseMode);
      }
      if (res.ok) {
        delivered = true;
        if (attempt.label !== 'markdown') {
          console.warn(`[telegram] delivered to ${chatId} as ${attempt.label} after a formatting failure`);
        }
        break;
      }
      console.error(`[telegram] send to ${chatId} failed (${attempt.label}) ${res.status}: ${res.body}`);
      if (attempt.label !== 'markdown') await sleep(400);
    }

    if (!delivered) allDelivered = false;
  }

  return allDelivered;
}

async function fetchQuoTranscript(callId: string): Promise<string> {
  const key = process.env.QUO_API_KEY;
  if (!key) throw new Error('QUO_API_KEY missing');

  // Try transcript first, fall back to summary if transcript not ready.
  const tr = await fetchWithTimeout(
    `https://api.openphone.com/v1/call-transcripts/${callId}`,
    { headers: { Authorization: key } },
    QUO_TIMEOUT_MS,
    'Quo transcript fetch',
  );
  if (tr.ok) {
    const body = (await tr.json()) as {
      data?: {
        dialogue?: { content?: string; userId?: string; identifier?: string }[];
        transcript?: string;
        status?: string;
      };
    };
    const d = body.data;
    if (d?.transcript) return d.transcript;
    if (Array.isArray(d?.dialogue) && d!.dialogue!.length) {
      return d!.dialogue!
        .map((line) => {
          const who = line.userId ? 'Blake' : 'Prospect';
          return `${who}: ${line.content || ''}`;
        })
        .join('\n');
    }
  } else if (tr.status !== 404) {
    throw new Error(`Quo transcript fetch ${tr.status}: ${await tr.text()}`);
  }

  // Transcript missing or 404 — fall back to AI summary.
  const sm = await fetchWithTimeout(
    `https://api.openphone.com/v1/call-summaries/${callId}`,
    { headers: { Authorization: key } },
    QUO_TIMEOUT_MS,
    'Quo summary fetch',
  );
  if (sm.ok) {
    const body = (await sm.json()) as {
      data?: { summary?: string[] | string; nextSteps?: string[] };
    };
    const d = body.data;
    const summary = Array.isArray(d?.summary) ? d!.summary!.join('\n') : d?.summary || '';
    const next = Array.isArray(d?.nextSteps) ? d!.nextSteps!.join('\n') : '';
    const combined = [summary && `SUMMARY:\n${summary}`, next && `NEXT STEPS:\n${next}`]
      .filter(Boolean)
      .join('\n\n');
    if (combined) return combined;
  } else if (sm.status !== 404) {
    throw new Error(`Quo summary fetch ${sm.status}: ${await sm.text()}`);
  }

  return '(no transcript or summary available yet — Quo may still be processing)';
}

// ---------------------------------------------------------------------------
// Health report: GET /api/quo-webhook?health=1
//
// This exists because the pipeline has failed twice in a way that produced NO
// signal anywhere: a webhook registered against a hostname that redirects, so
// Quo's POST died before it ever reached this code. Nothing here logged, and
// Quo's own delivery log looked fine. The report below answers, without
// sending anyone a message, the four questions worth asking:
//   is the config present, can the bot reach its chats, what URL does Quo
//   actually have on file, and is that URL alive or does it redirect.
// It returns no secrets: booleans, a bot handle, and masked chat ids.
// ---------------------------------------------------------------------------

type ProbeResult = { url: string; status: number | string; redirectsTo?: string; verdict: string };

async function probeUrl(target: string): Promise<ProbeResult> {
  try {
    const r = await fetchWithTimeout(target, { method: 'GET', redirect: 'manual' }, 6_000, 'probe');
    const redirectsTo = r.headers.get('location') || undefined;
    let verdict: string;
    if (r.status >= 300 && r.status < 400) {
      verdict = 'BROKEN - this URL redirects, and webhook senders do not follow redirects. Register the redirect target instead.';
    } else if (r.status === 405) {
      // Our own handler answers GET with 405, so this is the healthy signal.
      verdict = 'reachable';
    } else {
      verdict = `unexpected status ${r.status} - expected 405 from this handler`;
    }
    return { url: target, status: r.status, redirectsTo, verdict };
  } catch (err) {
    return { url: target, status: 'error', verdict: err instanceof Error ? err.message : 'probe failed' };
  }
}

function maskChat(id: string): string {
  return id.length <= 4 ? '****' : `...${id.slice(-4)}`;
}

// Chat ids come from env and have arrived with trailing whitespace before,
// which would split the dedup set and double-send.
function chatTargets(): string[] {
  return [...new Set([process.env.BRENDA_CHAT_ID, process.env.DH_CHAT_ID].map((v) => v?.trim()).filter(Boolean))] as string[];
}

async function telegramHealth(): Promise<Record<string, unknown>> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { configured: false, verdict: 'TELEGRAM_BOT_TOKEN missing' };

  const out: Record<string, unknown> = { configured: true };

  try {
    const r = await fetchWithTimeout(`https://api.telegram.org/bot${token}/getMe`, {}, TELEGRAM_TIMEOUT_MS, 'Telegram getMe');
    const j = (await r.json()) as any;
    out.bot = j?.ok ? `@${j.result?.username}` : `getMe failed: ${String(j?.description).slice(0, 120)}`;
  } catch (err) {
    out.bot = err instanceof Error ? err.message : 'getMe failed';
  }

  const targets = chatTargets();
  out.chats = await Promise.all(
    targets.map(async (chatId) => {
      try {
        const r = await fetchWithTimeout(
          `https://api.telegram.org/bot${token}/getChat`,
          { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: chatId }) },
          TELEGRAM_TIMEOUT_MS,
          'Telegram getChat',
        );
        const j = (await r.json()) as any;
        return j?.ok
          ? { chat: maskChat(chatId), reachable: true, name: j.result?.username || j.result?.first_name || j.result?.title }
          : { chat: maskChat(chatId), reachable: false, error: String(j?.description || r.status).slice(0, 160) };
      } catch (err) {
        return { chat: maskChat(chatId), reachable: false, error: err instanceof Error ? err.message : 'getChat failed' };
      }
    }),
  );

  const chats = out.chats as { reachable: boolean }[];
  out.verdict = !chats.length
    ? 'no chat ids configured - packets have nowhere to go'
    : chats.every((c) => c.reachable)
      ? 'ok'
      : 'a configured chat is unreachable - the bot was blocked or the id is wrong';
  return out;
}

async function quoWebhookHealth(canonical: string): Promise<Record<string, unknown>> {
  const key = process.env.QUO_API_KEY;
  if (!key) return { configured: false, verdict: 'UNKNOWN - QUO_API_KEY missing, cannot check what Quo has registered' };

  try {
    const r = await fetchWithTimeout(
      'https://api.openphone.com/v1/webhooks',
      { headers: { Authorization: key } },
      QUO_TIMEOUT_MS,
      'Quo webhook list',
    );
    if (!r.ok) {
      return {
        configured: true,
        apiStatus: r.status,
        verdict: `UNKNOWN - could not list webhooks: ${r.status} ${(await r.text()).slice(0, 160)}. Check the Quo dashboard directly.`,
      };
    }

    const body = (await r.json()) as any;
    // Shape is not guaranteed: this API returned 200 with nothing usable on
    // 2026-08-22 while a webhook was registered and firing, so surface the
    // actual response keys rather than silently reading it as "none".
    const responseShape = body && typeof body === 'object' ? Object.keys(body) : typeof body;
    const all: any[] = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
    const ours = all.filter((h) => typeof h?.url === 'string' && h.url.includes('quo-webhook'));
    const others = all
      .filter((h) => !ours.includes(h))
      .map((h) => ({ url: h?.url, events: h?.events, status: h?.status }));

    const registered = await Promise.all(
      ours.map(async (h) => ({
        url: h.url,
        events: h.events,
        status: h.status,
        matchesCanonical: h.url === canonical,
        probe: await probeUrl(h.url),
      })),
    );

    // An empty list is NOT evidence that no webhook exists — dashboard-created
    // webhooks did not show up here. Only a webhook we can actually see and
    // probe is worth calling broken; anything else is UNKNOWN, and a monitor
    // that cries wolf daily is a monitor everyone learns to ignore.
    let verdict: string;
    if (!all.length) {
      verdict = 'UNKNOWN - this API returned no webhooks. It has done that while one was registered and firing, so check the Quo dashboard events log before believing it.';
    } else if (!registered.length) {
      verdict = `UNKNOWN - Quo returned ${all.length} webhook(s), none matching quo-webhook. See otherWebhooks.`;
    } else if (registered.every((h) => h.probe.verdict === 'reachable')) {
      verdict = 'ok';
    } else {
      verdict = 'BROKEN - a registered webhook URL does not answer. See probe.verdict on each entry.';
    }
    return {
      configured: true,
      canonical,
      apiStatus: r.status,
      responseShape,
      totalWebhooks: all.length,
      registered,
      otherWebhooks: others,
      dashboard: 'https://my.quo.com/settings/webhooks - the events log there is authoritative',
      verdict,
    };
  } catch (err) {
    return { configured: true, verdict: `UNKNOWN - ${err instanceof Error ? err.message : 'webhook list failed'}` };
  }
}

export async function healthReport(url: URL): Promise<Record<string, unknown>> {
  const canonical = `${url.origin}${url.pathname}`;
  const [telegram, quo, self] = await Promise.all([
    telegramHealth(),
    quoWebhookHealth(canonical),
    probeUrl(canonical),
  ]);

  return {
    version: VERSION,
    canonical,
    env: {
      MINIMAX_API_KEY: !!process.env.MINIMAX_API_KEY,
      TELEGRAM_BOT_TOKEN: !!process.env.TELEGRAM_BOT_TOKEN,
      QUO_API_KEY: !!process.env.QUO_API_KEY,
      BRENDA_CHAT_ID: !!process.env.BRENDA_CHAT_ID,
      DH_CHAT_ID: !!process.env.DH_CHAT_ID,
    },
    self,
    telegram,
    quo,
  };
}

export default async function handler(req: Request): Promise<Response> {
  // Log every hit so we can see in Vercel logs whether Quo is reaching us.
  console.log('[quo-webhook] called, method:', req.method);
  console.log('[quo-webhook] env check:', {
    hasMinimax: !!process.env.MINIMAX_API_KEY,
    hasTgToken: !!process.env.TELEGRAM_BOT_TOKEN,
    hasQuoKey: !!process.env.QUO_API_KEY,
    hasBrendaChat: !!process.env.BRENDA_CHAT_ID,
    hasDhChat: !!process.env.DH_CHAT_ID,
  });

  if (req.method === 'GET') {
    const url = new URL(req.url);
    if (url.searchParams.get('health') === '1') {
      const report = await healthReport(url);
      return new Response(JSON.stringify(report, null, 2), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
  }

  if (req.method !== 'POST') {
    return new Response(`Method not allowed (${VERSION}) - try ?health=1`, { status: 405 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    console.error('[quo-webhook] invalid JSON');
    return new Response('Invalid JSON', { status: 400 });
  }

  console.log('[quo-webhook] payload:', JSON.stringify(body).slice(0, 1500));

  // Send every packet to everyone configured — Brenda AND DH (dedup, drop blanks).
  const targets = chatTargets();
  if (!targets.length) {
    console.error('[quo-webhook] no chat target configured');
    return new Response('No target chat configured', { status: 500 });
  }
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('[quo-webhook] TELEGRAM_BOT_TOKEN missing');
    return new Response('TELEGRAM_BOT_TOKEN missing', { status: 500 });
  }
  // Fan one message out to every configured chat, and remember whether any of
  // it landed. A packet Telegram rejected is a lost lead, so the response has
  // to tell the truth instead of reporting a cheerful 200 either way.
  let anyDelivered = false;
  const broadcast = async (text: string): Promise<boolean> => {
    const results = await Promise.all(
      targets.map((t) =>
        sendTelegram(t, text).catch((err) => {
          console.error('[quo-webhook] send threw for', t, err instanceof Error ? err.message : err);
          return false;
        }),
      ),
    );
    if (results.some(Boolean)) anyDelivered = true;
    return results.every(Boolean);
  };

  // Quo v3 webhook payload shape:
  //   {
  //     id, object: "event", type, createdAt, apiVersion,
  //     data: { object: {...event-specific...}, deepLink? }
  //   }
  const eventType: string = body?.type ?? '';
  const eventObj = body?.data?.object ?? {};
  const deepLink: string | undefined = body?.data?.deepLink;

  // call.summary.completed: data.object is a callSummary with .callId
  // call.transcript.completed: data.object is a call (with .id) containing callTranscript
  const callId: string | undefined = eventObj?.callId ?? eventObj?.id;

  console.log('[quo-webhook] parsed:', { eventType, callId, hasDeepLink: !!deepLink });

  if (!callId) {
    console.warn('[quo-webhook] no callId found');
    await broadcast(
      `⚠️ Quo webhook fired (${eventType}) but no callId.\n\n\`\`\`\n${JSON.stringify(body, null, 2).slice(0, 2500)}\n\`\`\``,
    );
    return new Response('No callId', { status: 200 });
  }

  try {
    // Collect every signal available from this payload + the previous event for the same call.
    let transcript = '';
    let summaryText = '';
    let nextStepsText = '';

    // call.transcript.completed: full dialogue inline at data.object.callTranscript.dialogue
    const dialogue = eventObj?.callTranscript?.dialogue;
    if (Array.isArray(dialogue)) {
      transcript = dialogue
        .map((d: any) => {
          const who = d.speaker === 1 || d.userId ? 'Blake' : 'Prospect';
          return `${who}: ${d.content || ''}`;
        })
        .join('\n');
    } else if (typeof eventObj?.transcript === 'string') {
      transcript = eventObj.transcript;
    }

    // call.summary.completed: summary array + nextSteps array
    if (Array.isArray(eventObj?.summary)) {
      summaryText = eventObj.summary.join('\n');
    } else if (typeof eventObj?.summary === 'string') {
      summaryText = eventObj.summary;
    }
    if (Array.isArray(eventObj?.nextSteps)) {
      nextStepsText = eventObj.nextSteps.join('\n');
    }

    // If neither came inline (or both arrived but were empty), pull transcript from API.
    if (!transcript && !summaryText) {
      transcript = await fetchQuoTranscript(callId);
    }

    const fullText = [
      summaryText && `SUMMARY:\n${summaryText}`,
      nextStepsText && `NEXT STEPS:\n${nextStepsText}`,
      transcript && `TRANSCRIPT:\n${transcript}`,
    ].filter(Boolean).join('\n\n');

    if (!fullText.trim()) {
      throw new Error('No transcript or summary content available');
    }

    const mediaUrl = eventObj?.media?.[0]?.url;
    const duration = eventObj?.media?.[0]?.duration ?? eventObj?.duration;
    const durationStr = duration ? `${Math.round(duration / 60)} min` : undefined;

    // Extraction failing (dead key, provider outage, bad JSON) must NEVER cost
    // us the lead. Fall back to shipping the raw call content so Brenda can
    // still quote from it.
    let lead: ExtractedLead | null = null;
    let llmError = '';
    try {
      lead = await extractFields(fullText);
    } catch (err) {
      llmError = err instanceof Error ? err.message : 'unknown LLM error';
      console.error('[quo-webhook] extraction failed, sending raw packet:', llmError);
    }

    if (lead) {
      const message = buildTelegramMessage(lead, {
        id: callId,
        duration: durationStr,
        recordingUrl: deepLink || mediaUrl,
      });
      await broadcast(message);
    } else {
      const trimmed = fullText.length > 3000 ? fullText.slice(0, 3000) + '\n…(truncated)' : fullText;
      const raw = trimmed.replace(/`/g, 'ˋ');
      await broadcast(
        [
          '🎈 *NEW LEAD — RAW* (auto-extraction is down, this is the unprocessed call content)',
          '━━━━━━━━━━━━━━━━━━',
          durationStr ? `📞 ${durationStr}` : '',
          deepLink || mediaUrl ? `🎵 ${deepLink || mediaUrl}` : '',
          '',
          '```',
          raw,
          '```',
          '',
          `_extractor error: ${mdEscape(llmError.slice(0, 300))}_`,
        ]
          .filter(Boolean)
          .join('\n'),
      );
    }

    return new Response(
      JSON.stringify({
        ok: anyDelivered,
        callId,
        eventType,
        degraded: !lead,
        delivered: anyDelivered,
        llmError: llmError || undefined,
      }),
      {
        // Nothing reached Telegram. Answer 500 so Quo retries us — a retry is
        // another shot at the lead, a 200 here would bury it.
        status: anyDelivered ? 200 : 500,
        headers: { 'content-type': 'application/json' },
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    console.error('[quo-webhook] pipeline error:', msg);
    await broadcast(
      `⚠️ Discovery pipeline error for call ${callId} (${eventType}): ${msg}\n\nManually review: ${deepLink || '(no deep link)'}`,
    );
    // If the alert made it to Telegram a human already knows, so return 200 and
    // spare Quo the retries. If it did not, 500 buys us another delivery.
    return new Response(JSON.stringify({ error: msg, delivered: anyDelivered }), {
      status: anyDelivered ? 200 : 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
