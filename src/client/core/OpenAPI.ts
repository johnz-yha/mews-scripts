import type { ApiRequestOptions } from "./ApiRequestOptions";

type Headers = Record<string, string>;
type Middleware<T> = (value: T) => T | Promise<T>;
type Resolver<T> = (options: ApiRequestOptions) => Promise<T>;

export class Interceptors<T> {
	_fns: Middleware<T>[];

	constructor() {
		this._fns = [];
	}

	eject(fn: Middleware<T>) {
		const index = this._fns.indexOf(fn);
		if (index !== -1) {
			this._fns = [
				...this._fns.slice(0, index),
				...this._fns.slice(index + 1),
			];
		}
	}

	use(fn: Middleware<T>) {
		this._fns = [...this._fns, fn];
	}
}

export type OpenAPIConfig = {
	BASE: string;
	CREDENTIALS: "include" | "omit" | "same-origin";
	ENCODE_PATH?: ((path: string) => string) | undefined;
	HEADERS?: Headers | Resolver<Headers> | undefined;
	PASSWORD?: string | Resolver<string> | undefined;
	TOKEN?: string | Resolver<string> | undefined;
	USERNAME?: string | Resolver<string> | undefined;
	VERSION: string;
	WITH_CREDENTIALS: boolean;
	interceptors: {
		request: Interceptors<RequestInit>;
		response: Interceptors<Response>;
	};
};

export const OpenAPI: OpenAPIConfig = {
	BASE: process.env.MEWS_API_URL!,
	CREDENTIALS: "include",
	ENCODE_PATH: undefined,
	HEADERS: undefined,
	PASSWORD: undefined,
	TOKEN: undefined,
	USERNAME: undefined,
	VERSION: "1",
	WITH_CREDENTIALS: false,
	interceptors: {
		request: new Interceptors(),
		response: new Interceptors(),
	},
};
