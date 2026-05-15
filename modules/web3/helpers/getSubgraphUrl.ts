import { URL_BA_LABS_API_MAINNET } from '../constants/networks';

export function getBaLabsApiUrl(chainId: number | undefined): string | null {
  if (chainId === undefined) return null;
  return URL_BA_LABS_API_MAINNET;
}

export function formatBaLabsUrl(url: URL) {
  url.searchParams.append('format', 'json');

  return url;
}
