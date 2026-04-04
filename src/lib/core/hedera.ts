import {
  Client,
  PrivateKey,
  TransferTransaction,
  Hbar,
  AccountBalanceQuery,
} from "@hashgraph/sdk";

let clientInstance: Client | null = null;

function validateEnv(): { accountId: string; privateKey: string } {
  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKey = process.env.HEDERA_PRIVATE_KEY;

  if (!accountId) {
    throw new Error("HEDERA_ACCOUNT_ID is not set. Configure it in .env.local");
  }
  if (!/^\d+\.\d+\.\d+$/.test(accountId)) {
    throw new Error(`Invalid HEDERA_ACCOUNT_ID format: ${accountId}. Expected 0.0.x`);
  }
  if (!privateKey) {
    throw new Error("HEDERA_PRIVATE_KEY is not set. Configure it in .env.local");
  }

  return { accountId, privateKey };
}

function getClient(): Client {
  if (clientInstance) return clientInstance;

  const { accountId, privateKey } = validateEnv();
  clientInstance = Client.forTestnet().setOperator(
    accountId,
    PrivateKey.fromStringECDSA(privateKey)
  );

  return clientInstance;
}

/**
 * Returns the platform operator account ID without exposing private keys.
 */
export function getOperatorAccountId(): string {
  const { accountId } = validateEnv();
  return accountId;
}

/**
 * Queries the platform operator account's HBAR balance on Hedera Testnet.
 */
export async function getAccountBalance(): Promise<number> {
  try {
    const client = getClient();

    const balance = await new AccountBalanceQuery()
      .setAccountId(getOperatorAccountId())
      .execute(client);

    return balance.hbars.toBigNumber().toNumber();
  } catch (error) {
    console.error("Hedera balance query failed:", error);
    throw new Error("Failed to query Hedera account balance. Check network or configuration.");
  }
}

export async function lockEscrow(
  budgetHbar: number,
  taskId: string,
  clientNullifier?: string
): Promise<string> {
  const client = getClient();
  const platformAccountId = getOperatorAccountId();

  const nullifierPrefix = clientNullifier ? clientNullifier.slice(0, 8) : "unknown";
  const memo = `escrow:${taskId}:${budgetHbar}HBAR:client:${nullifierPrefix}`;

  const tx = new TransferTransaction()
    .addHbarTransfer(platformAccountId, new Hbar(0))
    .setTransactionMemo(memo);

  const response = await tx.execute(client);
  const receipt = await response.getReceipt(client);

  if (receipt.status.toString() !== "SUCCESS") {
    throw new Error(`Hedera escrow failed: ${receipt.status}`);
  }

  return response.transactionId.toString();
}

export async function releasePayment(
  workerAccountId: string,
  budgetHbar: number,
  taskId: string
): Promise<string> {
  const client = getClient();
  const platformAccountId = process.env.HEDERA_ACCOUNT_ID!;

  const tx = new TransferTransaction()
    .addHbarTransfer(platformAccountId, new Hbar(-budgetHbar))
    .addHbarTransfer(workerAccountId, new Hbar(budgetHbar))
    .setTransactionMemo(`payment:${taskId}`);

  const response = await tx.execute(client);
  const receipt = await response.getReceipt(client);

  if (receipt.status.toString() !== "SUCCESS") {
    throw new Error(`Hedera payment failed: ${receipt.status}`);
  }

  return response.transactionId.toString();
}

/**
 * Simulates an HBAR deposit via a real Hedera transfer.
 * If recipientAccountId is provided, transfers from platform to recipient.
 * If null/undefined (demo mode), does a self-transfer on the platform account with a memo.
 */
export async function simulateDeposit(
  amountHbar: number,
  recipientAccountId?: string | null
): Promise<string> {
  const client = getClient();
  const platformAccountId = getOperatorAccountId();

  const tx = new TransferTransaction();

  if (recipientAccountId) {
    tx.addHbarTransfer(platformAccountId, new Hbar(-amountHbar))
      .addHbarTransfer(recipientAccountId, new Hbar(amountHbar))
      .setTransactionMemo(`simulate-deposit:${amountHbar}HBAR`);
  } else {
    tx.addHbarTransfer(platformAccountId, new Hbar(0))
      .setTransactionMemo(`simulate-deposit:demo:${amountHbar}HBAR`);
  }

  const response = await tx.execute(client);
  const receipt = await response.getReceipt(client);

  if (receipt.status.toString() !== "SUCCESS") {
    throw new Error(`Hedera simulate-deposit failed: ${receipt.status}`);
  }

  return response.transactionId.toString();
}

export function hashscanUrl(txId: string): string {
  // Hedera TX ID format: 0.0.X@seconds.nanos → Hashscan expects 0.0.X-seconds-nanos
  // Only replace the @ and the dot between seconds.nanos (after @), not dots in account ID
  const [accountPart, timestampPart] = txId.split("@");
  if (!timestampPart) {
    return `https://hashscan.io/testnet/transaction/${txId}`;
  }
  const formatted = `${accountPart}-${timestampPart.replace(".", "-")}`;
  return `https://hashscan.io/testnet/transaction/${formatted}`;
}
