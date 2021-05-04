#!/usr/bin/env node

const fs = require("fs");
const { bold, green, red } = require("kleur");
const path = require("path");
const meow = require("meow");
const { default: openapiTS } = require("../dist/cjs/index.js");

const cli = meow(
  `Usage
  $ openapi-typescript [input] [options]

Options
  --help                display this
  --output, -o          Specify output file (default: stdout)
  --auth                (optional) Provide an authentication token for private URL
  --immutable-types     (optional) Generates immutable types (readonly properties and readonly array)
  --prettier-config     (optional) specify path to Prettier config file
  --raw-schema          (optional) Read from raw schema instead of document
  --version             (optional) Schema version (must be present for raw schemas)
`,
  {
    flags: {
      output: {
        type: "string",
        alias: "o",
      },
      auth: {
        type: "string",
      },
      immutableTypes: {
        type: "boolean",
      },
      prettierConfig: {
        type: "string",
      },
      rawSchema: {
        type: "boolean",
      },
      version: {
        type: "number",
      },
    },
  }
);

const timeStart = process.hrtime();

async function main() {
  let output = "FILE"; // FILE or STDOUT
  const pathToSpec = cli.input[0];

  if (!cli.flags.output) {
    output = "STDOUT"; // if --output not specified, fall back to stdout
  }
  if (output === "FILE") {
    console.info(bold(`✨ openapi-typescript ${require("../package.json").version}`)); // don’t log anything to console!
  }

  const result = await openapiTS(pathToSpec, {
    auth: cli.flags.auth,
    silent: output === "STDOUT",
    immutableTypes: cli.flags.immutableTypes,
    prettierConfig: cli.flags.prettierConfig,
    rawSchema: cli.flags.rawSchema,
    version: cli.flags.version,
  });

  if (output === "FILE") {
    // output option 1: file
    const outputFile = path.resolve(process.cwd(), cli.flags.output);

    await fs.promises.mkdir(path.dirname(outputFile), { recursive: true });
    await fs.promises.writeFile(outputFile, result, "utf8");

    const timeEnd = process.hrtime(timeStart);
    const time = timeEnd[0] + Math.round(timeEnd[1] / 1e6);
    console.log(green(`🚀 ${pathToSpec} -> ${bold(cli.flags.output)} [${time}ms]`));
  } else {
    // output option 2: stdout
    process.stdout.write(result);
    // (still) don’t log anything to console!
  }

  return result;
}

main();
