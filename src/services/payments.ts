import { ApiError, PaymentsService, type Payment } from "../client";
import type { PaymentT } from "../types";
import { sumCurrencyValues } from "../utils/utils";

interface Params {
	count?: number;
	startUtc: string;
	endUtc: string;
	enterpriseId: string;
}

export async function getAllPayments({
	count = 100,
	startUtc,
	endUtc,
	enterpriseId,
}: Params) {
	const data = [];
	let hasMore = true;
	let cursor = undefined;

	while (hasMore) {
		try {
			const res = await PaymentsService.paymentsGetAll({
				requestBody: {
					AccessToken: process.env.ACCESS_TOKEN!,
					ClientToken: process.env.CLIENT_TOKEN!,
					Client: process.env.CLIENT!,
					Limitation: { Count: count, Cursor: cursor },
					EnterpriseIds: [enterpriseId],
					CreatedUtc: {
						StartUtc: startUtc,
						EndUtc: endUtc,
					},
					AccountingStates: ["Open", "Closed"],
				},
			});

			cursor = res?.Cursor ? res.Cursor : undefined;
			hasMore = cursor ? true : false;
			res?.Payments?.length && data.push(...res.Payments);
			console.log(res?.Payments?.length, cursor);
		} catch (e) {
			if (e instanceof ApiError) {
				const error = e as ApiError;
				console.log("error: ", error.body);
			} else {
				console.log(e);
			}

			throw new Error("Error fetching Payments");
		}
	}
	return data;
}

export function transformPayments(
	payments: Payment[],
	timezone: string
): PaymentT[] {
	const transformed = payments.map((payment) => {
		const { Amount } = payment;

		// aggregate tax values
		let totalTaxValue = Amount?.TaxValues?.reduce(
			(acc, tax) => acc + (tax?.Value ? tax.Value : 0),
			0
		);
		totalTaxValue = totalTaxValue ? totalTaxValue : 0;

		const taxRateCode = Amount?.TaxValues
			? Amount.TaxValues?.[0]?.Code
			: undefined;

		return {
			AccountingCategoryId: payment.AccountingCategoryId,
			Amount: payment.Amount?.GrossValue,
			TaxValue: totalTaxValue,
			TaxRateCode: taxRateCode ?? undefined,
			ChargedUtc: payment?.ChargedUtc ?? undefined,
			Date: payment?.ChargedUtc
				? new Date(payment?.ChargedUtc).toLocaleDateString("en-AU", {
						timeZone: timezone,
				  })
				: undefined,
		} as PaymentT;
	});

	return transformed;
}

export function aggregatePaymentItems(
	paymentItemsTransformed?: PaymentT[]
): PaymentT[] {
	if (!paymentItemsTransformed) {
		return [];
	}

	// Group by date
	const groupedByDate = Object.groupBy(
		paymentItemsTransformed,
		(orderItem) => orderItem?.Date ?? "unknown"
	);

	// Aggregate by Accounting Category ID
	const groupedByDateAndCategory = Object.entries(groupedByDate).map(
		([date, items]) => {
			if (items?.length) {
				const groupedByCategory = Object.groupBy(
					items,
					(item) => item?.AccountingCategoryId ?? "unknown"
				);
				const aggregated = Object.entries(groupedByCategory).map(
					([key, items]) => {
						return {
							AccountingCategoryId: key,
							TaxRateCode: items?.[0].TaxRateCode,
							TaxRate: items?.[0]?.TaxRate
								? items?.[0].TaxRate * 100
								: 0,
							TaxValue: sumCurrencyValues("TaxValue", items),
							Amount: sumCurrencyValues("Amount", items),
							Date: date,
						};
					}
				);
				return aggregated;
			}
		}
	);

	return groupedByDateAndCategory.flatMap((items) => items ?? []);
}
