import {
  Client,
  PrivateKey,
  TransferTransaction,
  Hbar,
  AccountId,
} from "@hashgraph/sdk";

function getClient() {
  const accountId = process.env.HEDERA_ACCOUNT_ID!;
  const privateKey = process.env.HEDERA_PRIVATE_KEY!;

  return Client.forTestnet().setOperator(
    accountId,
    PrivateKey.fromStringECDSA(privateKey)
  );
}

export async function lockEscrow(
  budgetHbar: number,
  taskId: string
): Promise<string> {
  const client = getClient();
  const platformAccountId = process.env.HEDERA_ACCOUNT_ID!;

  // For MVP: escrow = funds stay in platform account, we just log the TX
  const tx = new TransferTransaction()
    .addHbarTransfer(platformAccountId, new Hbar(0)) // self-transfer to generate TX ID
    .setTransactionMemo(`escrow:${taskId}:${budgetHbar}HBAR`);

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

export async function simulateDeposit(
  recipientAccountId: string,
  amountHbar: number
): Promise<string> {
  const client = getClient();
  const platformAccountId = process.env.HEDERA_ACCOUNT_ID!;

  const tx = new TransferTransaction()
    .addHbarTransfer(platformAccountId, new Hbar(-amountHbar))
    .addHbarTransfer(recipientAccountId, new Hbar(amountHbar))
    .setTransactionMemo(`simulate-deposit:${amountHbar}HBAR`);

  const response = await tx.execute(client);
  await response.getReceipt(client);

  return response.transactionId.toString();
}

export function hashscanUrl(txId: string): string {
  // Hedera TX IDs use @ separator on Hashscan
  const formatted = txId.replace("@", "-");
  return `https://hashscan.io/testnet/transaction/${formatted}`;
}
