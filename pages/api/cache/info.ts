/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { NextApiRequest, NextApiResponse } from 'next';
import { DEFAULT_NETWORK, SupportedNetworks } from 'modules/web3/constants/networks';
import withApiHandler from 'modules/app/api/withApiHandler';
import logger from 'lib/logger';
import { getCacheInfo } from 'modules/cache/cache';
import {
  delegatesGithubCacheKey,
  executiveSupportersCacheKey,
  executiveProposalsCacheKey,
  pollListCacheKey,
  partialActivePollsCacheKey
} from 'modules/cache/constants/cache-keys';
import { ApiError } from 'modules/app/api/ApiError';
import validateQueryParam from 'modules/app/api/validateQueryParam';
import { ONE_WEEK_IN_MS } from 'modules/app/constants/time';

// fetches cache info for constant keys
export default withApiHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  // validate network
  const network = validateQueryParam(
    (req.query.network as SupportedNetworks) || DEFAULT_NETWORK.network,
    'string',
    {
      defaultValue: null,
      validValues: [SupportedNetworks.TENDERLY, SupportedNetworks.MAINNET]
    },
    n => !!n,
    new ApiError('Invalid network', 400, 'Invalid network')
  ) as SupportedNetworks;

  // keys to check
  const allowedCacheKeys = [
    { name: pollListCacheKey, expiryMs: ONE_WEEK_IN_MS },
    { name: partialActivePollsCacheKey, expiryMs: ONE_WEEK_IN_MS },
    { name: executiveProposalsCacheKey },
    { name: executiveSupportersCacheKey },
    { name: delegatesGithubCacheKey }
  ];

  try {
    const promises = await Promise.all(
      allowedCacheKeys.map(key => getCacheInfo(key.name, network, key.expiryMs))
    );
    const response = {};
    promises.map((key, index) => {
      response[allowedCacheKeys[index].name] = key;
    });

    return res.status(200).json({
      ...response
    });
  } catch (e) {
    logger.error(`cache-info: ${e.message}`);
    return res.status(200).json({
      error: 'unknown'
    });
  }
});
