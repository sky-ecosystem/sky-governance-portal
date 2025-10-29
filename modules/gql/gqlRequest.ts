/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import logger from 'lib/logger';
import { backoffRetry } from 'lib/utils';
import { ApiError } from 'modules/app/api/ApiError';
import { SupportedChainId } from 'modules/web3/constants/chainID';
import { CHAIN_INFO } from 'modules/web3/constants/networks';

type GqlRequestProps = {
  chainId?: SupportedChainId;
  query: string;
  variables?: Record<string, unknown> | null;
};

// TODO we'll be able to remove the "any" if we update all the instances of gqlRequest to pass <Query>
export const gqlRequest = async <TQuery = any>({
  chainId,
  query,
  variables
}: GqlRequestProps): Promise<TQuery> => {
  try {
    const id = chainId ?? SupportedChainId.MAINNET;
    const url = CHAIN_INFO[id].subgraphUrl;
    if (!url) {
      return Promise.reject(new ApiError(`Missing subgraph url in configuration for chainId: ${id}`));
    }

    const resp = await backoffRetry(
      1,
      () => executeGraphqlRequest<TQuery>(url, query, variables ?? undefined),
      500,
      (message: string) => {
        logger.debug(`GQL Request: ${message}. --- ${query}`);
      }
    );
    return resp;
  } catch (e) {
    if (e instanceof ApiError) {
      throw new ApiError(
        `Error on GraphQL query, Chain ID: ${chainId}, query: ${query}, message: ${e.message}`,
        e.status,
        e.clientMessage
      );
    }

    const status = typeof e === 'object' && e !== null && 'status' in e ? (e as any).status : 500;
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    const message = `Error on GraphQL query, Chain ID: ${chainId}, query: ${query}, message: ${errorMessage}`;
    throw new ApiError(message, status, 'Error fetching gov polling data');
  }
};

type GraphqlExecutionResult<TQuery> = {
  data?: TQuery;
  errors?: Array<{ message?: string }>;
};

async function executeGraphqlRequest<TQuery>(
  url: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<TQuery> {
  const payload: Record<string, unknown> = { query };

  if (variables && Object.keys(variables).length > 0) {
    payload.variables = variables;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  let bodyText: string | undefined;
  let json: GraphqlExecutionResult<TQuery> | undefined;

  try {
    json = (await response.json()) as GraphqlExecutionResult<TQuery>;
  } catch (parseError) {
    bodyText = await response.text();
  }

  if (!response.ok) {
    const status = response.status || 500;
    const errorMessage =
      (json?.errors && json.errors.map(error => error?.message).filter(Boolean).join('; ')) ||
      bodyText ||
      response.statusText ||
      'Unknown GraphQL error';
    throw new ApiError(`GraphQL request failed: ${errorMessage}`, status, 'Error fetching gov polling data');
  }

  if (!json) {
    throw new ApiError('GraphQL response was not valid JSON', response.status || 500, 'Error fetching gov polling data');
  }

  if (json.errors && json.errors.length > 0) {
    const errorMessage = json.errors.map(error => error?.message ?? 'Unknown error').join('; ');
    throw new ApiError(`GraphQL responded with errors: ${errorMessage}`, 500, 'Error fetching gov polling data');
  }

  if (!('data' in json)) {
    throw new ApiError('GraphQL response did not include data', 500, 'Error fetching gov polling data');
  }

  return json.data as TQuery;
}
