/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { NextApiRequest, NextApiResponse } from 'next';
import { DEFAULT_NETWORK, SupportedNetworks } from 'modules/web3/constants/networks';
import withApiHandler from 'modules/app/api/withApiHandler';
import logger from 'lib/logger';
import { cacheDel } from 'modules/cache/cache';
import {
  delegatesGithubCacheKey,
  executiveSupportersCacheKey,
  githubExecutivesCacheKey,
  executiveProposalsCacheKey,
  pollListCacheKey,
  partialActivePollsCacheKey,
  pollTagsDefinitionJSONCacheKey,
  pollTagsMappingJSONCacheKey
} from 'modules/cache/constants/cache-keys';
import { config } from 'lib/config';
import { ApiError } from 'modules/app/api/ApiError';
import validateQueryParam from 'modules/app/api/validateQueryParam';
import { ONE_WEEK_IN_MS } from 'modules/app/constants/time';

// Deletes cache for a tally
export default withApiHandler(
  async (req: NextApiRequest, res: NextApiResponse) => {
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

    const pollsAllowedCacheKeys = [
      'parsed-tally-',
      pollListCacheKey,
      partialActivePollsCacheKey,
      pollTagsDefinitionJSONCacheKey,
      pollTagsMappingJSONCacheKey
    ];

    // Allowed cache keys to be deleted, they can be partial since we just check that the key is on the requested path.
    const allowedCacheKeys = [
      'parsed-tally-',
      executiveProposalsCacheKey,
      executiveSupportersCacheKey,
      githubExecutivesCacheKey,
      delegatesGithubCacheKey,
      ...pollsAllowedCacheKeys
    ];

    try {
      const { cacheKey } = req.body;

      if (!req.body?.password || req.body?.password !== config.DASHBOARD_PASSWORD) {
        throw new ApiError('Invalidate cache, invalid password', 401, 'Unauthorized');
      }

      const isAllowed = allowedCacheKeys.reduce((prev, next) => {
        return prev || cacheKey.indexOf(next) !== -1;
      }, false);
      const isPollCacheKey = pollsAllowedCacheKeys.some(key => cacheKey.includes(key));
      const expiryMs = isPollCacheKey ? ONE_WEEK_IN_MS : undefined;

      if (!isAllowed || !cacheKey) {
        throw new ApiError('Invalidate cache, invalid request', 400, 'Invalid request');
      }

      logger.debug(`invalidate-cache request: ${cacheKey}`);

      cacheDel(cacheKey, network, expiryMs);

      return res.status(200).json({
        invalidated: true,
        cacheKey
      });
    } catch (e) {
      throw new ApiError(`Invalidate cache, ${e.messaage}`, 500);
    }
  },
  {
    allowPost: true
  }
);
