export interface Env {
  DB: D1Database;
  POLICY_KV: KVNamespace;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    // ===== CORS 预检 =====
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // ===== 1. 获取投保单列表（核保台用）=====
    // GET /api/application/list
    if (pathname === '/api/application/list' && request.method === 'GET') {
      const { results } = await env.DB.prepare(`
        SELECT
          application_no AS applicationNo,
          status,
          apply_at AS applyAt,
          policy_no AS policyNo
        FROM applications
        ORDER BY apply_at DESC
      `).all();

      return json(results || []);
    }

    // ===== 2. 核保通过 =====
    // POST /api/application/:applicationNo/approve
    if (
      pathname.match(/^\/api\/application\/[^/]+\/approve$/) &&
      request.method === 'POST'
    ) {
      const applicationNo = pathname.split('/')[3];

      await env.DB.prepare(`
        UPDATE applications
        SET status = 'APPROVED'
        WHERE application_no = ?
      `).bind(applicationNo).run();

      return json({ ok: true });
    }

    // ===== 3. 核保打回 =====
    // POST /api/application/:applicationNo/reject
    if (
      pathname.match(/^\/api\/application\/[^/]+\/reject$/) &&
      request.method === 'POST'
    ) {
      const applicationNo = pathname.split('/')[3];

      await env.DB.prepare(`
        UPDATE applications
        SET status = 'REJECTED'
        WHERE application_no = ?
      `).bind(applicationNo).run();

      return json({ ok: true });
    }

    // ===== 404 =====
    return new Response('Not Found', {
      status: 404,
      headers: corsHeaders,
    });
  },
};
