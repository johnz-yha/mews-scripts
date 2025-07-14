import { ApiError } from "../client";

export async function withError(fn: () => Promise<any>) {
	try {
		const res = await fn();
		return res;
	} catch (e) {
		if (e instanceof ApiError) {
			const error = e as ApiError;
			console.log("error: ", error.message);
		} else {
			console.log(e);
		}
	}
}
