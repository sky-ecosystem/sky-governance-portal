import { test } from './fixtures/base';
import { connectWallet } from './shared';
import './forkVnet';

test('delegate SKY', async ({ page, delegatePage }) => {
  await test.step('navigate to delegate page', async () => {
    await delegatePage.goto();
  });

  await test.step('connect wallet', async () => {
    await connectWallet(page);
  });

  // TODO: V2 delegates don't show up in tenderly e2e fork as contracts so their delegated amount doesn't show up
  // neither does the delegation actions work
  await test.step('sort delegates and perform delegation', async () => {
    await delegatePage.sortByHighestFirst();
    await delegatePage.delegate('2');
    // Skip verification due to known issue with V2 delegates in tenderly fork
    // await delegatePage.verifyDelegatedAmount('2');
  });

  // Skip undelegation due to known issue with V2 delegates in tenderly fork
  // await test.step('undelegate SKY', async () => {
  //   await delegatePage.undelegateAll();
  // });
});
