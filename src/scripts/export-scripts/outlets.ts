import { ApiError, OutletItemsService, type OutletItem } from "../../client";
import type { OrderItemT } from "../../types";

interface Params {
	count?: number;
	startUtc: string;
	endUtc: string;
	enterpriseId: string;
}

export async function getAllOutletsConsumed({
	count = 500,
	startUtc,
	endUtc,
	enterpriseId,
}: Params) {
	const data = [];
	let hasMore = true;
	let cursor = undefined;

	while (hasMore) {
		try {
			const res = await OutletItemsService.outletItemsGetAll({
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
				},
			});

			cursor = res?.Cursor ? res.Cursor : undefined;
			hasMore = cursor ? true : false;
			res?.OutletItems?.length && data.push(...res.OutletItems);
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

export function transformOutletItems(
	items: OutletItem[],
	timezone: string
): OrderItemT[] {
	const transformed = items.map((item) => {
		const {
			AccountingCategoryId,
			UnitCount,
			UnitAmount,
			ConsumedUtc,
			Type,
		} = item;

		// aggregate tax values
		const unitTaxValue = UnitAmount?.TaxValues?.reduce(
			(acc, tax) => acc + (tax?.Value ? tax.Value : 0),
			0
		);

		const totalTaxValue = unitTaxValue ? unitTaxValue * UnitCount : 0;

		const taxRateCode = UnitAmount?.TaxValues
			? UnitAmount.TaxValues?.[0]?.Code
			: undefined;

		return {
			AccountingCategoryId: AccountingCategoryId ?? undefined,
			Amount: UnitAmount?.GrossValue
				? UnitAmount.GrossValue * UnitCount
				: 0,
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

// export function aggregateRevenueItems(
// 	orderItemsTransformed?: OrderItemT[]
// ): OrderItemT[] {
// 	if (!orderItemsTransformed) {
// 		return [];
// 	}

// 	// Group by date
// 	const groupedByDate = Object.groupBy(
// 		orderItemsTransformed,
// 		(orderItem) => orderItem?.Date ?? "unknown"
// 	);

// 	// Aggregate by Accounting Category ID
// 	const groupedByDateAndCategory = Object.entries(groupedByDate).map(
// 		([date, items]) => {
// 			if (items?.length) {
// 				const groupedByCategory = Object.groupBy(
// 					items,
// 					(item) => item?.AccountingCategoryId ?? "unknown"
// 				);
// 				const aggregated = Object.entries(groupedByCategory).map(
// 					([key, items]) => {
// 						return {
// 							AccountingCategoryId: key,
// 							TaxRateCode: items?.[0].TaxRateCode,
// 							TaxRate: items?.[0]?.TaxRate
// 								? items?.[0].TaxRate * 100
// 								: 0,
// 							TaxValue: sumCurrencyValues("TaxValue", items),
// 							Amount: sumCurrencyValues("Amount", items),
// 							Date: date,
// 						};
// 					}
// 				);
// 				return aggregated;
// 			}
// 		}
// 	);

// 	return groupedByDateAndCategory.flatMap((items) => items ?? []);
// }
