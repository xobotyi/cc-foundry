import { defineCommand } from "citty";
import check from "./check.ts";
import docsFetch from "./docs-fetch.ts";

export default defineCommand({
  meta: {
    name: "foundry-tools",
    version: "0.1.0",
    description: "Development tools for cc-foundry marketplace",
  },
  subCommands: {
    check,
    "docs-fetch": docsFetch,
  },
});
