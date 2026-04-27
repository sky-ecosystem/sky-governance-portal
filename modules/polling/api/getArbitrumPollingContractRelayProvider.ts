/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { SupportedNetworks } from 'modules/web3/constants/networks';
import { ArbitrumRelaySigner, getArbitrumRelaySigner } from './getArbitrumRelaySigner';
import { pollingArbitrumAddress } from 'modules/contracts/generated';
import { networkNameToChainId } from 'modules/web3/helpers/chain';

export type ArbitrumPollingContractRelayProvider = ArbitrumRelaySigner & {
  pollingAddress: `0x${string}`;
};

// Note: CDP SDK calls fail on the frontend bundle. Only import this on the backend.
export const getArbitrumPollingContractRelayProvider = async (
  network: SupportedNetworks
): Promise<ArbitrumPollingContractRelayProvider> => {
  const signer = await getArbitrumRelaySigner(network);

  const chainId =
    network === SupportedNetworks.MAINNET
      ? networkNameToChainId(SupportedNetworks.ARBITRUM)
      : networkNameToChainId(SupportedNetworks.ARBITRUMTESTNET);
  const pollingAddress = pollingArbitrumAddress[chainId];

  return { ...signer, pollingAddress };
};
