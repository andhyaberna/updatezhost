// Cloudflare Pages Advanced Mode Worker
// Handles POST /webhook/moota, passes everything else to static assets

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Route: POST /webhook/moota → Google Apps Script
    if (url.pathname === '/webhook/moota' && request.method === 'POST') {
      return handleWebhook(request, env.MOOTA_GAS_URL, env.MOOTA_TOKEN);
    }

    // Everything else → pass to static assets
    return env.ASSETS.fetch(request);
  }
};

async function handleWebhook(request, gasUrl, token) {
  if (!gasUrl || !token) {
    return new Response(
      JSON.stringify({ status: 'error', message: 'Missing environment variables (GAS_URL or TOKEN)' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const signature = request.headers.get('Signature') || '';

    const targetUrl = new URL(gasUrl);
    targetUrl.searchParams.append('token', token);
    targetUrl.searchParams.append('moota_signature', signature);

    const body = await request.text();

    const response = await fetch(targetUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });

    const resultText = await response.text();
    return new Response(resultText, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ status: 'error', message: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
