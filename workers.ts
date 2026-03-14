export default {
  async fetch(request, env, ctx) {
    // 1. Pastikan Method POST
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // 2. URL Google Apps Script dari Environment Variables
    // Set via Cloudflare Workers Dashboard > Settings > Variables
    const GAS_URL = env.GAS_URL;
    if (!GAS_URL) {
      return new Response(JSON.stringify({ status: "error", message: "GAS_URL not configured" }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Token keamanan dari Environment Variables
    const SECRET_TOKEN = env.SECRET_TOKEN;
    if (!SECRET_TOKEN) {
      return new Response(JSON.stringify({ status: "error", message: "SECRET_TOKEN not configured" }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      // 3. Ambil Signature dari Header Moota
      const signature = request.headers.get("Signature") || "";

      // 4. Siapkan URL Tujuan dengan Parameter Signature
      const targetUrl = new URL(GAS_URL);
      targetUrl.searchParams.append("token", SECRET_TOKEN);
      targetUrl.searchParams.append("moota_signature", signature);

      // 5. Ambil Body Request (JSON dari Moota)
      const requestBody = await request.text();

      // 6. Forward Request ke Google Apps Script
      const response = await fetch(targetUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody
      });

      // 7. Kembalikan Response dari GAS ke Moota
      const resultText = await response.text();
      return new Response(resultText, {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({ status: "error", message: String(error) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },
};