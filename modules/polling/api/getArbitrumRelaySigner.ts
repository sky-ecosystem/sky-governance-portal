/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { CdpClient } from '@coinbase/cdp-sdk';
import { SupportedNetworks } from 'modules/web3/constants/networks';
import { cdpAccountNameForApp, cdpNetworkForApp, CdpNetworkId } from '../helpers/relayerCredentials';
import { getCdpClient } from './getCdpClient';

export type ArbitrumRelaySigner = {
  cdp: CdpClient;
  account: { address: `0x${string}` };
  cdpNetwork: CdpNetworkId;
};

const isRelayedNetwork = (
  network: SupportedNetworks
): network is SupportedNetworks.MAINNET | SupportedNetworks.TENDERLY =>
  network === SupportedNetworks.MAINNET || network === SupportedNetworks.TENDERLY;

// CDP getOrCreateAccount is idempotent but each call is a network round-trip.
// Cache the resolved address per app network so /precheck and /vote don't pay it twice.
const accountAddressCache = new Map<SupportedNetworks, `0x${string}`>();

// Note: CDP SDK calls fail on the frontend bundle. Only import this on the backend.
export const getArbitrumRelaySigner = async (
  network: SupportedNetworks
): Promise<ArbitrumRelaySigner> => {
  if (!isRelayedNetwork(network)) {
    throw new Error(`Unsupported network: ${network}`);
  }

  const cdp = getCdpClient();
  const cdpNetwork = cdpNetworkForApp[network];

  const cached = accountAddressCache.get(network);
  if (cached) {
    return { cdp, account: { address: cached }, cdpNetwork };
  }

  const account = await cdp.evm.getOrCreateAccount({ name: cdpAccountNameForApp[network] });
  const address = account.address as `0x${string}`;
  accountAddressCache.set(network, address);

  return { cdp, account: { address }, cdpNetwork };
};
