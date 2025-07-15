// Run this script to get the latest OpenAPI spec and re-generate the client

import { createClient } from "@hey-api/openapi-ts";

createClient({
	input: "https://api.mews.com/Swagger/connector/swagger.yaml",
	output: "client",
	base: "https://api.mews-demo.com",
});
