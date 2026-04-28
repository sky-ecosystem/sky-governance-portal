/*

SPDX-FileCopyrightText: © 2026 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'node:crypto';
import { config as appConfig } from 'lib/config';
import { handleStillPending } from 'modules/polling/helpers/handleStillPending';
import logger from 'lib/logger';

// Standard Webhooks (Svix) signature verification — same algorithm Privy uses internally.
// Hand-rolled here to avoid Privy's SDK wrapper, which loads @hpke/chacha20poly1305 →
// @hpke/common, a package whose CJS build has broken module resolution on Vercel's
// serverless runtime. Webhook verification has no need for HPKE.
const TIMESTAMP_TOLERANCE_SEC = 5 * 60;

function verifySvixSignature(
  rawBody: string,
  svixId: string,
  svixTimestamp: string,
  svixSignatureHeader: string,
  secret: string
): void {
  const ts = parseInt(svixTimestamp, 10);
  if (!Number.isFinite(ts)) throw new Error('Invalid timestamp');
  const skew = Math.abs(Math.floor(Date.now() / 1000) - ts);
  if (skew > TIMESTAMP_TOLERANCE_SEC) throw new Error('Timestamp outside tolerance');

  const stripped = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret;
  const keyBytes = Buffer.from(stripped, 'base64');
  const expected = crypto
    .createHmac('sha256', keyBytes)
    .update(`${svixId}.${svixTimestamp}.${rawBody}`)
    .digest('base64');

  // The header is space-separated `v1,<sig>` entries; any matching entry is sufficient.
  for (const entry of svixSignatureHeader.split(' ')) {
    const [version, sig] = entry.split(',');
    if (version !== 'v1' || !sig) continue;
    if (
      sig.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    ) {
      return;
    }
  }
  throw new Error('No matching signature found');
}

// Privy webhook signature verification (Svix) requires the raw request body byte-for-byte.
// Disable Next.js body parsing so we can read it ourselves.
export const config = { api: { bodyParser: false } };

async function readRawBody(req: NextApiRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).end();
    return;
  }

  if (!appConfig.PRIVY_WEBHOOK_SIGNING_SECRET) {
    logger.error('Privy webhook: PRIVY_WEBHOOK_SIGNING_SECRET is not configured');
    res.status(500).end();
    return;
  }

  const rawBody = await readRawBody(req);

  const svixId = req.headers['svix-id'];
  const svixTimestamp = req.headers['svix-timestamp'];
  const svixSignature = req.headers['svix-signature'];
  if (typeof svixId !== 'string' || typeof svixTimestamp !== 'string' || typeof svixSignature !== 'string') {
    res.status(401).end();
    return;
  }

  try {
    verifySvixSignature(
      rawBody,
      svixId,
      svixTimestamp,
      svixSignature,
      appConfig.PRIVY_WEBHOOK_SIGNING_SECRET
    );
  } catch (err) {
    logger.warn('Privy webhook: signature verification failed:', (err as Error).message);
    res.status(401).end();
    return;
  }

  let payload: Record<string, unknown> & { type: string };
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown> & { type: string };
  } catch {
    logger.warn('Privy webhook: body is not valid JSON');
    res.status(400).end();
    return;
  }

  try {
    // Privy's verified payload has fields at the root (type + event-specific fields like
    // transaction_id, wallet_id, caip2, transaction_request). No `data` wrapper.
    switch (payload.type) {
      case 'transaction.still_pending':
        await handleStillPending(payload);
        break;
      case 'transaction.confirmed':
      case 'transaction.failed':
      case 'transaction.replaced':
        // No action; BallotContext polls getRelayerTx for these states.
        logger.debug(`Privy webhook: received ${payload.type}`);
        break;
      default:
        logger.debug(`Privy webhook: ignoring event type ${payload.type}`);
    }
  } catch (err) {
    logger.error(`Privy webhook handler failed for ${payload.type}:`, (err as Error).message);
    // Return 500 so Privy retries.
    res.status(500).end();
    return;
  }

  res.status(200).end();
}
