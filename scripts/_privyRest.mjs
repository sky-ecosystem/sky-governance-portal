// Tiny REST shim for Privy's HTTP API, shared by the operator scripts.
// Authentication: HTTP Basic with appId:appSecret + the privy-app-id header.

const PRIVY_API_BASE = 'https://api.privy.io';

function authHeaders() {
  const { PRIVY_APP_ID, PRIVY_APP_SECRET } = process.env;
  if (!PRIVY_APP_ID || !PRIVY_APP_SECRET) {
    throw new Error('Privy is not configured: missing PRIVY_APP_ID or PRIVY_APP_SECRET');
  }
  const basic = Buffer.from(`${PRIVY_APP_ID}:${PRIVY_APP_SECRET}`).toString('base64');
  return {
    Authorization: `Basic ${basic}`,
    'privy-app-id': PRIVY_APP_ID,
    'Content-Type': 'application/json'
  };
}

async function request(path) {
  const resp = await fetch(`${PRIVY_API_BASE}${path}`, { headers: authHeaders() });
  if (!resp.ok) {
    let detail = '';
    try {
      detail = JSON.stringify(await resp.json());
    } catch {
      detail = await resp.text().catch(() => '');
    }
    const err = new Error(`Privy REST ${path} failed: ${resp.status} ${resp.statusText} — ${detail}`);
    err.status = resp.status;
    throw err;
  }
  return resp.json();
}

export async function privyGetWallet(walletId) {
  return request(`/v1/wallets/${encodeURIComponent(walletId)}`);
}
