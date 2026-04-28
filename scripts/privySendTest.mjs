// Privy send-transaction smoke test on both Arbitrum networks.
// Self-transfers 0 wei from the configured Privy wallet to itself, paying only gas.
// Confirms the chained sendTransaction call shape works end-to-end against the live SDK.
//
// Run: node scripts/privySendTest.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { PrivyClient } from '@privy-io/node';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env.local');
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const { PRIVY_APP_ID, PRIVY_APP_SECRET, PRIVY_WALLET_ID_TESTNET, PRIVY_WALLET_ID_MAINNET } =
  process.env;
if (!PRIVY_APP_ID || !PRIVY_APP_SECRET) {
  console.error('Missing PRIVY_APP_ID or PRIVY_APP_SECRET');
  process.exit(1);
}

const privy = new PrivyClient({ appId: PRIVY_APP_ID, appSecret: PRIVY_APP_SECRET });

async function selfTransfer({ label, walletId, caip2, chainId, explorer }) {
  console.log(`\n=== ${label} ===`);
  if (!walletId) {
    console.log('skipped — no wallet id configured');
    return;
  }
  const wallet = await privy.wallets().get(walletId);
  console.log('from:', wallet.address);
  try {
    const result = await privy
      .wallets()
      .ethereum()
      .sendTransaction(walletId, {
        caip2,
        params: {
          transaction: {
            to: wallet.address,
            value: '0x0',
            chain_id: chainId
          }
        }
      });
    console.log('hash:          ', result.hash);
    console.log('transaction_id:', result.transaction_id ?? '(none returned)');
    console.log('caip2:         ', result.caip2);
    console.log('explorer:      ', `${explorer}/tx/${result.hash}`);
    if (result.transaction_id) {
      // Pause briefly then query the transactions service to confirm getRelayerTx-style polling works.
      await new Promise(r => setTimeout(r, 2000));
      const tx = await privy.transactions().get(result.transaction_id);
      console.log('status (after 2s):', tx.status);
    }
  } catch (err) {
    console.error('SEND FAILED:', err?.status, err?.message ?? err);
    if (err?.body) console.error('body:', JSON.stringify(err.body, null, 2));
    if (err?.headers) console.error('headers:', err.headers);
    process.exitCode = 1;
  }
}

await selfTransfer({
  label: 'Arbitrum Sepolia',
  walletId: PRIVY_WALLET_ID_TESTNET,
  caip2: 'eip155:421614',
  chainId: 421614,
  explorer: 'https://sepolia.arbiscan.io'
});

await selfTransfer({
  label: 'Arbitrum One',
  walletId: PRIVY_WALLET_ID_MAINNET,
  caip2: 'eip155:42161',
  chainId: 42161,
  explorer: 'https://arbiscan.io'
});
