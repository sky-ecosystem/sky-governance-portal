/*

SPDX-FileCopyrightText: © 2026 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { CdpClient } from '@coinbase/cdp-sdk';
import { config } from 'lib/config';

let cachedClient: CdpClient | null = null;

// Note: CDP SDK calls fail on the frontend bundle. Only import this on the backend.
export const getCdpClient = (): CdpClient => {
  if (!cachedClient) {
    cachedClient = new CdpClient({
      apiKeyId: config.CDP_API_KEY_ID,
      apiKeySecret: config.CDP_API_KEY_SECRET,
      walletSecret: config.CDP_WALLET_SECRET
    });
  }
  return cachedClient;
};
