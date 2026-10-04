import type { IpodModel } from "../models";

export const IPOD_MODELS: Record<number, IpodModel> = {
  0x1201: {
    productId: 0x1201,
    modelNumber: "M8946",
    name: "iPod 3rd Gen",
    requiresFirewireGuid: false,
  },

  0x1202: {
    productId: 0x1202,
    modelNumber: "M8513",
    name: "iPod 2nd Gen",
    requiresFirewireGuid: false,
  },

  0x1203: {
    productId: 0x1203,
    modelNumber: "M9282",
    name: "iPod 4th Gen (Grayscale)",
    requiresFirewireGuid: false,
  },

  0x1204: {
    productId: 0x1204,
    modelNumber: "MA079",
    name: "iPod Photo/Color",
    requiresFirewireGuid: false,
  },

  0x1205: {
    productId: 0x1205,
    modelNumber: "M9160",
    name: "iPod Mini",
    requiresFirewireGuid: false,
  },

  0x1209: {
    productId: 0x1209,
    modelNumber: "MA002",
    name: "iPod Video (5th Gen)",
    requiresFirewireGuid: false,
  },

  0x120a: {
    productId: 0x120a,
    modelNumber: "MA350",
    name: "iPod Nano 1st Gen",
    requiresFirewireGuid: false,
  },

  0x1260: {
    productId: 0x1260,
    modelNumber: "MA477",
    name: "iPod Nano 2nd Gen",
    requiresFirewireGuid: false,
  },

  0x1261: {
    productId: 0x1261,
    modelNumber: "MB029",
    name: "iPod Classic 6th/7th Gen",
    requiresFirewireGuid: true,
  },

  0x1262: {
    productId: 0x1262,
    modelNumber: "MA978",
    name: "iPod Nano 3rd Gen",
    requiresFirewireGuid: true,
  },

  0x1263: {
    productId: 0x1263,
    modelNumber: "MB754",
    name: "iPod Nano 4th Gen",
    requiresFirewireGuid: true,
  },

  0x1265: {
    productId: 0x1265,
    modelNumber: "MC031",
    name: "iPod Nano 5th Gen",
    requiresFirewireGuid: true,
  },

  0x1266: {
    productId: 0x1266,
    modelNumber: "MC525",
    name: "iPod Nano 6th Gen",
    requiresFirewireGuid: true,
  },

  0x1267: {
    productId: 0x1267,
    modelNumber: "MD480",
    name: "iPod Nano 7th Gen",
    requiresFirewireGuid: true,
  },

  0x1300: {
    productId: 0x1300,
    modelNumber: "M9724",
    name: "iPod Shuffle 1st Gen",
    requiresFirewireGuid: false,
  },

  0x1301: {
    productId: 0x1301,
    modelNumber: "MA564",
    name: "iPod Shuffle 2nd Gen",
    requiresFirewireGuid: false,
  },

  0x1302: {
    productId: 0x1302,
    modelNumber: "MB225",
    name: "iPod Shuffle 3rd Gen",
    requiresFirewireGuid: false,
  },

  0x1303: {
    productId: 0x1303,
    modelNumber: "MC749",
    name: "iPod Shuffle 4th Gen",
    requiresFirewireGuid: false,
  },
};

export const IPOD_MODELS_BY_MODEL_NUMBER = Object.fromEntries(
  Object.values(IPOD_MODELS).map((model) => [model.modelNumber, model])
);
