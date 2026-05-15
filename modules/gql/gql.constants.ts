/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

/* Envio HyperIndex URL (proxied via proxy.sky.money) */

const PROXY_ORIGIN = process.env.NEXT_PUBLIC_PROXY_ORIGIN || 'https://staging-proxy.sky.money';

export const INDEXER_URL = `${PROXY_ORIGIN}/indexer`;

export const stakingEngineAddressMainnet = '0xce01c90de7fd1bcfa39e237fe6d8d9f569e8a6a3';
export const stakingEngineAddressTestnet = '0xce01c90de7fd1bcfa39e237fe6d8d9f569e8a6a3';
