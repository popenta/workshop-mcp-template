import { Account } from "@multiversx/sdk-core";
import { BigNumber } from 'bignumber.js';
import * as fs from "fs";


export const loadAccountFromEnv = (): Account => {
  const walletPath = process.env.MVX_WALLET;
  const password = process.env.MVX_WALLET_PASSWORD;

  if (!walletPath) {
    throw new Error("Wallet path not set in config file.");
  }

  if (!password) {
    throw new Error("Wallet password not set in config file.");
  }

  if (!fs.existsSync(walletPath)) {
    throw new Error(`Wallet file does not exist at: ${walletPath}`);
  }

  if (fs.statSync(walletPath).isDirectory()) {
    throw new Error(
      `MVX_WALLET points to a directory, not a file: ${walletPath}`
    );
  }

  return Account.newFromKeystore(walletPath, password);
};

export const denominateEgldValue = (value: string): bigint => {
  const factor = new BigNumber(10).pow(18);
  const denominated = new BigNumber(value).times(factor).toFixed(0);
  return BigInt(denominated);
};
