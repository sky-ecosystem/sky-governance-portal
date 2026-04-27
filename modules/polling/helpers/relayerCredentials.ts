/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { config } from 'lib/config';
import { SupportedNetworks } from 'modules/web3/constants/networks';

// CDP SDK network identifier (matches @coinbase/cdp-sdk SendEvmTransactionBodyNetwork).
export type CdpNetworkId = 'arbitrum' | 'arbitrum-sepolia';

// CDP server-wallet network identifier per app network.
// `mainnet` targets Arbitrum One; `tenderly` targets Arbitrum Sepolia (the testnet
// gasless flow uses the real Arbitrum Sepolia chain, not the Tenderly fork).
export const cdpNetworkForApp: Record<
  SupportedNetworks.MAINNET | SupportedNetworks.TENDERLY,
  CdpNetworkId
> = {
  [SupportedNetworks.MAINNET]: 'arbitrum',
  [SupportedNetworks.TENDERLY]: 'arbitrum-sepolia'
};

// Persistent CDP server-wallet account name per network. The same name yields the
// same account across restarts via cdp.evm.getOrCreateAccount.
export const cdpAccountNameForApp: Record<
  SupportedNetworks.MAINNET | SupportedNetworks.TENDERLY,
  string
> = {
  [SupportedNetworks.MAINNET]: config.CDP_WALLET_NAME_MAINNET,
  [SupportedNetworks.TENDERLY]: config.CDP_WALLET_NAME_TESTNET
};
