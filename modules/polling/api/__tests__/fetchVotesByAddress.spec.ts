/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { Mock, vi } from 'vitest';
import { gqlRequest } from 'modules/gql/gqlRequest';
import { fetchVotesByAddressForPoll } from '../fetchVotesByAddress';
import { SupportedNetworks } from 'modules/web3/constants/networks';

vi.mock('modules/gql/gqlRequest');

describe('fetchVotesByAddressForPoll', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dedupes gasless votes by the mapped delegate address and keeps the delegate weight', async () => {
    (gqlRequest as Mock)
      .mockResolvedValueOnce({
        pollVotes: [
          {
            voter: { id: '1-0xdelegate', address: '0xdelegate' },
            choice: '1',
            blockTime: 100,
            txnHash: '0xmain'
          }
        ]
      })
      .mockResolvedValueOnce({
        arbitrumPoll: {
          startDate: 50,
          endDate: 200,
          votes: [
            {
              voter: { id: '42161-0xowner', address: '0xowner' },
              choice: '2',
              blockTime: 150,
              txnHash: '0xarb'
            }
          ]
        }
      })
      .mockResolvedValueOnce({
        voters: [
          {
            id: '0xdelegate',
            address: '0xdelegate',
            v2VotingPowerChanges: [{ newBalance: '5000000000000000000' }]
          }
        ]
      });

    const votes = await fetchVotesByAddressForPoll(
      123,
      { '0xowner': '0xdelegate' },
      SupportedNetworks.MAINNET
    );

    expect(votes).toHaveLength(1);
    expect(votes[0]).toEqual(
      expect.objectContaining({
        voter: '0xdelegate',
        hash: '0xarb',
        skySupport: '5'
      })
    );
  });
});
