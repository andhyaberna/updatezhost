export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') return new Response('Hanya menerima POST', { status: 405 });

    const GAS_URL = "https://script.google.com/macros/s/AKfycbwNI_QGAfkN5jRydn_o8uU7-ARlr2_6POwg2CIRWy4qbSjYzOgnk9RNvE6Ew-II9II/exec?token=FKtBRIlu";

    try {
      const requestBody = await request.text();
      const signature = request.headers.get('Signature') || "";

      const url = new URL(GAS_URL);
      if (signature) url.searchParams.append('moota_signature', signature);

      // STEP 1: POST ke GAS (redirect: manual)
      // GAS memproses doPost() di URL ini, lalu return 302
      const postResponse = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: requestBody,
        redirect: 'manual'
      });

      // STEP 2: Ikuti redirect dengan GET untuk ambil response
      // URL redirect hanya untuk serve hasil doPost(), BUKAN execute ulang
      if (postResponse.status >= 300 && postResponse.status < 400) {
        const location = postResponse.headers.get('Location');
        if (location) {
          const getResponse = await fetch(location, {
            method: 'GET',
            redirect: 'follow'
          });
          const gasResult = await getResponse.text();
          return new Response(gasResult, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' }
          });
        }
      }

      // Jika tidak redirect (langsung 200), return apa adanya
      const gasResult = await postResponse.text();
      return new Response(gasResult, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });

    } catch (error) {
      return new Response(JSON.stringify({
        error: true,
        message: "CF Worker Error: " + String(error)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },
};
