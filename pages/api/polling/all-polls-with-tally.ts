/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { NextApiRequest, NextApiResponse } from 'next';
import { getPollsPaginated } from 'modules/polling/api/fetchPolls';
import { fetchSinglePoll } from 'modules/polling/api/fetchPollBy';
import { getPollTally } from 'modules/polling/helpers/getPollTally';
import withApiHandler from 'modules/app/api/withApiHandler';
import { DEFAULT_NETWORK, SupportedNetworks } from 'modules/web3/constants/networks';
import validateQueryParam from 'modules/app/api/validateQueryParam';
import { PollInputFormat, PollOrderByEnum, PollStatusEnum } from 'modules/polling/polling.constants';
import { PollListItem, PollTally } from 'modules/polling/types';
import { PollsPaginatedResponse } from 'modules/polling/types/pollsResponse';
import { pollHasStarted } from 'modules/polling/helpers/utils';

type PollWithTally = PollListItem & {
  tally: PollTally | null;
};

type PollsWithTallyResponse = Omit<PollsPaginatedResponse, 'polls'> & {
  polls: PollWithTally[];
};

/**
 * @swagger
 * /api/polling/all-polls-with-tally:
 *   get:
 *     tags:
 *       - "polls"
 *     description: Returns a paginated list of polls with their tally data included.
 *     summary: Returns a paginated list of polls with tally data
 *     produces:
 *       - "application/json"
 *     parameters:
 *       - name: network
 *         in: query
 *         description: The network to query the polls for. Defaults to mainnet.
 *         required: false
 *         schema:
 *           type: string
 *           enum: [mainnet, tenderly]
 *           default: mainnet
 *       - name: pageSize
 *         in: query
 *         description: The number of polls to return per page.
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 30
 *           default: 20
 *       - name: page
 *         in: query
 *         description: The page number to return.
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - name: title
 *         in: query
 *         description: The title or portion of the title to filters the polls for.
 *         required: false
 *         schema:
 *           type: string
 *       - name: orderBy
 *         in: query
 *         description: The sorting criteria used to order the polls returned.
 *         required: false
 *         schema:
 *           type: string
 *           enum: [NEAREST_END, FURTHEST_END, NEAREST_START, FURTHEST_START]
 *           default: NEAREST_END
 *       - name: tags
 *         in: query
 *         description: The tags to filter the polls by (e.g., core-unit-budget, ratification-poll).
 *         required: false
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *       - name: status
 *         in: query
 *         description: The status the poll is in.
 *         required: false
 *         schema:
 *           type: string
 *           enum: [ACTIVE, ENDED]
 *       - name: type
 *         in: query
 *         description: The input format type(s) of the poll.
 *         required: false
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [singleChoice, rankFree, chooseFree, majority]
 *       - name: startDate
 *         in: query
 *         description: Minimum start date of the polls returned (ISO8601 format).
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: endDate
 *         in: query
 *         description: Maximum end date of the polls returned (ISO8601 format).
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: A paginated list of polls with their tally data included.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 paginationInfo:
 *                   type: object
 *                   properties:
 *                     totalCount:
 *                       type: number
 *                     page:
 *                       type: number
 *                     numPages:
 *                       type: number
 *                     hasNextPage:
 *                       type: boolean
 *                 stats:
 *                   type: object
 *                   properties:
 *                     active:
 *                       type: number
 *                     finished:
 *                       type: number
 *                     total:
 *                       type: number
 *                     type:
 *                       type: object
 *                       nullable: true
 *                 polls:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/PollListItem'
 *                       - type: object
 *                         properties:
 *                           tally:
 *                             $ref: '#/definitions/PollTallyResponse'
 *                             nullable: true
 *                 tags:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TagCount'
 */

export default withApiHandler(async (req: NextApiRequest, res: NextApiResponse<PollsWithTallyResponse>) => {
  const network = validateQueryParam(req.query.network, 'string', {
    defaultValue: DEFAULT_NETWORK.network,
    validValues: [SupportedNetworks.TENDERLY, SupportedNetworks.MAINNET]
  }) as SupportedNetworks;

  const pageSize = validateQueryParam(req.query.pageSize, 'number', {
    defaultValue: 20,
    minValue: 1,
    maxValue: 30
  }) as number;

  const page = validateQueryParam(req.query.page, 'number', {
    defaultValue: 1,
    minValue: 1
  }) as number;

  const title = validateQueryParam(req.query.title, 'string', {
    defaultValue: null
  }) as string | null;

  const orderBy = validateQueryParam(req.query.orderBy, 'string', {
    defaultValue: PollOrderByEnum.nearestEnd,
    validValues: [
      PollOrderByEnum.nearestEnd,
      PollOrderByEnum.furthestEnd,
      PollOrderByEnum.nearestStart,
      PollOrderByEnum.furthestStart
    ]
  }) as PollOrderByEnum;

  const tags = validateQueryParam(req.query.tags, 'array', {
    defaultValue: null
  }) as string[] | null;

  const status = validateQueryParam(req.query.status, 'string', {
    defaultValue: null,
    validValues: [PollStatusEnum.active, PollStatusEnum.ended]
  }) as PollStatusEnum | null;

  const type =
    ((
      validateQueryParam(req.query.type, 'array', {
        defaultValue: null
      }) as string[] | null
    )
      ?.map(t =>
        validateQueryParam(t, 'string', {
          defaultValue: null,
          validValues: [PollInputFormat.singleChoice, PollInputFormat.rankFree, PollInputFormat.chooseFree]
        })
      )
      .filter(t => !!t) as PollInputFormat[] | undefined) || null;

  const startDate = validateQueryParam(req.query.startDate, 'date', {
    defaultValue: null
  }) as Date | null;

  const endDate = validateQueryParam(req.query.endDate, 'date', {
    defaultValue: null
  }) as Date | null;

  // Get the basic polls response
  const pollsResponse = await getPollsPaginated({
    network,
    pageSize,
    page,
    title,
    orderBy,
    tags,
    status,
    type,
    startDate,
    endDate
  });

  // For each poll, fetch the full poll data and tally
  const pollsWithTally: PollWithTally[] = await Promise.all(
    pollsResponse.polls.map(async (pollListItem): Promise<PollWithTally> => {
      try {
        // Fetch the full poll object to get all necessary data for tally calculation
        const fullPoll = await fetchSinglePoll(network, pollListItem.pollId);
        
        if (!fullPoll || !pollHasStarted(fullPoll)) {
          // Return poll with empty tally if poll hasn't started or doesn't exist
          return {
            ...pollListItem,
            tally: null
          };
        }

        // Get the tally for this poll
        const tally = await getPollTally(fullPoll, network);
        
        return {
          ...pollListItem,
          tally
        };
      } catch (error) {
        console.error(`Error fetching tally for poll ${pollListItem.pollId}:`, error);
        // Return poll with null tally if there's an error
        return {
          ...pollListItem,
          tally: null
        };
      }
    })
  );

  const response: PollsWithTallyResponse = {
    paginationInfo: pollsResponse.paginationInfo,
    stats: pollsResponse.stats,
    polls: pollsWithTally,
    tags: pollsResponse.tags
  };

  res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate');
  res.status(200).json(response);
});