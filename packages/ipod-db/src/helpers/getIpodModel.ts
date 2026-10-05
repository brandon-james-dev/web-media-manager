import { IPOD_MODELS, type IpodIdentifier } from "../constants";

import type { IpodModel } from "../models";

export function getIpodModel(
  identifier: IpodIdentifier
): IpodModel | undefined {
  if (typeof identifier === "number") {
    return IPOD_MODELS[identifier];
  }

  return Object.values(IPOD_MODELS).find(
    (model) => model.modelNumber === identifier
  );
}
