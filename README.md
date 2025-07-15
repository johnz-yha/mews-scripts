# mews-scripts

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run <name-of-your-script.ts>
```

To re-generate/update the Mews Client to the latest OpenAPI spec:

```bash
bun run ./src/generate-client.ts
```

NB: Everything in ./src/client is generated programatically by the @hey-api/openapi-ts CLI. If using the generated client in your code, then add:

```ts
import "./init";
```

to the top of your entry point file.

This project was created using `bun init` in bun v1.1.4. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
