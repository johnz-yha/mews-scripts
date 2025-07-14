import { EnterprisesService } from "../client";
import { writeToCSV } from "../utils/utils";

const enterprisesResult = await EnterprisesService.enterprisesGetAll({
	requestBody: {
		AccessToken: process.env.ACCESS_TOKEN!,
		ClientToken: process.env.CLIENT_TOKEN!,
		Client: process.env.CLIENT!,
		Limitation: { Count: 100 },
	},
});

const enterprises = enterprisesResult.Enterprises ?? [{}];

console.log("enterprises: ", enterprises.length);

Bun.write("enterprises.json", JSON.stringify(enterprises));

const editableHistory = enterprises.map((e) => ({
	EnterpriseId: e.Id,
	EnterpriseName: e.Name,
	EditableHistory: e.AccountingEditableHistoryInterval,
	AccountingEditableHistory: e.AccountingEditableHistoryInterval,
}));

writeToCSV(editableHistory, "editableHistoryAudit");
