import {
	ApiError,
	OrderItemsService,
	type OrderItem,
	type TaxRate,
} from "../client";
import type { OrderItemT } from "../types";
import { sumCurrencyValues } from "../utils/utils";

interface Params {
	count?: number;
	startUtc: string;
	endUtc: string;
	enterpriseId: string;
	serviceId?: string;
}

export async function getAllOrderItemsConsumed({
	count = 500,
	startUtc,
	endUtc,
	enterpriseId,
	serviceId,
}: Params) {
	const data = [];
	let hasMore = true;
	let cursor = undefined;

	while (hasMore) {
		try {
			const res = await OrderItemsService.orderItemsGetAll({
				requestBody: {
					AccessToken: process.env.ACCESS_TOKEN!,
					ClientToken: process.env.CLIENT_TOKEN!,
					Client: process.env.CLIENT!,
					Limitation: { Count: count, Cursor: cursor },
					ConsumedUtc: {
						StartUtc: startUtc,
						EndUtc: endUtc,
					},
					EnterpriseIds: [enterpriseId],
					AccountingStates: ["Closed", "Open"],
					ServiceIds: serviceId ? [serviceId] : undefined,
				},
			});

			cursor = res?.Cursor ? res.Cursor : undefined;
			hasMore = cursor ? true : false;
			console.log(
				`${res?.OrderItems?.length} Order Items fetched. Cursor: ${cursor}`
			);
			res?.OrderItems?.length && data.push(...res.OrderItems);
			console.log(res?.OrderItems?.length, cursor);
		} catch (e) {
			if (e instanceof ApiError) {
				const error = e as ApiError;
				console.log("error: ", error.body);
			} else {
				console.log(e);
			}
			throw Error("Error fetching Order Items");
		}
	}

	return data;
}

export function transformOrderItems(
	items: OrderItem[],
	timezone: string
): OrderItemT[] {
	const transformed = items.map((item) => {
		const { AccountingCategoryId, Amount, ConsumedUtc, Type } = item;

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
			AccountingCategoryId: AccountingCategoryId ?? undefined,
			Amount: Amount?.GrossValue ?? 0,
			TaxRateCode: taxRateCode ?? undefined,
			TaxValue: totalTaxValue,
			ConsumedUtc: ConsumedUtc ?? undefined,
			Date: ConsumedUtc
				? new Date(ConsumedUtc).toLocaleDateString("en-AU", {
						timeZone: timezone,
				  })
				: undefined,
		} as OrderItemT;
	});
	return transformed;
}

export function aggregateRevenueItems(
	orderItemsTransformed?: OrderItemT[],
	taxValues?: TaxRate[]
): OrderItemT[] {
	if (!orderItemsTransformed) {
		return [];
	}

	// Group by date
	const groupedByDate = Object.groupBy(
		orderItemsTransformed,
		(orderItem) => orderItem?.Date ?? "unknown"
	);

	// Aggregate by Tax Rate Code
	const aggregated = Object.entries(groupedByDate).map(([date, items]) => {
		if (!items?.length) {
			return;
		}

		const groupedByTaxRateAndCategory = Object.groupBy(
			items,
			(item) => `${item?.TaxRateCode}--${item?.AccountingCategoryId}`
		);

		return Object.entries(groupedByTaxRateAndCategory).map(
			([key, items]) => {
				items = items ?? [];

				const taxRate = taxValues?.find(
					(t) => t.Code === key.split("--")[0]
				)?.Value;

				return {
					AccountingCategoryId: items[0]?.AccountingCategoryId,
					TaxRateCode: key.split("--")[0],
					Amount: sumCurrencyValues("Amount", items),
					TaxRate: taxRate ? taxRate * 100 : 0,
					TaxValue: sumCurrencyValues("TaxValue", items),
					Date: date,
				};
			}
		);
	});

	return aggregated.flatMap((items) => items ?? []);
}
