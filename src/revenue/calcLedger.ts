import type { OrderItemT, PaymentT } from "../types";

export function calcLedger(
	transactionItems: (OrderItemT | PaymentT)[],
	date: string,
	locationCode: string | null | undefined
) {
	console.log("transactionItems?.length: ", transactionItems?.length);

	if (!locationCode) {
		console.error("Location code not provided: ", transactionItems);
	}

	const ledgerAmount =
		transactionItems.reduce((acc, item) => {
			acc += item.Amount ?? 0;
			return acc;
		}, 0) * -1;

	// console.log("ledgerAmount: ", ledgerAmount);

	return {
		Amount: parseFloat(ledgerAmount.toFixed(2)),
		TransCode: "Ledger",
		GLCode: `${locationCode}-8700`,
		Location: locationCode ?? undefined,
		Date: date,
		Reference: `${locationCode}-${date.replaceAll("/", "-")}`,
		DebitCredit: ledgerAmount >= 0 ? "C" : "D",
	};
}
