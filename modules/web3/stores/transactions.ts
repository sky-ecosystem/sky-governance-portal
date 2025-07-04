/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { create } from 'zustand';
import invariant from 'tiny-invariant';
import { v4 as uuidv4 } from 'uuid';
import { Transaction as ViemTransaction } from 'viem';
import { Transaction, TXMined, TXPending, TXInitialized, TXError } from '../types/transaction';
import { parseTxError } from '../helpers/errors';
import { SupportedNetworks } from '../constants/networks';
import { getPublicClient } from '../helpers/getPublicClient';
import { networkNameToChainId } from 'modules/web3/helpers/chain';

export type TxCallbacks = {
  initialized?: (txId: string) => void;
  pending?: (txHash: string) => void;
  mined?: (txId: string, txHash: string) => void;
  error?: (txId: string, error?: string) => void;
};

type Store = {
  transactions: Transaction[];
  initTx: (txId: string, from: string, message: string | null, gaslessNetwork?: SupportedNetworks) => void;
  setMessage: (txId: string, message: string | null) => void;
  setPending: (txId: string, hash: string) => void;
  setMined: (txId: string) => void;
  setError: (txId: string, error?: Error) => void;
  track: (
    txCreator: () => Promise<ViemTransaction>,
    account?: string,
    message?: string,
    callbacks?: TxCallbacks,
    gaslessNetwork?: SupportedNetworks
  ) => string | null;
  listen: (promise: Promise<ViemTransaction>, txId: string, callbacks?: TxCallbacks) => void;
};

const [useTransactionsStore, transactionsApi] = create<Store>((set, get) => ({
  transactions: [],

  initTx: (txId, from, message, gaslessNetwork) => {
    const status = 'initialized';
    set({
      transactions: get().transactions.concat([
        {
          from,
          id: txId,
          status,
          message,
          submittedAt: new Date(),
          hash: null,
          error: null,
          errorType: null,
          gaslessNetwork
        }
      ])
    });
  },
  setMessage: (txId, message) => {
    set(({ transactions }) => {
      const transactionIndex = transactions.findIndex(tx => tx.id === txId);
      invariant(transactionIndex >= 0, `Unable to find tx id ${txId}`);
      const prevState = transactions[transactionIndex];
      const nextState = {
        ...prevState,
        message
      };
      transactions[transactionIndex] = nextState;
      return { transactions };
    });
  },

  setPending: (txId, hash) => {
    const status = 'pending';
    set(({ transactions }) => {
      const transactionIndex = transactions.findIndex(tx => tx.id === txId);
      invariant(transactionIndex >= 0, `Unable to find tx id ${txId}`);
      const prevState = transactions[transactionIndex] as TXInitialized;
      const nextState: TXPending = {
        ...prevState,
        status,
        hash
      };

      transactions[transactionIndex] = nextState;
      return { transactions };
    });
  },

  setMined: txId => {
    const status = 'mined';
    set(({ transactions }) => {
      const transactionIndex = transactions.findIndex(tx => tx.id === txId);
      invariant(transactionIndex >= 0, `Unable to find tx id ${txId}`);
      const prevState = transactions[transactionIndex] as TXPending;
      const nextState: TXMined = {
        ...prevState,
        status
      };

      transactions[transactionIndex] = nextState;
      return { transactions };
    });
  },

  setError: (txId, error) => {
    const status = 'error';
    set(({ transactions }) => {
      const transactionIndex = transactions.findIndex(tx => tx.id === txId);
      invariant(transactionIndex >= 0, `Unable to find tx id ${txId}`);
      const prevState = transactions[transactionIndex] as Transaction;
      const nextState: TXError = {
        ...prevState,
        status,
        error: error ? parseTxError(error) : null,
        errorType: transactions[transactionIndex].hash ? 'failed' : 'not sent'
      };

      transactions[transactionIndex] = nextState;

      return { transactions };
    });
  },

  track: (txCreator, account, message = '', callbacks, gaslessNetwork) => {
    if (!account) {
      return null;
    }

    const txId: string = uuidv4();
    get().initTx(txId, account, message, gaslessNetwork);
    if (typeof callbacks?.initialized === 'function') callbacks.initialized(txId);

    const txPromise = txCreator();
    get().listen(txPromise, txId, callbacks);

    return txId;
  },

  listen: async (txPromise, txId, callbacks) => {
    let txFullObject: ViemTransaction;
    let knownTxState: Transaction | undefined;
    try {
      knownTxState = get().transactions.find(t => t.id === txId);
      if (!knownTxState) {
        console.error(
          `Transaction state for ${txId} not found in store. Proceeding without fallback chainId derivation.`
        );
      }

      txFullObject = await txPromise;
    } catch (e) {
      get().setError(txId, e as Error);
      if (typeof callbacks?.error === 'function') callbacks.error(txId, parseTxError(e as Error));
      return;
    }

    get().setPending(txId, txFullObject.hash);
    if (typeof callbacks?.pending === 'function') callbacks.pending(txFullObject.hash);

    let chainIdToUse: number | undefined = txFullObject.chainId;

    if (chainIdToUse === undefined || chainIdToUse === null) {
      console.warn(`Transaction ${txFullObject.hash} (ID: ${txId}) is missing chainId from RPC response.`);
      if (knownTxState && knownTxState.gaslessNetwork) {
        try {
          const derivedChainId = networkNameToChainId(knownTxState.gaslessNetwork);
          if (derivedChainId !== undefined) {
            chainIdToUse = derivedChainId;
            console.log(
              `Using derived chainId ${chainIdToUse} for tx ${txFullObject.hash} (ID: ${txId}) from gaslessNetwork ${knownTxState.gaslessNetwork}.`
            );
          } else {
            console.error(
              `Could not derive chainId for tx ${txFullObject.hash} (ID: ${txId}) using gaslessNetwork ${knownTxState.gaslessNetwork}.`
            );
          }
        } catch (e) {
          console.error(
            `Error deriving chainId for tx ${txFullObject.hash} (ID: ${txId}) with gaslessNetwork ${knownTxState.gaslessNetwork}:`,
            e
          );
        }
      } else {
        console.warn(
          `No knownTxState or gaslessNetwork available for tx ${txFullObject.hash} (ID: ${txId}) to derive chainId.`
        );
      }
    }

    if (chainIdToUse !== undefined && chainIdToUse !== null) {
      const publicClient = getPublicClient(chainIdToUse);
      publicClient
        .waitForTransactionReceipt({ hash: txFullObject.hash })
        .then(() => {
          get().setMined(txId);
          if (typeof callbacks?.mined === 'function') callbacks.mined(txId, txFullObject.hash);
        })
        .catch(e => {
          get().setError(txId, e as Error);
          if (typeof callbacks?.error === 'function') callbacks.error(txId, parseTxError(e as Error));
        });
    } else {
      const e = new Error(
        `Transaction chainId is not defined and could not be derived for tx ${txFullObject.hash} (ID: ${txId})`
      );
      get().setError(txId, e);
      if (typeof callbacks?.error === 'function') callbacks.error(txId, parseTxError(e));
    }
  }
}));

const transactionsSelectors = {
  getTransaction: (state, txId): Transaction => {
    const tx = state.transactions.find(tx => tx.id === txId);
    invariant(tx, `Unable to find tx id ${txId}`);
    return tx;
  }
};

export default useTransactionsStore;
export { transactionsApi, transactionsSelectors };
