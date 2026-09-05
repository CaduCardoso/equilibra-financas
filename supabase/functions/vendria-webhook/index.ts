const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VENDRIA_API_KEY = Deno.env.get('VENDRIA_API_KEY')!;
const WEBHOOK_SECRET = Deno.env.get('VENDRIA_WEBHOOK_SECRET')!;

const encoder = new TextEncoder();

function base64url(bytes: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

async function verifyWebhook(req: Request, raw: string) {
  const id = req.headers.get('Webhook-Id') || '';
  const timestamp = req.headers.get('Webhook-Timestamp') || '';
  const signature = req.headers.get('Webhook-Signature') || '';
  const seconds = Number(timestamp);
  if (!id || !seconds || Math.abs(Date.now() / 1000 - seconds) > 300) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(`${id}.${timestamp}.${raw}`));
  return safeEqual(`v1,${base64url(digest)}`, signature);
}

async function supabase(path: string, options: RequestInit = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SERVICE_KEY,
      authorization: `Bearer ${SERVICE_KEY}`,
      'content-type': 'application/json',
      prefer: 'resolution=merge-duplicates,return=minimal',
      ...(options.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`Supabase ${response.status}`);
}

async function getOrder(orderId: string) {
  const response = await fetch(`https://app.vendria.com.br/api/v1/orders/${encodeURIComponent(orderId)}`, {
    headers: { authorization: `Bearer ${VENDRIA_API_KEY}` },
  });
  if (!response.ok) throw new Error(`Vendria ${response.status}`);
  return (await response.json()).data;
}

function findEmail(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  for (const key of ['email', 'buyerEmail', 'customerEmail']) {
    if (typeof record[key] === 'string' && String(record[key]).includes('@')) return String(record[key]).toLowerCase();
  }
  for (const child of Object.values(record)) {
    const found = findEmail(child);
    if (found) return found;
  }
  return null;
}

function identifyPlan(value: unknown) {
  const text = JSON.stringify(value).toLowerCase();
  if (text.includes('planilha')) return 'planilha';
  if (text.includes('anual') || text.includes('79.90') || text.includes('7990')) return 'anual';
  return 'evolui';
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!WEBHOOK_SECRET || !VENDRIA_API_KEY) return new Response('Not configured', { status: 503 });
  const raw = await req.text();
  if (!(await verifyWebhook(req, raw))) return new Response('Invalid signature', { status: 401 });

  const event = JSON.parse(raw);
  try {
    await supabase('webhook_events?on_conflict=event_id', {
      method: 'POST',
      body: JSON.stringify({ event_id: event.id, event_type: event.type, occurred_at: event.occurredAt }),
    });

    const supported = ['order.paid', 'subscription.started', 'subscription.renewed', 'subscription.cancelled', 'subscription.ended'];
    if (!supported.includes(event.type)) return new Response(null, { status: 204 });

    let source = event.data;
    const orderId = event.data?.order?.id || event.data?.subscription?.cycle?.orderId;
    if (orderId) source = { ...event.data, verifiedOrder: await getOrder(orderId) };
    const email = findEmail(source);
    if (!email) throw new Error('Buyer email not found');

    const ended = event.type === 'subscription.ended';
    const pastCancellation = event.type === 'subscription.cancelled';
    const subscription = event.data?.subscription || {};
    await supabase('entitlements?on_conflict=email', {
      method: 'POST',
      body: JSON.stringify({
        email,
        plan: identifyPlan(source),
        status: ended ? 'inactive' : pastCancellation ? 'cancelling' : 'active',
        access_ends_at: subscription.accessEndsAt || null,
        vendria_order_id: orderId || null,
        vendria_subscription_id: subscription.id || null,
        updated_at: event.occurredAt || new Date().toISOString(),
      }),
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Webhook processing failed', event.id, String(error));
    return new Response('Processing failed', { status: 500 });
  }
});
