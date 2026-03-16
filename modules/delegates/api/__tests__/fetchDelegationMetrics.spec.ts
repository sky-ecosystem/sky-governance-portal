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

  it('subtracts staking engine delegations from aggregate totals', async () => {
    (gqlRequest as Mock)
      .mockResolvedValueOnce({
        delegates: [
          {
            totalDelegated: '10000000000000000000',
            delegators: 2
          },
          {
            totalDelegated: '20000000000000000000',
            delegators: 1
          }
        ]
      })
      .mockResolvedValueOnce({
        delegations: [
          {
            delegate: {
              totalDelegated: '10000000000000000000',
              delegators: 2
            },
            amount: '3000000000000000000'
          }
        ]
      });

    const metrics = await fetchDelegationMetrics(SupportedNetworks.MAINNET);

    expect(metrics).toEqual({
      totalSkyDelegated: '27',
      delegatorCount: 2
    });
    expect((gqlRequest as Mock).mock.calls).toHaveLength(2);
    expect((gqlRequest as Mock).mock.calls[1][0].query).toContain(stakingEngineAddressMainnet);
  });
});
