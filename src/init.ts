import { OpenAPI } from "./client";

OpenAPI.interceptors.request.use((request) => {
	return request;
});
OpenAPI.interceptors.response.use(async (response) => {
	if (response.status < 300) {
		console.info(`request to ${response.url} was successful`);
	} else {
		console.error(
			`request to ${response.url} failed with status ${response.status}`
		);
	}
	return response;
});
