/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { cacheGet, cacheSet } from 'modules/cache/cache';
import { Tag } from 'modules/app/types/tag';
import pollTags from 'modules/tags/constants/poll-tags-definitions.json';
import pollTagsMapping from 'modules/tags/constants/poll-tags-mapping.json';
import {
  pollTagsDefinitionJSONCacheKey,
  pollTagsMappingJSONCacheKey
} from 'modules/cache/constants/cache-keys';
import { DEFAULT_NETWORK } from 'modules/web3/constants/networks';
import { ONE_WEEK_IN_MS } from 'modules/app/constants/time';

export async function getPollTags(): Promise<Tag[]> {
  try {
    const existingTagDefinitions = await cacheGet(pollTagsDefinitionJSONCacheKey);

    if (existingTagDefinitions) {
      return JSON.parse(existingTagDefinitions);
    }

    const urlPollTagDefinitions =
      'https://raw.githubusercontent.com/sky-ecosystem/polls/refs/heads/main/meta/tags.json';
    const pollTagDefinitions = await fetch(urlPollTagDefinitions);
    const dataPollTagDefinitions = await pollTagDefinitions.json();

    cacheSet(
      pollTagsDefinitionJSONCacheKey,
      JSON.stringify(dataPollTagDefinitions),
      DEFAULT_NETWORK.network,
      ONE_WEEK_IN_MS
    );

    return dataPollTagDefinitions;
  } catch (e) {
    return pollTags;
  }
}

export async function getPollTagsMapping(): Promise<{ [key: number]: string[] }> {
  try {
    const existingTags = await cacheGet(pollTagsMappingJSONCacheKey);

    if (existingTags) {
      return JSON.parse(existingTags);
    }

    const urlPollTags =
      'https://raw.githubusercontent.com/sky-ecosystem/polls/refs/heads/main/meta/poll-tags.json';
    const pollTags = await fetch(urlPollTags);
    const dataPollTags = await pollTags.json();

    cacheSet(
      pollTagsMappingJSONCacheKey,
      JSON.stringify(dataPollTags),
      DEFAULT_NETWORK.network,
      ONE_WEEK_IN_MS
    );

    return dataPollTags;
  } catch (e) {
    return pollTagsMapping;
  }
}
