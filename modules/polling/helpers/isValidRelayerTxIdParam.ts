// example format of valid id is '0x1234...' — a 0x-prefixed 32-byte EVM tx hash
export const isValidRelayerTxIdParam = (txId: string): boolean => {
  return !!txId && /^0x[0-9a-fA-F]{64}$/.test(txId);
};
