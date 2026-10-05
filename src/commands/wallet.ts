import { PostizAPI } from '../api';
import { getConfig } from '../config';

// The credit wallet, read-only. Top-ups happen in Studio.

export async function walletBalance() {
  const api = new PostizAPI(getConfig());

  try {
    const result: any = await api.getWallet();
    if (result?.usesWallet === false) {
      console.log(`💳 ${result.message || 'Your plan does not use wallet credits.'}`);
      return result;
    }
    console.log(`💳 Balance: ${Number(result.balance).toFixed(2)} credits`);
    if (result.forecast?.short) {
      console.log(
        `⚠️  Scheduled usage in the next ${result.forecast.windowHours} hours needs ${Number(
          result.forecast.neededCredits
        ).toFixed(2)} credits. Top up: ${result.topUpUrl}`
      );
    }
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error: any) {
    console.error('❌ Failed to read the wallet:', error.message);
    process.exit(1);
  }
}

export async function walletPrices(args: any) {
  const api = new PostizAPI(getConfig());

  try {
    const result: any = await api.getWalletPrices(args?.provider);
    console.log('🏷️  Prices (channels not listed are free):');
    for (const section of result?.sections || []) {
      console.log(`\n${section.label}`);
      for (const item of section.items || []) {
        console.log(
          `  ${item.name} (${item.key}): ${item.price} ${item.pricingModel}, ${item.includedFree}`
        );
      }
    }
    return result;
  } catch (error: any) {
    console.error('❌ Failed to read the prices:', error.message);
    process.exit(1);
  }
}

export async function walletTransactions(args: any) {
  const api = new PostizAPI(getConfig());

  try {
    const result = await api.getWalletTransactions(
      args?.page,
      args?.size,
      args?.type
    );
    console.log('🧾 Transactions:');
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error: any) {
    console.error('❌ Failed to read the transactions:', error.message);
    process.exit(1);
  }
}

export async function walletEstimate(args: any) {
  const api = new PostizAPI(getConfig());
  const contents = ([] as string[]).concat(args.content || []);

  if (!contents.length) {
    console.error('❌ Pass the post with -c, and each thread item with another -c');
    process.exit(1);
  }

  try {
    const result = await api.estimateWallet({
      provider: args.provider,
      contents,
    });
    console.log('🧮 Estimate (nothing is charged):');
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error: any) {
    console.error('❌ Failed to price the post:', error.message);
    process.exit(1);
  }
}
