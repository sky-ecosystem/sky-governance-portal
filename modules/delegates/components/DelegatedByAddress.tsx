/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { useState } from 'react';
import { Box, Text, Flex, IconButton, Heading, Button } from 'theme-ui';
import { useBreakpointIndex } from '@theme-ui/match-media';
import Icon from 'modules/app/components/Icon';
import { InternalLink } from 'modules/app/components/InternalLink';
import Skeleton from 'modules/app/components/SkeletonThemed';
import Tooltip from 'modules/app/components/Tooltip';
import { DelegationHistory } from 'modules/delegates/types';
import { formatDateWithTime } from 'lib/datetime';
import { SupportedNetworks } from 'modules/web3/constants/networks';
import { formatValue } from 'lib/string';
import { parseEther, formatEther } from 'viem';
import AddressIconBox from 'modules/address/components/AddressIconBox';
import EtherscanLink from 'modules/web3/components/EtherscanLink';
import { useNetwork } from 'modules/app/hooks/useNetwork';
import { calculatePercentage } from 'lib/utils';
import useSWR from 'swr';
import { fetchJson } from 'lib/fetchJson';

type DelegatedByAddressProps = {
  delegators: DelegationHistory[];
  totalDelegated: bigint;
  delegateAddress: string;
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
};

type CollapsableRowProps = {
  delegator: DelegationHistory;
  network: SupportedNetworks;
  bpi: number;
  totalDelegated: bigint;
  delegateAddress?: string; // Optional for backwards compatibility
};

const formatTotalDelegated = (num: bigint, denom: bigint): string => {
  try {
    return calculatePercentage(num, denom, 2).toString();
  } catch (e) {
    return '0';
  }
};

const CollapsableRow = ({ delegator, network, bpi, totalDelegated, delegateAddress }: CollapsableRowProps) => {
  const [expanded, setExpanded] = useState(false);
  const { address, lockAmount, events } = delegator;
  
  // Lazy-load delegation history when delegateAddress is provided
  const shouldFetchHistory = expanded && delegateAddress && (!events || events.length === 0);
  const historyApiUrl = shouldFetchHistory 
    ? `/api/delegates/${delegateAddress}/delegator/${address}/history?network=${network}`
    : null;
  
  const { data: historyData, error: historyError } = useSWR(
    historyApiUrl,
    fetchJson,
    {
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false
    }
  );
  
  // Use lazy-loaded history if available, otherwise use pre-loaded events
  const actualEvents = historyData?.delegationHistory 
    ? historyData.delegationHistory.map(event => ({
        lockAmount: formatEther(BigInt(event.amount)), // Convert wei to ether format
        blockTimestamp: new Date(parseInt(event.timestamp) * 1000).toISOString(),
        hash: event.txnHash,
        isStakingEngine: event.isStakingEngine
      }))
    : events || [];
  
  const sortedEvents = actualEvents.sort((prev, next) => (prev.blockTimestamp > next.blockTimestamp ? -1 : 1));
  return (
    <tr>
      <Flex as="td" sx={{ flexDirection: 'column', mb: [0, 3], pt: ['10px', 0], mr: 2 }}>
        <Heading variant="microHeading">
          <InternalLink
            href={`/address/${address}`}
            title="View address detail"
            styles={{ fontSize: [1, 3] }}
          >
            <AddressIconBox address={address} width={bpi < 1 ? 22 : 41} />
          </InternalLink>
        </Heading>
        {expanded && (
          <Flex sx={{ pl: 3, flexDirection: 'column' }}>
            {shouldFetchHistory && !historyData && !historyError ? (
              <Text variant="smallCaps" sx={{ pt: 2, pb: 2 }}>
                Loading delegation history...
              </Text>
            ) : historyError ? (
              <Text variant="smallCaps" sx={{ pt: 2, pb: 2, color: 'bear' }}>
                Error loading delegation history
              </Text>
            ) : (
              sortedEvents.map(({ blockTimestamp }) => {
                return (
                  <Text
                    key={blockTimestamp}
                    variant="smallCaps"
                    sx={{
                      ':first-of-type': { pt: 2 },
                      ':not(:last-of-type)': { pb: 2 }
                    }}
                  >
                    {formatDateWithTime(blockTimestamp)}
                  </Text>
                );
              })
            )}
          </Flex>
        )}
      </Flex>
      <Box as="td" sx={{ verticalAlign: 'top', pt: 2 }}>
        <Text sx={{ fontSize: [1, 3] }}>
          {/*TODO why does the lock amount have decimal places? They all end in .0 */}
          {`${formatValue(parseEther(lockAmount), 'wad')}${bpi > 0 ? ' SKY' : ''}`}
        </Text>
        {expanded && (
          <Flex sx={{ flexDirection: 'column' }}>
            {shouldFetchHistory && !historyData && !historyError ? (
              <Text variant="smallCaps" sx={{ pt: 3, pb: 2 }}>
                Loading...
              </Text>
            ) : historyError ? (
              <Text variant="smallCaps" sx={{ pt: 3, pb: 2, color: 'bear' }}>
                Error loading amounts
              </Text>
            ) : (
              sortedEvents.map(({ blockTimestamp, lockAmount, isStakingEngine }) => {
                return (
                  <Flex
                    key={blockTimestamp}
                    sx={{
                      alignItems: 'center',
                      ':first-of-type': { pt: 3 },
                      ':not(:last-of-type)': { pb: 2 }
                    }}
                  >
                    {lockAmount.indexOf('-') === 0 ? (
                      <Icon name="decrease" size={2} color="bear" />
                    ) : (
                      <Icon name="increase" size={2} color="bull" />
                    )}
                    <Text key={blockTimestamp} variant="smallCaps" sx={{ pl: 2 }}>
                      {`${formatValue(
                        parseEther(lockAmount.indexOf('-') === 0 ? lockAmount.substring(1) : lockAmount),
                        'wad'
                      )}${bpi > 0 ? ' SKY' : ''}`}
                    </Text>
                    <Text key={blockTimestamp} variant="smallCaps" sx={{ pl: 2 }}>
                      {isStakingEngine ? '(Staking)' : ''}
                    </Text>
                  </Flex>
                );
              })
            )}
          </Flex>
        )}
      </Box>
      <Box as="td" sx={{ verticalAlign: 'top', pt: 2 }}>
        {totalDelegated ? (
          <Text sx={{ fontSize: [1, 3] }}>{`${formatTotalDelegated(
            parseEther(lockAmount),
            totalDelegated
          )}%`}</Text>
        ) : (
          <Box sx={{ width: '100%' }}>
            <Skeleton />
          </Box>
        )}
      </Box>
      <Box as="td" sx={{ textAlign: 'end', verticalAlign: 'top', width: '100%', pt: 2 }}>
        <Box sx={{ height: '32px' }}>
          <Flex
            sx={{
              bg: 'background',
              size: 'auto',
              width: '17px',
              height: '17px',
              float: 'right',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'round'
            }}
          >
            <IconButton aria-label="Delegate history expand" onClick={() => setExpanded(!expanded)}>
              <Icon name={expanded ? 'minus' : 'plus'} />
            </IconButton>
          </Flex>
        </Box>
        {expanded && (
          <Flex sx={{ flexDirection: 'column' }}>
            {shouldFetchHistory && !historyData && !historyError ? (
              <Text variant="smallCaps" sx={{ pt: 2, pb: 2, textAlign: 'right' }}>
                Loading...
              </Text>
            ) : historyError ? (
              <Text variant="smallCaps" sx={{ pt: 2, pb: 2, color: 'bear', textAlign: 'right' }}>
                Error
              </Text>
            ) : (
              sortedEvents.map(({ blockTimestamp, hash }) => {
                return (
                  <Flex
                    key={blockTimestamp}
                    sx={{
                      justifyContent: 'flex-end',
                      lineHeight: '20px',
                      fontSize: 1,
                      ':not(:last-of-type)': { pb: 2 }
                    }}
                  >
                    <EtherscanLink type="transaction" network={network} hash={hash as string} prefix="" />
                  </Flex>
                );
              })
            )}
          </Flex>
        )}
      </Box>
    </tr>
  );
};

const DelegatedByAddress = ({ delegators, totalDelegated, delegateAddress, hasMore, isLoading, onLoadMore }: DelegatedByAddressProps): JSX.Element => {
  const bpi = useBreakpointIndex();
  const network = useNetwork();

  return (
    <Box>
      <Box mb={3}>
        <Text
          as="p"
          variant="h2"
          sx={{
            fontSize: 4,
            fontWeight: 'semiBold'
          }}
        >
          Delegators
        </Text>
        <Text as="p" variant="secondary" color="onSurface">
          Addresses that have delegated SKY to this delegate
        </Text>
      </Box>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse'
        }}
      >
        <thead>
          <tr>
            <Text
              as="th"
              sx={{ textAlign: 'left', pb: 2, width: '30%' }}
              variant="caps"
            >
              Address
            </Text>
            <Text
              as="th"
              sx={{ textAlign: 'left', pb: 2, width: '30%' }}
              variant="caps"
            >
              {bpi < 1 ? 'SKY' : 'SKY Delegated'}
            </Text>
            <Tooltip label={'This is the percentage of the total SKY delegated to this delegate.'}>
              <Text
                as="th"
                sx={{ textAlign: 'left', pb: 2, width: '20%' }}
                variant="caps"
              >
                {bpi < 1 ? '%' : 'Voting Weight'}
              </Text>
            </Tooltip>
            <Text as="th" sx={{ textAlign: 'right', pb: 2, width: '20%' }} variant="caps">
              Expand
            </Text>
          </tr>
        </thead>
        <tbody>
          {delegators.length > 0 ? (
            delegators.map(delegator => (
              <CollapsableRow
                key={delegator.address}
                delegator={delegator}
                network={network}
                bpi={bpi}
                totalDelegated={totalDelegated}
                delegateAddress={delegateAddress}
              />
            ))
          ) : (
            <tr key={0}>
              <td colSpan={4}>
                <Text color="text" variant="allcaps">
                  {isLoading ? 'Loading...' : 'No delegators found'}
                </Text>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {hasMore && (
        <Flex sx={{ justifyContent: 'center', mt: 4, mb: 2 }}>
          <Button
            variant="mutedOutline"
            onClick={onLoadMore}
            disabled={isLoading}
            sx={{
              cursor: isLoading ? 'wait' : 'pointer',
            }}
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </Button>
        </Flex>
      )}
    </Box>
  );
};

export default DelegatedByAddress;
