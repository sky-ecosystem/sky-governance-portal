/*

SPDX-FileCopyrightText: © 2026 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { NextApiRequest, NextApiResponse } from 'next';
import { getPrivyClient } from 'lib/getPrivyClient';
import { config as appConfig } from 'lib/config';
import { handleStillPending } from 'modules/polling/helpers/handleStillPending';
import logger from 'lib/logger';

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

  let payload: Record<string, unknown> & { type: string };
  try {
    const privy = getPrivyClient();
    payload = (await privy.webhooks().verify({
      payload: rawBody,
      svix: {
        id: svixId,
        timestamp: svixTimestamp,
        signature: svixSignature
      }
    })) as Record<string, unknown> & { type: string };
  } catch (err) {
    logger.warn('Privy webhook: signature verification failed');
    res.status(401).end();
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
