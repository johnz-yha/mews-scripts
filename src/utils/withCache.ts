import { withError } from "./withError";

export async function withCache(
	tags: string[],
	fn: (args: any) => Promise<any>,
	options: any = {}
) {
	// const sortedTags = tags?.toSorted((a, b) => a.localeCompare(b));
	const filename = `./cache/${process.env.NODE_ENV}/${tags.join("-")}.json`;

	// Return cached data if it exists
	if (await Bun.file(filename).exists()) {
		console.log(`Returning data from cache for ${filename}`);
		const file = Bun.file(filename);
		return await file.json();
	}

	// Fetch data over the network
	const data = await withError(() => fn(options));

	if (!data) {
		return;
	}

	// Save data to json file
	await Bun.write(filename, JSON.stringify(data));

	return data;
}
