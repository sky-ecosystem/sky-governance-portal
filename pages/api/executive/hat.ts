/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { NextApiRequest, NextApiResponse } from 'next';
import withApiHandler from 'modules/app/api/withApiHandler';
import { DEFAULT_NETWORK, SupportedNetworks } from 'modules/web3/constants/networks';
import validateQueryParam from 'modules/app/api/validateQueryParam';
import { networkNameToChainId } from 'modules/web3/helpers/chain';
import { getPublicClient } from 'modules/web3/helpers/getPublicClient';
import { chiefAbi, chiefAddress } from 'modules/contracts/generated';

export type HatInfoResponse = {
  hatAddress: string;
  skyOnHat: string;
  network: string;
};

/**
 * @swagger
 * /api/executive/hat:
 *   get:
 *     tags:
 *       - "executive"
 *     summary: Get the current hat address and SKY amount on it
 *     description: Returns the current hat address (governing proposal) and the total SKY supporting it
 *     parameters:
 *       - name: network
 *         in: query
 *         description: The Ethereum network to query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [mainnet, tenderly]
 *           default: mainnet
 *     responses:
 *       200:
 *         description: Hat information including address and SKY amount
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hatAddress:
 *                   type: string
 *                   description: The address of the current hat (governing proposal)
 *                 skyOnHat:
 *                   type: string
 *                   description: The total SKY amount supporting the hat (in wei)
 *                 network:
 *                   type: string
 *                   description: The network this data is from
 */
export default withApiHandler(async (req: NextApiRequest, res: NextApiResponse<HatInfoResponse>) => {
  const network = validateQueryParam(req.query.network, 'string', {
    defaultValue: DEFAULT_NETWORK.network,
    validValues: [SupportedNetworks.TENDERLY, SupportedNetworks.MAINNET]
  }) as SupportedNetworks;

  const chainId = networkNameToChainId(network);
  const publicClient = getPublicClient(chainId);

  try {
    // Get the current hat address
    const hatAddress = await publicClient.readContract({
      address: chiefAddress[chainId],
      abi: chiefAbi,
      functionName: 'hat'
    });

    // Get the SKY amount on the hat
    const skyOnHat = await publicClient.readContract({
      address: chiefAddress[chainId],
      abi: chiefAbi,
      functionName: 'approvals',
      args: [hatAddress as `0x${string}`]
    });

    const response: HatInfoResponse = {
      hatAddress: hatAddress as string,
      skyOnHat: skyOnHat.toString(),
      network
    };

    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate');
    res.status(200).json(response);
  } catch (error) {
    throw new Error(`Failed to fetch hat information: ${error.message}`);
  }
});
