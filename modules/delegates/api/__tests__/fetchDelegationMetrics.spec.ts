/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { Mock, vi } from 'vitest';
import { gqlRequest } from 'modules/gql/gqlRequest';
import { stakingEngineAddressMainnet } from 'modules/gql/gql.constants';
import { fetchDelegationMetrics } from '../fetchDelegationMetrics';
import { SupportedNetworks } from 'modules/web3/constants/networks';

vi.mock('modules/gql/gqlRequest');

describe('fetchDelegationMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('paginates delegations and queries with the staking engine excluded', async () => {
    (gqlRequest as Mock)
      .mockResolvedValueOnce({
        delegations: Array.from({ length: 1000 }, (_, index) => ({
          delegator: `0x${index.toString(16).padStart(40, '0')}`,
          delegate: { id: '1-0xdelegate', version: '3' },
          amount: '1000000000000000000'
        }))
      })
      .mockResolvedValueOnce({
        delegations: []
      });

    const metrics = await fetchDelegationMetrics(SupportedNetworks.MAINNET);

    expect(metrics).toEqual({
      totalSkyDelegated: '1000',
      delegatorCount: 1000
    });
    expect((gqlRequest as Mock).mock.calls).toHaveLength(2);
    expect((gqlRequest as Mock).mock.calls[0][0].query).toContain(stakingEngineAddressMainnet);
    expect((gqlRequest as Mock).mock.calls[1][0].query).toContain('offset: 1000');
  });
});
