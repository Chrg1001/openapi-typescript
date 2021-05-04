import { GlobalContext, OperationObject, ParameterObject, PathItemObject } from "../types";
import { comment, tsReadonly } from "../utils";
import { transformOperationObj } from "./operation";
import { transformParametersArray } from "./parameters";

interface TransformPathsObjOption extends GlobalContext {
  globalParameters: Record<string, ParameterObject>;
  operations: Record<string, { operation: OperationObject; pathItem: PathItemObject }>;
}

/** Note: this needs to mutate objects passed in */
export function transformPathsObj(paths: Record<string, PathItemObject>, options: TransformPathsObjOption): string {
  const { globalParameters, operations, ...ctx } = options;
  const readonly = tsReadonly(ctx.immutableTypes);

  let output = "";

  Object.entries(paths).forEach(([url, pathItem]) => {
    if (pathItem.description) output += comment(pathItem.description); // add comment

    if (pathItem.$ref) {
      output += `  ${readonly}"${url}": ${pathItem.$ref};\n`;
      return;
    }

    output += ` ${readonly}"${url}": {\n`; // open PathItem

    // methods
    for (const method of ["get", "put", "post", "delete", "options", "head", "patch", "trace"]) {
      const operation = (pathItem as any)[method];

      if (!operation) continue; // only allow valid methods

      if (operation.description) output += comment(operation.description); // add comment

      // if operation has operationId, abstract into top-level operations object
      if (operation.operationId) {
        operations[operation.operationId] = { operation, pathItem };
        const namespace = ctx.namespace ? `external["${ctx.namespace}"]["operations"]` : `operations`;
        output += `    ${readonly}"${method}": ${namespace}["${operation.operationId}"];\n`;
      } else {
        // otherwise, inline operation
        output += `    ${readonly}"${method}": {\n      ${transformOperationObj(operation, {
          globalParameters,
          pathItem,
          ...ctx,
        })}\n    }\n`;
      }
    }

    // parameters
    if (pathItem.parameters) {
      output += `   ${readonly}parameters: {\n      ${transformParametersArray(pathItem.parameters, {
        globalParameters,
        ...ctx,
      })}\n    }\n`;
    }

    output += `  }\n`; // close PathItem
  });

  return output;
}
