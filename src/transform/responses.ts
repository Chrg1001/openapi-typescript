import { GlobalContext } from "../types";
import { comment, tsReadonly } from "../utils";
import { transformHeaderObjMap } from "./headers";
import { transformSchemaObj } from "./schema";

const resType = (res: string | number) => (res === 204 || (res >= 300 && res < 400) ? "never" : "unknown");

export function transformResponsesObj(responsesObj: Record<string, any>, ctx: GlobalContext): string {
  const readonly = tsReadonly(ctx.immutableTypes);

  let output = "";

  Object.entries(responsesObj).forEach(([httpStatusCode, response]) => {
    if (response.description) output += comment(response.description);

    const statusCode = Number(httpStatusCode) || `"${httpStatusCode}"`; // don’t surround w/ quotes if numeric status code

    if (response.$ref) {
      output += `  ${readonly}${statusCode}: ${response.$ref};\n`; // reference
      return;
    }

    if ((!response.content && !response.schema) || (response.content && !Object.keys(response.content).length)) {
      output += `  ${readonly}${statusCode}: ${resType(statusCode)};\n`; // unknown / missing response
      return;
    }

    output += `  ${readonly}${statusCode}: {\n`; // open response

    // headers
    if (response.headers && Object.keys(response.headers).length) {
      if (response.headers.$ref) {
        output += `    ${readonly}headers: ${response.headers.$ref};\n`;
      } else {
        output += `    ${readonly}headers: {\n      ${transformHeaderObjMap(response.headers, {
          required: new Set<string>(),
          ...ctx,
        })}\n    }\n`;
      }
    }

    // response
    switch (ctx.version) {
      case 3: {
        output += `    ${readonly}content: {\n`; // open content
        for (const contentType of Object.keys(response.content)) {
          const contentResponse = response.content[contentType] as any;
          const responseType = contentResponse?.schema
            ? transformSchemaObj(contentResponse.schema, { required: new Set<string>(), ...ctx })
            : "unknown";
          output += `      ${readonly}"${contentType}": ${responseType};\n`;
        }
        output += `    }\n`; //close content
        break;
      }
      case 2: {
        // note: because of the presence of "headers", we have to namespace this somehow; "schema" seemed natural
        output += `  ${readonly} schema: ${transformSchemaObj(response.schema, {
          required: new Set<string>(),
          ...ctx,
        })};\n`;
        break;
      }
    }

    output += `  }\n`; // close response
  });
  return output;
}
