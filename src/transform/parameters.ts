import { GlobalContext, ParameterObject, ReferenceObject } from "../types";
import { comment, tsReadonly } from "../utils";
import { transformSchemaObj } from "./schema";

interface TransformParametersOptions extends GlobalContext {
  globalParameters?: Record<string, ParameterObject>;
}

export function transformParametersArray(
  parameters: (ReferenceObject | ParameterObject)[],
  options: TransformParametersOptions
): string {
  const { globalParameters = {}, ...ctx } = options;

  const readonly = tsReadonly(ctx.immutableTypes);

  let output = "";

  // sort into map
  let mappedParams: Record<string, Record<string, ParameterObject>> = {};
  parameters.forEach((paramObj: any) => {
    if (paramObj.$ref && globalParameters) {
      const paramName = paramObj.$ref.split('["').pop().replace(/"\]$/, ""); // take last segment
      if (globalParameters[paramName]) {
        const reference = globalParameters[paramName] as any;
        if (!mappedParams[reference.in]) mappedParams[reference.in] = {};
        switch (ctx.version) {
          case 2: {
            mappedParams[reference.in][reference.name || paramName] = {
              ...reference,
              $ref: paramObj.$ref,
            };
            break;
          }
          case 3: {
            mappedParams[reference.in][reference.name || paramName] = {
              ...reference,
              schema: { $ref: paramObj.$ref },
            };
            break;
          }
        }
      }
      return;
    }

    if (!paramObj.in || !paramObj.name) return;
    if (!mappedParams[paramObj.in]) mappedParams[paramObj.in] = {};
    mappedParams[paramObj.in][paramObj.name] = paramObj;
  });

  // transform output
  Object.entries(mappedParams).forEach(([paramIn, paramGroup]) => {
    output += `  ${readonly}${paramIn}: {\n`; // open in
    Object.entries(paramGroup).forEach(([paramName, paramObj]) => {
      let paramComment = "";
      if (paramObj.deprecated) paramComment += `@deprecated `;
      if (paramObj.description) paramComment += paramObj.description;
      if (paramComment) output += comment(paramComment);

      const required = paramObj.required ? `` : `?`;
      let paramType = ``;
      switch (ctx.version) {
        case 2: {
          if (paramObj.in === "body" && paramObj.schema) {
            paramType = transformSchemaObj(paramObj.schema, { required: new Set<string>(), ...ctx });
          } else if (paramObj.type) {
            paramType = transformSchemaObj(paramObj, { required: new Set<string>(), ...ctx });
          } else {
            paramType = "unknown";
          }
          break;
        }
        case 3: {
          paramType = paramObj.schema
            ? transformSchemaObj(paramObj.schema, { required: new Set<string>(), ...ctx })
            : "unknown";
          break;
        }
      }
      output += `    ${readonly}"${paramName}"${required}: ${paramType};\n`;
    });
    output += `  }\n`; // close in
  });

  return output;
}
