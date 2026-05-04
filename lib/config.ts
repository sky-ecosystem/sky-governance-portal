/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

type SystemConfig = {
  USE_CACHE: string;
  TRACING_RPC_NODE: string;
  NODE_ENV: 'development' | 'production' | 'test';
  REDIS_URL: string;
  PRIVY_APP_ID: string;
  PRIVY_APP_SECRET: string;
  PRIVY_WEBHOOK_SIGNING_SECRET: string;
  PRIVY_WALLET_ID_MAINNET: string;
  PRIVY_WALLET_ID_TESTNET: string;
  WALLETCONNECT_PROJECT_ID: string;
  MIGRATION_WEBHOOK_URL: string;
  GASLESS_WEBHOOK_URL: string;
  DASHBOARD_PASSWORD: string;
  GASLESS_BACKDOOR_SECRET: string;
  GASLESS_DISABLED: string;
  TENDERLY_RPC_KEY: string;
  USE_MOCK_WALLET: string;
  SUBGRAPH_API_KEY: string;
  PROXY_ORIGIN: string;
};

export const config: SystemConfig = {
  USE_CACHE: process.env.USE_CACHE || '',
  TRACING_RPC_NODE: process.env.TRACING_RPC_NODE || '',
  NODE_ENV: process.env.NODE_ENV || 'development',

  REDIS_URL: process.env.REDIS_URL || '',
  PRIVY_APP_ID: process.env.PRIVY_APP_ID || '',
  PRIVY_APP_SECRET: process.env.PRIVY_APP_SECRET || '',
  PRIVY_WEBHOOK_SIGNING_SECRET: process.env.PRIVY_WEBHOOK_SIGNING_SECRET || '',
  PRIVY_WALLET_ID_MAINNET: process.env.PRIVY_WALLET_ID_MAINNET || '',
  PRIVY_WALLET_ID_TESTNET: process.env.PRIVY_WALLET_ID_TESTNET || '',
  WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
  MIGRATION_WEBHOOK_URL: process.env.MIGRATION_WEBHOOK_URL || '',
  GASLESS_WEBHOOK_URL: process.env.GASLESS_WEBHOOK_URL || '',
  DASHBOARD_PASSWORD: process.env.DASHBOARD_PASSWORD || '',
  GASLESS_BACKDOOR_SECRET: process.env.GASLESS_BACKDOOR_SECRET || '',
  GASLESS_DISABLED: process.env.GASLESS_DISABLED || '',
  TENDERLY_RPC_KEY: process.env.NEXT_PUBLIC_TENDERLY_RPC_KEY || '',
  USE_MOCK_WALLET: process.env.NEXT_PUBLIC_USE_MOCK_WALLET || '',
  SUBGRAPH_API_KEY: process.env.NEXT_PUBLIC_SUBGRAPH_API_KEY || '',
  PROXY_ORIGIN: process.env.NEXT_PUBLIC_PROXY_ORIGIN || ''
};
