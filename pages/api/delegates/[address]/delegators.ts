/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { NextApiRequest, NextApiResponse } from 'next';
import withApiHandler from 'modules/app/api/withApiHandler';
import { DEFAULT_NETWORK, SupportedNetworks } from 'modules/web3/constants/networks';
import { ApiError } from 'modules/app/api/ApiError';
import validateQueryParam from 'modules/app/api/validateQueryParam';
import { validateAddress } from 'modules/web3/api/validateAddress';
import { DelegationHistory } from 'modules/delegates/types';
import { fetchDelegatePaginatedDelegations } from 'modules/delegates/api/fetchDelegatePaginatedDelegations';

/**
 * @swagger
 * /api/delegates/{address}/delegators:
 *   get:
 *     tags:
 *       - "delegates"
 *     summary: Get paginated list of delegators for a specific delegate
 *     description: Returns a paginated list of addresses that have delegated to this delegate
 *     parameters:
 *       - name: address
 *         in: path
 *         description: The delegate's contract address
 *         required: true
 *         schema:
 *           type: string
 *           format: address
 *       - name: network
 *         in: query
 *         description: The Ethereum network to query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [mainnet, tenderly]
 *           default: mainnet
 *       - name: offset
 *         in: query
 *         description: Number of delegators to skip
 *         required: false
 *         schema:
 *           type: integer
 *           default: 0
 *       - name: limit
 *         in: query
 *         description: Maximum number of delegators to return
 *         required: false
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Paginated list of delegators
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 delegators:
 *                   type: array
 *                   items:
 *                     $ref: '#/definitions/DelegationHistory'
 *                 total:
 *                   type: integer
 *                   description: Total number of delegators
 *                 offset:
 *                   type: integer
 *                   description: Current offset
 *                 limit:
 *                   type: integer
 *                   description: Current limit
 */

export type DelegatorsAPIResponse = {
  delegators: DelegationHistory[];
  total: number;
  offset: number;
  limit: number;
};

export default withApiHandler(
  async (req: NextApiRequest, res: NextApiResponse<DelegatorsAPIResponse>) => {
    // validate network
    const network = validateQueryParam(
      (req.query.network as SupportedNetworks) || DEFAULT_NETWORK.network,
      'string',
      {
        defaultValue: DEFAULT_NETWORK.network,
        validValues: [SupportedNetworks.TENDERLY, SupportedNetworks.MAINNET]
      },
      n => !!n,
      new ApiError('Invalid network', 400, 'Invalid network')
    ) as SupportedNetworks;

    // validate address
    const address = await validateAddress(
      req.query.address as string,
      new ApiError('Invalid address', 400, 'Invalid address')
    );

    // validate pagination params
    const offset = validateQueryParam(
      req.query.offset,
      'number',
      {
        defaultValue: 0,
        validValues: []
      },
      n => n >= 0,
      new ApiError('Invalid offset', 400, 'Offset must be a positive number')
    ) as number;

    const limit = validateQueryParam(
      req.query.limit,
      'number',
      {
        defaultValue: 50,
        validValues: []
      },
      n => n > 0 && n <= 100,
      new ApiError('Invalid limit', 400, 'Limit must be between 1 and 100')
    ) as number;

    // Always sort by amount descending (highest delegations first)
    const { delegations, total } = await fetchDelegatePaginatedDelegations(
      address,
      network,
      offset,
      limit
    );

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    res.status(200).json({
      delegators: delegations,
      total,
      offset,
      limit
    });
  }
);