import { createClient } from "@hey-api/openapi-ts";

createClient({
  input: "https://api.mews.com/Swagger/connector/swagger.yaml",
  output: "client",
  base: "https://api.mews-demo.com",
});
