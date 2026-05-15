/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { SupportedNetworks } from 'modules/web3/constants/networks';
import { formatEther } from 'viem';
import logger from 'lib/logger';
import { getGaslessPublicClient } from 'modules/web3/helpers/getPublicClient';
import { networkNameToChainId } from 'modules/web3/helpers/chain';
import { privyGetWalletAddress } from 'lib/privyRest';
import { getPrivyWalletConfig } from '../helpers/relayerCredentials';

export const getRelayerBalance = async (network: SupportedNetworks): Promise<string> => {
  try {
    if (!Object.values(SupportedNetworks).includes(network)) {
      throw new Error(`Unsupported network: ${network}`);
    }

    const gaslessPublicClient = getGaslessPublicClient(networkNameToChainId(network));
    const { walletId } = getPrivyWalletConfig(network);
    const address = await privyGetWalletAddress(walletId);

    const balance = await gaslessPublicClient.getBalance({ address });
    return formatEther(balance);
  } catch (err) {
    logger.error(err);
    return '0';
  }
};
