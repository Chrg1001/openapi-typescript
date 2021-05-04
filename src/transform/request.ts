import { GlobalContext, RequestBody } from "../types";
import { comment, tsReadonly } from "../utils";
import { transformSchemaObj } from "./schema";

export function transformRequestBodies(requestBodies: Record<string, RequestBody>, ctx: GlobalContext) {
  let output = "";

  Object.entries(requestBodies).forEach(([bodyName, requestBody]) => {
    if (requestBody && requestBody.description) output += `  ${comment(requestBody.description)}`;
    output += `  "${bodyName}": {`;
    output += `  ${transformRequestBodyObj(requestBody, ctx)}`;
    output += `  }\n`;
  });

  return output;
}

export function transformRequestBodyObj(requestBody: RequestBody, ctx: GlobalContext): string {
  const readonly = tsReadonly(ctx.immutableTypes);

  let output = "";

  const { content } = requestBody;

  if (content && Object.keys(content).length) {
    output += `  ${readonly}content: {\n`; // open content

    Object.entries(content).forEach(([k, v]) => {
      output += `      ${readonly}"${k}": ${transformSchemaObj(v.schema, { required: new Set<string>(), ...ctx })};\n`;
    });
    output += `    }\n`; // close content
  } else {
    output += `  unknown;\n`;
  }

  return output;
}
