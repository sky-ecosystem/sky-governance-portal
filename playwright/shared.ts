import { Page } from '@playwright/test';

type TestAccount = {
  name: string;
  address: string;
};

enum TestAccountsEnum {
  normal = 'normal'
}

interface TestAccounts {
  [key: string]: TestAccount;
}

//this address is able to send transactions on the tenderly vnet via the wagmi mock
export const TEST_ACCOUNTS: TestAccounts = {
  [TestAccountsEnum.normal]: {
    name: 'Default test account',
    address: '0xdE70d75Bee022C0706C584042836a44ABc5bB863'
  }
};

export async function connectWallet(page: Page) {
  const connectBtn = page.getByRole('button', { name: 'Connect wallet' });

  // Idempotent: if the wallet is already connected (e.g. after an earlier
  // connectWallet call on a different page), the "Connect wallet" button is
  // gone and there is nothing to do.
  if ((await connectBtn.count()) === 0) return;

  await connectBtn.first().click();
  try {
    await page.waitForSelector('text="Connected with Mock"', { timeout: 2000 });
  } catch (error) {
    await page.getByTestId('select-wallet-mock').click();
    // Wait for the mock connector to finish connecting before returning,
    // otherwise downstream `:enabled` locators race the wallet state.
    await page.waitForSelector('text="Connected with Mock"', { timeout: 20000 });
  }
  await closeModal(page);
}

export async function closeModal(page: Page) {
  const closeButtons = await page.locator('[aria-label="close"]').all();
  for (const button of closeButtons) {
    await button.click();
  }
}
