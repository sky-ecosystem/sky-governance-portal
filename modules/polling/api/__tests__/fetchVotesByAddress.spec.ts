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

  it('ignores a post-close ballot and keeps the voter’s in-window vote', async () => {
    // Mirrors poll 1615: an in-window Arbitrum vote for option 2, then a mainnet vote for option 1
    // cast after endDate. Dedupe keeps the highest blockTime, so without timeframe filtering the
    // post-close ballot wins and inherits the voter's end-of-poll weight.
    (gqlRequest as Mock)
      .mockResolvedValueOnce({
        pollVotes: [
          {
            voter: { id: '1-0xvoter', address: '0xvoter' },
            choice: '1',
            blockTime: 250,
            txnHash: '0xpostclose'
          }
        ]
      })
      .mockResolvedValueOnce({
        arbitrumPoll: {
          startDate: 50,
          endDate: 200,
          votes: [
            {
              voter: { id: '42161-0xvoter', address: '0xvoter' },
              choice: '2',
              blockTime: 150,
              txnHash: '0xinwindow'
            }
          ]
        }
      })
      .mockResolvedValueOnce({
        voters: [
          {
            id: '0xvoter',
            address: '0xvoter',
            v2VotingPowerChanges: [{ newBalance: '5000000000000000000' }]
          }
        ]
      });

    const votes = await fetchVotesByAddressForPoll(123, {}, SupportedNetworks.MAINNET);

    expect(votes).toHaveLength(1);
    expect(votes[0]).toEqual(
      expect.objectContaining({
        voter: '0xvoter',
        hash: '0xinwindow',
        ballot: [2],
        skySupport: '5'
      })
    );
  });

  it('excludes voters who only voted outside the poll window', async () => {
    // Mirrors polls 1504/1505/1507: addresses that never voted in-window are absent from the weight
    // lookup, so they land in the tally with 0 SKY and inflate numVoters.
    (gqlRequest as Mock)
      .mockResolvedValueOnce({
        pollVotes: [
          {
            voter: { id: '1-0xlate', address: '0xlate' },
            choice: '1',
            blockTime: 500,
            txnHash: '0xlate'
          },
          {
            voter: { id: '1-0xearly', address: '0xearly' },
            choice: '1',
            blockTime: 10,
            txnHash: '0xearly'
          }
        ]
      })
      .mockResolvedValueOnce({
        arbitrumPoll: {
          startDate: 50,
          endDate: 200,
          votes: [
            {
              voter: { id: '42161-0xreal', address: '0xreal' },
              choice: '1',
              blockTime: 120,
              txnHash: '0xreal'
            }
          ]
        }
      })
      .mockResolvedValueOnce({
        voters: [
          {
            id: '0xreal',
            address: '0xreal',
            v2VotingPowerChanges: [{ newBalance: '5000000000000000000' }]
          }
        ]
      });

    const votes = await fetchVotesByAddressForPoll(123, {}, SupportedNetworks.MAINNET);

    expect(votes.map(vote => vote.voter)).toEqual(['0xreal']);
  });

  it('treats string blockTime and poll dates numerically', async () => {
    // Envio returns numeric columns as strings; a lexicographic comparison would let this through.
    (gqlRequest as Mock)
      .mockResolvedValueOnce({
        pollVotes: [
          {
            voter: { id: '1-0xlate', address: '0xlate' },
            choice: '1',
            blockTime: '1000',
            txnHash: '0xlate'
          }
        ]
      })
      .mockResolvedValueOnce({
        arbitrumPoll: {
          startDate: '50',
          endDate: '200',
          votes: [
            {
              voter: { id: '42161-0xreal', address: '0xreal' },
              choice: '1',
              blockTime: '120',
              txnHash: '0xreal'
            }
          ]
        }
      })
      .mockResolvedValueOnce({
        voters: [
          {
            id: '0xreal',
            address: '0xreal',
            v2VotingPowerChanges: [{ newBalance: '5000000000000000000' }]
          }
        ]
      });

    const votes = await fetchVotesByAddressForPoll(123, {}, SupportedNetworks.MAINNET);

    expect(votes.map(vote => vote.voter)).toEqual(['0xreal']);
  });
});
