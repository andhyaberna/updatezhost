interface Env {
  MOOTA_GAS_URL: string;
  MOOTA_TOKEN: string;
  MOOTA2_GAS_URL: string;
  MOOTA2_TOKEN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Route: /webhook/moota → GAS endpoint A (utama)
    if (path === '/webhook/moota') {
      return handleMootaWebhook(request, env.MOOTA_GAS_URL, env.MOOTA_TOKEN);
    }

    // Route: /webhook/moota2 → GAS endpoint B (sebelumnya worker terpisah)
    if (path === '/webhook/moota2') {
      return handleMootaWebhook(request, env.MOOTA2_GAS_URL, env.MOOTA2_TOKEN);
    }

    // Fallback — biarkan Cloudflare Pages handle static assets
    return new Response('Not Found', { status: 404 });
  }
};

/**
 * Forward POST request dari Moota ke Google Apps Script.
 * Menyertakan Signature header sebagai query param agar bisa dibaca oleh GAS.
 */
async function handleMootaWebhook(
  request: Request, gasUrl: string, token: string
): Promise<Response> {
  // Hanya terima POST
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ status: 'error', message: 'Method Not Allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
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