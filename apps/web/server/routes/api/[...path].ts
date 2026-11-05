/**
 * Same-origin proxy to the NestJS API. Cookies stay first-party (no CORS), SSR requests reach the API through the
 * same path with forwarded cookies, and the shared secret keeps the API's own public address closed to everyone else.
 *
 * Buffers the upstream response instead of streaming it (h3's `proxyRequest` streams/chunks the response): some
 * cPanel Phusion Passenger builds fail to relay a chunked Node response over the app's unix socket and substitute
 * their own generic "User callback error" page. Buffering sends a plain response with a real Content-Length, which
 * Passenger relays correctly. API responses here are small JSON, so buffering has no meaningful cost.
 */
export default defineEventHandler(async (event) => {
  const { apiInternalUrl } = useRuntimeConfig(event);
  const target = apiInternalUrl.replace(/\/$/, '') + event.path;
  const method = event.method;
  const hasBody = method !== 'GET' && method !== 'HEAD';

  const upstream = await fetch(target, {
    method,
    headers: { ...getProxyRequestHeaders(event), ...apiProxyHeaders(event) },
    body: hasBody ? await readRawBody(event) : undefined,
  });

  setResponseStatus(event, upstream.status, upstream.statusText);
  const skipHeaders = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'set-cookie']);
  upstream.headers.forEach((value, key) => {
    if (!skipHeaders.has(key.toLowerCase())) setResponseHeader(event, key, value);
  });
  for (const cookie of upstream.headers.getSetCookie?.() ?? []) appendResponseHeader(event, 'set-cookie', cookie);

  return Buffer.from(await upstream.arrayBuffer());
});
