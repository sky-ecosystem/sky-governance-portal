/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { DEFAULT_NETWORK, SupportedNetworks } from 'modules/web3/constants/networks';
import { cacheGet, cacheSet } from 'modules/cache/cache';
import { CMSProposal, Proposal, GithubProposal, SpellData } from 'modules/executive/types';
import { parseExecutive } from './parseExecutive';
import invariant from 'tiny-invariant';
import { markdownToHtml } from 'lib/markdown';
import { analyzeSpell, getExecutiveSkySupport } from './analyzeSpell';
import { ZERO_ADDRESS } from 'modules/web3/constants/addresses';
import logger from 'lib/logger';
import { getExecutiveProposalsCacheKey, githubExecutivesCacheKey } from 'modules/cache/constants/cache-keys';
import { ONE_HOUR_IN_MS } from 'modules/app/constants/time';
import { trimProposalKey } from '../helpers/trimProposalKey';
import { matterWrapper } from 'lib/matter';
import { isAddress } from 'viem';

export async function getGithubExecutives(network: SupportedNetworks): Promise<CMSProposal[]> {
  const cachedProposals = await cacheGet(githubExecutivesCacheKey, network);
  if (cachedProposals) {
    return JSON.parse(cachedProposals);
  }

  const githubRepo = {
    owner:
      network === SupportedNetworks.MAINNET && process.env.NEXT_PUBLIC_VERCEL_ENV !== 'development'
        ? 'sky-ecosystem'
        : 'jetstreamgg',
    repo: 'executive-votes',
    branch: network === SupportedNetworks.MAINNET ? 'main' : 'testnet'
  };

  const githubIndexUrl = `https://raw.githubusercontent.com/${githubRepo.owner}/${githubRepo.repo}/refs/heads/${githubRepo.branch}/index.json`;
  const activeExecsUrl = `https://raw.githubusercontent.com/${githubRepo.owner}/${githubRepo.repo}/refs/heads/${githubRepo.branch}/active/proposals.json`;

  let activeProposals: { mainnet: string[] } | null = null;
  let githubProposals: GithubProposal[] | null = null;

  try {
    const [activeExecsResponse, githubProposalsResponse] = await Promise.all([
      fetch(activeExecsUrl),
      fetch(githubIndexUrl)
    ]);

    if (!activeExecsResponse.ok) {
      throw new Error(`Failed to fetch proposal index: ${activeExecsResponse.statusText}`);
    }
    if (!githubProposalsResponse.ok) {
      throw new Error(`Failed to fetch github proposals: ${githubProposalsResponse.statusText}`);
    }

    try {
      activeProposals = await activeExecsResponse.json();
    } catch (e) {
      logger.error('getGithubExecutives: Failed to parse proposal index JSON', e);
      throw new Error('Failed to parse proposal index JSON');
    }

    try {
      githubProposals = await githubProposalsResponse.json();
    } catch (e) {
      logger.error('getGithubExecutives: Failed to parse github proposals JSON', e);
      throw new Error('Failed to parse github proposals JSON');
    }
  } catch (error) {
    logger.error(`getGithubExecutives: Error fetching executive data for network ${network}`, error);
    // Return empty array or re-throw, depending on desired upstream handling
    return [];
  }

  // Ensure activeProposals and githubProposals are not null before proceeding
  if (!activeProposals || !githubProposals) {
    logger.error(`getGithubExecutives: Failed to fetch necessary data for network ${network}`);
    return [];
  }

  const proposals = githubProposals.map(proposal => {
    try {
      const path = `https://raw.githubusercontent.com/${githubRepo.owner}/${githubRepo.repo}/${githubRepo.branch}/${proposal.path}`;
      return parseExecutive(proposal, activeProposals, path, network);
    } catch (e) {
      logger.error(`getGithubExecutives: network ${network}`, e);
      // Catch error and return null if failed fetching one proposal
      return null;
    }
  });

  const filteredProposals: CMSProposal[] = proposals
    .filter(x => !!x)
    .filter(x => x?.address !== ZERO_ADDRESS) as CMSProposal[];

  const sortedProposals = filteredProposals
    .sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime())
    .sort(a => (a.active ? -1 : 1)) // Sort by active first
    .slice(0, 100);

  cacheSet(githubExecutivesCacheKey, JSON.stringify(sortedProposals), network);

  return sortedProposals;
}

async function getGithubExecutivesWithSky(network: SupportedNetworks): Promise<CMSProposal[]> {
  const proposals = await getGithubExecutives(network);

  const skySupports = await Promise.all(
    proposals.map(async proposal => {
      const skySupport = await getExecutiveSkySupport(proposal.address, network);
      return {
        ...proposal,
        spellData: {
          skySupport
        }
      };
    })
  );

  return skySupports;
}

export async function getExecutiveProposals({
  start = 0,
  limit = 5,
  sortBy = 'active',
  startDate = 0,
  endDate = 0,
  network = DEFAULT_NETWORK.network
}: {
  start?: number;
  limit?: number;
  sortBy?: 'date' | 'sky' | 'active';
  startDate?: number;
  endDate?: number;
  network?: SupportedNetworks;
}): Promise<Proposal[]> {
  const currentNetwork = network;

  const cacheKey = getExecutiveProposalsCacheKey(start, limit, sortBy, startDate, endDate);

  logger.debug('Getting executives with key: ', cacheKey);

  const cachedProposals = await cacheGet(cacheKey, currentNetwork);
  if (cachedProposals) {
    return JSON.parse(cachedProposals);
  }
  const proposals =
    sortBy === 'sky'
      ? await getGithubExecutivesWithSky(currentNetwork)
      : await getGithubExecutives(currentNetwork);
  const sorted = proposals.sort((a, b) => {
    if (sortBy === 'sky') {
      const bSupport = b.spellData ? b.spellData?.skySupport || 0 : 0;
      const aSupport = a.spellData ? a.spellData?.skySupport || 0 : 0;
      return BigInt(bSupport) > BigInt(aSupport) ? 1 : -1;
    } else if (sortBy === 'date') {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    } else {
      return a.active ? -1 : 1; // Sort by active first
    }
  });

  // Filter by dates
  const filtered = sorted.filter(proposal => {
    if (startDate && new Date(proposal.date).getTime() < startDate) return false;
    if (endDate && new Date(proposal.date).getTime() > endDate) return false;
    return true;
  });

  const subset = filtered.slice(start, start + limit);

  const analyzedProposals = await Promise.all(
    subset.map(async p => {
      return {
        ...p,
        spellData: await analyzeSpell(p.address, currentNetwork)
      };
    })
  );

  cacheSet(cacheKey, JSON.stringify(analyzedProposals), currentNetwork, ONE_HOUR_IN_MS);

  return analyzedProposals;
}

export async function getExecutiveProposal(
  proposalId: string,
  network?: SupportedNetworks
): Promise<Proposal | null> {
  const net = network ? network : DEFAULT_NETWORK.network;

  const currentNetwork = net;

  // APP-244 TRACE: remove after debugging
  logger.info(`[APP-244] getExecutiveProposal start id=${proposalId} network=${currentNetwork}`);

  const proposals = await getGithubExecutives(currentNetwork);

  // APP-244 TRACE
  logger.info(
    `[APP-244] getExecutiveProposal loaded ${proposals.length} proposals from github cache/fetch`
  );

  const proposal = proposals.find(
    proposal =>
      trimProposalKey(proposal.key) === proposalId ||
      proposal.key === proposalId ||
      proposal.address.toLowerCase() === proposalId.toLowerCase()
  );

  // APP-244 TRACE
  logger.info(
    `[APP-244] getExecutiveProposal find result: ${proposal ? `found address=${proposal.address}` : 'NOT FOUND in github index'}`
  );

  if (!proposal) {
    // Fall back to rendering a minimal page when the id is a valid address
    // that isn't in the github executive-votes index. Without this, deep links
    // to older or unindexed spells return 404 (APP-244). We attempt to enrich
    // with on-chain spell data via analyzeSpell, but render even if that fails
    // — matches the /custom-spell/[address] behavior and avoids 404s when the
    // RPC proxy is unreachable (e.g. from some preview environments).
    if (isAddress(proposalId, { strict: false })) {
      // APP-244 TRACE
      logger.info(`[APP-244] entering on-chain fallback for ${proposalId}`);
      let spellData: SpellData = {
        hasBeenScheduled: false,
        skySupport: '0'
      };
      try {
        spellData = await analyzeSpell(proposalId, currentNetwork);
        // APP-244 TRACE
        logger.info(
          `[APP-244] analyzeSpell returned executiveHash=${spellData.executiveHash ?? 'undefined'}`
        );
      } catch (e) {
        logger.error(
          `[APP-244] analyzeSpell threw for ${proposalId} on ${currentNetwork}, rendering page without on-chain data`,
          e
        );
      }
      // APP-244 TRACE
      logger.info(`[APP-244] fallback returning Proposal with key=${proposalId.toLowerCase()}`);
      return {
        active: false,
        address: proposalId,
        key: proposalId.toLowerCase(),
        proposalBlurb: '',
        title: '',
        date: '',
        proposalLink: '',
        spellData
      };
    }
    // APP-244 TRACE
    logger.warn(`[APP-244] not a valid address — returning null for id=${proposalId}`);
    return null;
  }
  // APP-244 TRACE
  logger.info(`[APP-244] github match for ${proposalId}, fetching content + analyzeSpell`);
  invariant(proposal, `proposal not found for proposal id ${proposalId}`);

  const [spellText, spellData] = await Promise.all([
    (await fetch(proposal.proposalLink)).text(),
    analyzeSpell(proposal.address, currentNetwork)
  ]);

  const { content: contentText } = matterWrapper(spellText);
  const content = await markdownToHtml(contentText || '');

  return {
    ...proposal,
    spellData,
    content
  };
}
