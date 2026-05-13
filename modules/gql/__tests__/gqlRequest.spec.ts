/*

SPDX-FileCopyrightText: © 2026 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gqlRequest } from '../gqlRequest';
import { SupportedChainId } from 'modules/web3/constants/chainID';
import { CHAIN_INFO } from 'modules/web3/constants/networks';

describe('gqlRequest URL construction', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ data: { ok: true } }),
      text: async () => ''
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('appends mainnet chainId to the indexer URL', async () => {
    await gqlRequest({ chainId: SupportedChainId.MAINNET, query: '{__typename}' });

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toBe(`${CHAIN_INFO[SupportedChainId.MAINNET].subgraphUrl}/1`);
    expect(calledUrl.endsWith('/indexer/1')).toBe(true);
  });

  it('appends tenderly chainId to the indexer URL', async () => {
    await gqlRequest({ chainId: SupportedChainId.TENDERLY, query: '{__typename}' });

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toBe(`${CHAIN_INFO[SupportedChainId.TENDERLY].subgraphUrl}/314310`);
    expect(calledUrl.endsWith('/indexer/314310')).toBe(true);
  });

  it('falls back to mainnet chainId when none is passed', async () => {
    await gqlRequest({ query: '{__typename}' });

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl.endsWith('/indexer/1')).toBe(true);
  });
});
