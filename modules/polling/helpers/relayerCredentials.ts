/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { config } from 'lib/config';
import { SupportedNetworks } from 'modules/web3/constants/networks';

export const relayerCredentials = {
  mainnet: { apiKey: config.DEFENDER_API_KEY_MAINNET, apiSecret: config.DEFENDER_API_SECRET_MAINNET },
  tenderly: { apiKey: config.DEFENDER_API_KEY_TESTNET, apiSecret: config.DEFENDER_API_SECRET_TESTNET }
};

// Privy uses CAIP-2 chain identifiers in the SDK and webhook payloads.
// Arbitrum One = eip155:42161, Arbitrum Sepolia = eip155:421614.
export const ARBITRUM_ONE_CAIP2 = 'eip155:42161';
export const ARBITRUM_SEPOLIA_CAIP2 = 'eip155:421614';

export type PrivyWalletConfig = {
  walletId: string;
  caip2: string;
  chainId: number;
};

export const privyWalletConfig: Record<SupportedNetworks.MAINNET | SupportedNetworks.TENDERLY, PrivyWalletConfig> = {
  [SupportedNetworks.MAINNET]: {
    walletId: config.PRIVY_WALLET_ID_MAINNET,
    caip2: ARBITRUM_ONE_CAIP2,
    chainId: 42161
  },
  [SupportedNetworks.TENDERLY]: {
    walletId: config.PRIVY_WALLET_ID_TESTNET,
    caip2: ARBITRUM_SEPOLIA_CAIP2,
    chainId: 421614
  }
};

export function getPrivyWalletConfig(network: SupportedNetworks): PrivyWalletConfig {
  if (network !== SupportedNetworks.MAINNET && network !== SupportedNetworks.TENDERLY) {
    throw new Error(`Privy relayer is not configured for network: ${network}`);
  }
  const cfg = privyWalletConfig[network];
  if (!cfg.walletId) {
    throw new Error(`Privy wallet id missing for network: ${network}`);
  }
  return cfg;
}
