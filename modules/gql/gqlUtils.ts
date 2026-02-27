/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

/**
 * Strip the chainId prefix from an Envio entity ID.
 * E.g., "1-0xabc123" -> "0xabc123"
 */
export function stripChainIdPrefix(id: string): string {
  const idx = id.indexOf('-');
  return idx > -1 ? id.substring(idx + 1) : id;
}
