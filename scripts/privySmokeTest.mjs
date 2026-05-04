// Privy smoke test. Loads credentials from .env.local and confirms:
//   1. Auth credentials work against Privy's REST API.
//   2. GET /v1/wallets/{id} returns the configured testnet wallet.
// Run: node scripts/privySmokeTest.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { privyGetWallet } from './_privyRest.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env.local');
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const { PRIVY_APP_ID, PRIVY_APP_SECRET, PRIVY_WALLET_ID_TESTNET } = process.env;
if (!PRIVY_APP_ID || !PRIVY_APP_SECRET) {
  console.error('Missing PRIVY_APP_ID or PRIVY_APP_SECRET');
  process.exit(1);
}

if (!PRIVY_WALLET_ID_TESTNET) {
  console.log('No testnet wallet id set; skipping wallet fetch.');
  process.exit(0);
}

let walletAddress;
try {
  const wallet = await privyGetWallet(PRIVY_WALLET_ID_TESTNET);
  walletAddress = wallet.address;
  console.log('GET /v1/wallets OK');
  console.log('  id:        ', wallet.id);
  console.log('  address:   ', walletAddress);
  console.log('  chain_type:', wallet.chain_type);
  console.log('  created_at:', wallet.created_at);
} catch (err) {
  console.error('GET /v1/wallets FAILED:', err?.status, err?.message ?? err);
  process.exit(1);
}

// Confirm the funded balances on both Arbitrum networks via public RPC.
// arbitrum.io and arbitrum-sepolia.io are public endpoints; rate-limited but fine for a one-shot check.
const networks = [
  { label: 'arbitrum-one    (eip155:42161)', rpc: 'https://arb1.arbitrum.io/rpc' },
  { label: 'arbitrum-sepolia (eip155:421614)', rpc: 'https://sepolia-rollup.arbitrum.io/rpc' }
];

for (const { label, rpc } of networks) {
  try {
    const resp = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getBalance',
        params: [walletAddress, 'latest']
      })
    });
    const json = await resp.json();
    if (json.error) throw new Error(json.error.message);
    const wei = BigInt(json.result);
    const eth = Number(wei) / 1e18;
    console.log(`  ${label}: ${eth.toFixed(6)} ETH (${wei} wei)`);
  } catch (err) {
    console.error(`  ${label}: balance fetch failed — ${err.message}`);
  }
}
