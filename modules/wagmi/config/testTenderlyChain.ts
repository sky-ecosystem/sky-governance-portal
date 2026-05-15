import { Chain, defineChain } from 'viem';
import tenderlyTestnetData from '../../../tenderlyTestnetData.json';
import { RPC_TENDERLY, tenderly } from './config.default';
import { mainnet } from 'viem/chains';

export const getTestTenderlyChain = () => {
  const { TENDERLY_RPC_URL } = tenderlyTestnetData;

  return defineChain({
    id: tenderly.id,
    name: 'Tenderly Mainnet',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: {
        http: [TENDERLY_RPC_URL || RPC_TENDERLY]
      }
    },
    contracts: mainnet.contracts
  }) as Chain;
};
