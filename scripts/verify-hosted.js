const target = process.argv[2];
const frontend = process.argv[3] || 'https://soft-nation-dev.github.io';

function originOf(value, name) {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error(name + ' must be an HTTP(S) origin with no path or query');
  }
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new Error(name + ' must use HTTPS outside localhost');
  }
  return url.origin;
}

async function check(baseUrl, path, expectedStatus, options = {}) {
  const response = await fetch(baseUrl + path, {
    ...options,
    signal: AbortSignal.timeout(15000),
  });
  const payload = await response.json().catch(() => null);
  if (response.status !== expectedStatus) {
    throw new Error(path + ' returned HTTP ' + response.status + ', expected ' + expectedStatus);
  }
  return { response, payload };
}

async function main() {
  if (!target) throw new Error('Usage: npm run verify:hosted -- https://your-backend.example [frontend-origin]');
  const baseUrl = originOf(target, 'Backend URL');
  const frontendOrigin = originOf(frontend, 'Frontend URL');
  const health = await check(baseUrl, '/health', 200);
  if (!health.payload?.success) throw new Error('Health response was not successful');
  const ready = await check(baseUrl, '/ready', 200);
  if (!ready.payload?.success || ready.payload.data?.database !== 'connected') {
    throw new Error('Backend is reachable but its database is not connected');
  }
  const cors = await fetch(baseUrl + '/api/v1/auth/login', {
    method: 'OPTIONS',
    headers: {
      Origin: frontendOrigin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type',
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!cors.ok || cors.headers.get('access-control-allow-origin') !== frontendOrigin) {
    throw new Error('Frontend origin is not allowed by the backend CORS settings');
  }
  await check(baseUrl, '/api/v1/auth/me', 401);
  const rooms = await check(baseUrl, '/api/v1/rooms', 200);
  if (!rooms.payload?.success) throw new Error('Rooms API returned an unsuccessful response');
  process.stdout.write('Hosted checks passed: health, database, CORS, protected auth and rooms API\n');
  process.stdout.write('Paystack sandbox and full browser booking tests still require manual testing\n');
}

main().catch(error => {
  process.stderr.write(error.message + '\n');
  process.exitCode = 1;
});
