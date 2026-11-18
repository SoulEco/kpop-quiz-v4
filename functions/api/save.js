export async function onRequestPost(context) {
  const { request, env } = context;
  const { code, gen, resultData } = await request.json();

  const key = `CODE_${code.toUpperCase().trim()}`;
  const data = await env.MY_KV.get(key, { type: 'json' });
  if (!data) return new Response(JSON.stringify({ error: '授权码不存在' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  if (data.used_attempts >= data.max_attempts && !data.results[gen]) {
    return new Response(JSON.stringify({ error: '测试次数已用完' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  // 如果是新代际测试，扣减次数；如果是同代际重测，不扣次数
  if (!data.results[gen]) {
    data.used_attempts += 1;
  }
  
  if (!data.results) data.results = {};
  data.results[gen] = resultData;
  data.last_updated = new Date().toISOString();

  await env.MY_KV.put(key, JSON.stringify(data));

  return new Response(JSON.stringify({ success: true, remaining: data.max_attempts - data.used_attempts, result: resultData }), { headers: { 'Content-Type': 'application/json' } });
}