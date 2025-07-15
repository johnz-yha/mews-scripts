import { AccountingCategoriesService, ApiError } from "../client";
import { writeToCSV } from "../utils/utils";

const data = [];
let hasMore = true;
let cursor = undefined;

while (hasMore) {
	try {
		const res =
			await AccountingCategoriesService.accountingCategoriesGetAll({
				requestBody: {
					AccessToken: process.env.ACCESS_TOKEN!,
					ClientToken: process.env.CLIENT_TOKEN!,
					Client: process.env.CLIENT!,
					Limitation: {
						Count: 1000,
						Cursor: cursor,
					},
				},
			});

		cursor = res?.Cursor ? res.Cursor : undefined;
		hasMore = cursor ? true : false;
		res?.AccountingCategories?.length &&
			data.push(...res.AccountingCategories);
		console.log(res?.AccountingCategories?.length, cursor);
	} catch (e) {
		if (e instanceof ApiError) {
			const error = e as ApiError;
			console.log("error: ", error.body);
		} else {
			console.log(e);
		}
		throw new Error("Error in fetching Accounting Categories");
	}
}

console.log("accountingCategories: ", data?.length);

const csvData: any[] = data.map((item) => ({
	id: item.Id,
	enterprise_id: item.EnterpriseId,
	name: item.Name,
	code: item.Code,
	external_code: item.ExternalCode,
	cost_center_code: item.CostCenterCode,
	ledger_account_code: item.LedgerAccountCode,
	classification: item.Classification,
	is_active: item.IsActive,
}));

console.log("csvData: ", csvData?.length);

await writeToCSV(csvData, "MewsAccountingCategories_PROD");
