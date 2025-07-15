import { ExportsService } from "../client";
import { withError } from "../utils/withError";

// const exportResponse = await withError(() =>
// 	ExportsService.exportsAdd({
// 		requestBody: {
// 			AccessToken: process.env.ACCESS_TOKEN!,
// 			ClientToken: process.env.CLIENT_TOKEN!,
// 			Client: process.env.CLIENT!,
// 			EntityType: "OrderItem",
// 		},
// 	})
// );
// console.log("exportResponse: ", exportResponse);

const getExportResponse = await withError(() =>
	ExportsService.exportsGetAll({
		requestBody: {
			AccessToken: process.env.ACCESS_TOKEN!,
			ClientToken: process.env.CLIENT_TOKEN!,
			Client: process.env.CLIENT!,
			ExportIds: [
				"bff4b5fb-8b49-4a99-b890-b1a40078ab14",
				"5800ac65-449d-4d0e-8997-b1a40072749d",
			],
		},
	})
);
console.log("getExportResponse: ", getExportResponse);
