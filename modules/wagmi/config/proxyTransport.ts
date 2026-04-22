import { fallback, http } from 'viem';

const PROXY_ORIGIN = process.env.NEXT_PUBLIC_PROXY_ORIGIN || '';

export const createProxyTransport = (chainId: number) =>
  fallback([
    http(`${PROXY_ORIGIN}/rpc/${chainId}`, { batch: { wait: 500 } }),
    http(`${PROXY_ORIGIN}/rpc-fallback/${chainId}`, { batch: { wait: 500 } })
  ]);
