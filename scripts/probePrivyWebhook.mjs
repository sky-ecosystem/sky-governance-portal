// Manually craft Svix-signed POSTs to a Privy webhook endpoint to exercise
// the handler without going through Privy itself.
//
// Usage:
//   node scripts/probePrivyWebhook.mjs                                # both scenarios against local
//   node scripts/probePrivyWebhook.mjs --url=https://staging/api/...  # different host
//   node scripts/probePrivyWebhook.mjs --case=test                    # only privy.test
//   node scripts/probePrivyWebhook.mjs --case=still-pending           # only transaction.still_pending

import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env.local');
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const URL = args.url || 'http://localhost:3000/api/webhooks/privy';
const which = args.case || 'all';

const secretRaw = process.env.PRIVY_WEBHOOK_SIGNING_SECRET;
if (!secretRaw) {
  console.error('PRIVY_WEBHOOK_SIGNING_SECRET missing from env');
  process.exit(1);
}

// Standard Webhooks signing algorithm (same one Svix/standardwebhooks ship):
// HMAC-SHA256 over `${id}.${timestamp}.${body}` with the base64-decoded secret bytes,
// base64-encoded result, prefixed with `v1,`.
const secret = secretRaw.startsWith('whsec_') ? secretRaw.slice('whsec_'.length) : secretRaw;
const secretBytes = Buffer.from(secret, 'base64');

function sign(body) {
  const id = `msg_${crypto.randomBytes(16).toString('base64url')}`;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const sig = crypto
    .createHmac('sha256', secretBytes)
    .update(`${id}.${timestamp}.${body}`)
    .digest('base64');
  return { id, timestamp, signature: `v1,${sig}` };
}

async function send(label, payload, { tamperSig = false } = {}) {
  const body = JSON.stringify(payload);
  const { id, timestamp, signature } = sign(body);
  const headers = {
    'Content-Type': 'application/json',
    'svix-id': id,
    'svix-timestamp': timestamp,
    'svix-signature': tamperSig ? 'v1,bogus' : signature
  };
  if (process.env.VERCEL_BYPASS_TOKEN) {
    headers['x-vercel-protection-bypass'] = process.env.VERCEL_BYPASS_TOKEN;
  }
  const resp = await fetch(URL, { method: 'POST', headers, body });
  console.log(`\n=== ${label} ===`);
  console.log('  status:', resp.status, resp.statusText);
  const text = await resp.text();
  if (text) console.log('  body:  ', text.slice(0, 200));
}

// 1. Mimic Privy's synthetic dashboard test ping.
if (which === 'all' || which === 'test') {
  await send('privy.test (mimics Privy dashboard ping)', {
    type: 'privy.test',
    message: 'Hello, World!'
  });

  // Sanity: a tampered signature must be rejected.
  await send('privy.test with bogus signature (expect 401)', {
    type: 'privy.test',
    message: 'tamper'
  }, { tamperSig: true });
}

// 2. Mimic transaction.still_pending using the real Sepolia tx we already sent.
//    Because that tx is already mined on-chain, the bump handler's pre-flight
//    receipt check should short-circuit BEFORE attempting to send a replacement.
if (which === 'all' || which === 'still-pending') {
  // Use the Arbitrum One self-transfer we sent earlier so:
  //   - networkForWalletId resolves to MAINNET (first match in env), caip2 matches eip155:42161
  //   - the original tx hash is already mined on-chain → the on-chain pre-flight check
  //     short-circuits and the handler bails BEFORE sending a replacement (safe to run repeatedly)
  await send('transaction.still_pending against an already-mined Arbitrum One tx (expect 200, no bump)', {
    type: 'transaction.still_pending',
    transaction_id: '9977fc09-d82d-4e08-9ca5-4e975ba8320d',
    transaction_hash: '0x411a84fa000a050347e99df07dd95abf15becd33f924e6025bf0e3cf8cc292ea',
    wallet_id: process.env.PRIVY_WALLET_ID_MAINNET,
    caip2: 'eip155:42161',
    transaction_request: {
      chain_id: 42161,
      to: '0xBa5Bde1E0aB1Deb2CBeea43884C9307A207301e7',
      data: '0x',
      value: '0x0',
      nonce: 0,
      max_priority_fee_per_gas: '0x5f5e100',
      max_fee_per_gas: '0x5f5e100',
      type: 2
    }
  });
}
