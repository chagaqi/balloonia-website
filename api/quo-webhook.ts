// Quo (OpenPhone) → discovery pipeline.
//
// Receives the `call.summary.completed` webhook from Quo. Pulls the transcript
// + AI summary. Sends to Claude Haiku 4.5 for structured field extraction
// using the Balloonia discovery script as the schema. Formats a Telegram
// packet with click-to-copy fields + render prompts and ships it to Brenda.
//
// Required env vars:
//   ANTHROPIC_API_KEY   - Claude API
//   TELEGRAM_BOT_TOKEN  - same bot as @Balloonia_Media_Bot
//   BRENDA_CHAT_ID      - target chat (set DH_CHAT_ID instead for testing)
//   QUO_API_KEY         - Quo API for fetching transcript by call id
//   QUO_SIGNING_KEY     - (optional) webhook signature secret if Quo signs
//
// Quo webhook setup: POST https://balloonia.events/api/quo-webhook
//   on event `call.summary.completed`

export const config = { runtime: 'edge' };

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

async function extractFields(transcript: string): Promise<ExtractedLead> {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Extract from this discovery call transcript:\n\n${transcript}`,
        },
      ],
    }),
  });
  if (!r.ok) {
    throw new Error(`Anthropic API ${r.status}: ${await r.text()}`);
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
  lines.push(`📞 Call: ${lead.contact_name || '(name?)'} · ${callMeta.duration || '?'}`);
  if (callMeta.recordingUrl) lines.push(`🎵 Recording: ${callMeta.recordingUrl}`);
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
    lead.wants.forEach((w) => lines.push(`• ${w}`));
    lines.push('');
  }

  if (lead.must_avoid?.length) {
    lines.push('*MUST AVOID*');
    lead.must_avoid.forEach((m) => lines.push(`• ${m}`));
    lines.push('');
  }

  lines.push('*DECISION TIMELINE*');
  lines.push(lead.decision_timeline || '(not captured)');
  lines.push('');

  lines.push('*RED FLAGS*');
  lines.push(lead.red_flags || 'None');
  lines.push('');

  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push('*RENDER PROMPTS* (tap to copy, paste into Nano Banana)');
  lines.push('');
  lead.render_prompts?.forEach((p, i) => {
    lines.push(`*${i + 1}.*`);
    lines.push('```');
    lines.push(p);
    lines.push('```');
    lines.push('');
  });

  return lines.join('\n');
}

async function sendTelegram(chatId: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN missing');

  // Telegram has a 4096-character limit per message. Split if needed.
  const chunks: string[] = [];
  let buf = '';
  for (const line of text.split('\n')) {
    if ((buf + line + '\n').length > 3800) {
      chunks.push(buf);
      buf = '';
    }
    buf += line + '\n';
  }
  if (buf.trim()) chunks.push(buf);

  for (const chunk of chunks) {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: chunk,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });
    if (!r.ok) {
      const errText = await r.text();
      console.error('Telegram send failed:', r.status, errText);
    }
  }
}

async function fetchQuoTranscript(callId: string): Promise<string> {
  const key = process.env.QUO_API_KEY;
  if (!key) throw new Error('QUO_API_KEY missing');

  const r = await fetch(`https://api.openphone.com/v1/calls/${callId}/transcriptions`, {
    headers: { Authorization: key },
  });
  if (!r.ok) throw new Error(`Quo transcript fetch ${r.status}: ${await r.text()}`);
  const data = (await r.json()) as {
    data?: { dialogue?: { speaker?: string; content?: string }[]; transcript?: string }[];
  };
  const tr = data.data?.[0];
  if (!tr) return '(no transcript available)';
  if (tr.transcript) return tr.transcript;
  if (tr.dialogue) {
    return tr.dialogue.map((d) => `${d.speaker || '?'}: ${d.content || ''}`).join('\n');
  }
  return JSON.stringify(tr);
}

export default async function handler(req: Request): Promise<Response> {
  // Log every hit so we can see in Vercel logs whether Quo is reaching us.
  console.log('[quo-webhook] called, method:', req.method);
  console.log('[quo-webhook] env check:', {
    hasAnthropic: !!process.env.ANTHROPIC_API_KEY,
    hasTgToken: !!process.env.TELEGRAM_BOT_TOKEN,
    hasQuoKey: !!process.env.QUO_API_KEY,
    hasBrendaChat: !!process.env.BRENDA_CHAT_ID,
    hasDhChat: !!process.env.DH_CHAT_ID,
  });

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    console.error('[quo-webhook] invalid JSON');
    return new Response('Invalid JSON', { status: 400 });
  }

  console.log('[quo-webhook] payload:', JSON.stringify(body).slice(0, 1500));

  const target = process.env.BRENDA_CHAT_ID || process.env.DH_CHAT_ID;
  if (!target) {
    console.error('[quo-webhook] no chat target configured');
    return new Response('No target chat configured', { status: 500 });
  }
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('[quo-webhook] TELEGRAM_BOT_TOKEN missing');
    return new Response('TELEGRAM_BOT_TOKEN missing', { status: 500 });
  }

  // Quo v3 webhook payload shape:
  //   { object: { type, data: { object: {...event-specific fields...}, deepLink? } } }
  const event = body?.object ?? body;
  const eventType: string = event?.type ?? '';
  const eventData = event?.data?.object ?? {};
  const deepLink: string | undefined = event?.data?.deepLink;
  const callId: string | undefined = eventData?.callId ?? eventData?.id;

  console.log('[quo-webhook] parsed:', { eventType, callId, hasDeepLink: !!deepLink });

  if (!callId) {
    console.warn('[quo-webhook] no callId found');
    await sendTelegram(
      target,
      `⚠️ Quo webhook fired but no callId.\n\nRaw payload:\n\`\`\`\n${JSON.stringify(body, null, 2).slice(0, 2500)}\n\`\`\``,
    );
    return new Response('No callId', { status: 200 });
  }

  try {
    // Pull whatever's inline in the event, plus the full transcript via API.
    // Different event types give us different things; combine everything available.
    const inlineSummary: string[] | string = eventData?.summary ?? '';
    const inlineNextSteps: string[] = eventData?.nextSteps ?? [];
    const inlineDialogue = eventData?.dialogue;

    let transcript = '';
    if (inlineDialogue && Array.isArray(inlineDialogue)) {
      transcript = inlineDialogue.map((d: any) => `${d.speaker || d.identifier || '?'}: ${d.content || d.text || ''}`).join('\n');
    } else if (typeof eventData?.transcript === 'string') {
      transcript = eventData.transcript;
    } else {
      // Fall back to fetching from Quo API
      transcript = await fetchQuoTranscript(callId);
    }

    const summaryText = Array.isArray(inlineSummary) ? inlineSummary.join('\n') : (inlineSummary || '');
    const nextStepsText = inlineNextSteps.length ? inlineNextSteps.join('\n') : '';

    const fullText = [
      summaryText && `SUMMARY:\n${summaryText}`,
      nextStepsText && `NEXT STEPS:\n${nextStepsText}`,
      transcript && `TRANSCRIPT:\n${transcript}`,
    ].filter(Boolean).join('\n\n');

    if (!fullText.trim()) {
      throw new Error('No transcript or summary content available');
    }

    const lead = await extractFields(fullText);

    const duration = eventData?.duration
      ? `${Math.round(eventData.duration / 60)} min`
      : undefined;

    const message = buildTelegramMessage(lead, { id: callId, duration, recordingUrl: deepLink });
    await sendTelegram(target, message);

    return new Response(JSON.stringify({ ok: true, callId }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    console.error('[quo-webhook] pipeline error:', msg);
    await sendTelegram(
      target,
      `⚠️ Discovery pipeline error for call ${callId}: ${msg}\n\nManually review: ${deepLink || '(no deep link)'}`,
    );
    // Return 200 so Quo doesn't retry endlessly on an error we already handled.
    return new Response(JSON.stringify({ error: msg }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
}
