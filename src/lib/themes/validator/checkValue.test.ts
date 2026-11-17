import { describe, expect, it } from "vitest";
import { ReferenceKind, ValueType } from "../componentModel";
import type { AttributeDef } from "../componentModel";
import { checkValue } from "./checkValue";

function codeOf(raw: string, def: AttributeDef): string | undefined {
  return checkValue(raw, def)?.code;
}

describe("checkValue", () => {
  it("rejects reserved binding syntax before anything else", () => {
    expect(
      codeOf("{bind playback.current.title}", { type: ValueType.String })
    ).toBe("E4020");
  });

  it("checks maxLength in characters", () => {
    const literal: AttributeDef = { type: ValueType.String, maxLength: 3 };
    expect(codeOf("WMM", literal)).toBeUndefined();
    expect(codeOf("ñññ", literal)).toBeUndefined();
    expect(codeOf("WMMX", literal)).toBe("E4007");
  });

  it("checks booleans", () => {
    const def: AttributeDef = { type: ValueType.Boolean };
    expect(codeOf("true", def)).toBeUndefined();
    expect(codeOf("false", def)).toBeUndefined();
    expect(codeOf("True", def)).toBe("E4004");
    expect(codeOf("1", def)).toBe("E4004");
  });

  it("checks integers and their range", () => {
    const def: AttributeDef = { type: ValueType.Integer, min: 0, max: 100 };
    expect(codeOf("0", def)).toBeUndefined();
    expect(codeOf("100", def)).toBeUndefined();
    expect(codeOf("1.5", def)).toBe("E4004");
    expect(codeOf("-1", def)).toBe("E4006");
    expect(codeOf("101", def)).toBe("E4006");
  });

  it("checks decimal numbers and their range", () => {
    const def: AttributeDef = { type: ValueType.Number, min: 0, max: 1 };
    expect(codeOf("0.5", def)).toBeUndefined();
    expect(codeOf(".5", def)).toBe("E4004");
    expect(codeOf("1.2", def)).toBe("E4006");
  });

  it("checks lengths as pixels or @length/ references", () => {
    const def: AttributeDef = { type: ValueType.Length, min: 1 };
    expect(codeOf("260", def)).toBeUndefined();
    expect(codeOf("@length/sidebar-width", def)).toBeUndefined();
    expect(codeOf("260px", def)).toBe("E4004");
    expect(codeOf("-4", def)).toBe("E4004");
    expect(codeOf("0", def)).toBe("E4006");
    expect(codeOf("@color/navy-900", def)).toBe("E4010");
  });

  it("accepts auto for LengthOrAuto", () => {
    const def: AttributeDef = { type: ValueType.LengthOrAuto };
    expect(codeOf("auto", def)).toBeUndefined();
    expect(codeOf("320", def)).toBeUndefined();
    expect(codeOf("Auto", def)).toBe("E4004");
  });

  it("checks thickness counts", () => {
    const def: AttributeDef = { type: ValueType.Thickness };
    expect(codeOf("8", def)).toBeUndefined();
    expect(codeOf("8 12", def)).toBeUndefined();
    expect(codeOf("4 8 4 8", def)).toBeUndefined();
    expect(codeOf("4 8 4", def)).toBe("E4004");
    expect(codeOf("8  12", def)).toBe("E4004");
  });

  it("checks corner radius counts", () => {
    const def: AttributeDef = { type: ValueType.CornerRadius };
    expect(codeOf("6", def)).toBeUndefined();
    expect(codeOf("6 6 0 0", def)).toBeUndefined();
    expect(codeOf("6 6", def)).toBe("E4004");
  });

  it("checks colors", () => {
    const def: AttributeDef = { type: ValueType.Color };
    expect(codeOf("#fff", def)).toBeUndefined();
    expect(codeOf("#0d2766", def)).toBeUndefined();
    expect(codeOf("#ffffff80", def)).toBeUndefined();
    expect(codeOf("transparent", def)).toBeUndefined();
    expect(codeOf("@color/navy-900", def)).toBeUndefined();
    expect(codeOf("@slot/background", def)).toBeUndefined();
    expect(codeOf("#ffff", def)).toBe("E4004");
    expect(codeOf("navy", def)).toBe("E4004");
    expect(codeOf("@brush/panel", def)).toBe("E4010");
  });

  it("accepts @brush/ references for brushes", () => {
    const def: AttributeDef = { type: ValueType.Brush };
    expect(codeOf("@brush/panel", def)).toBeUndefined();
    expect(codeOf("#0d2766", def)).toBeUndefined();
    expect(codeOf("@shadow/raised", def)).toBe("E4010");
  });

  it("checks enum keywords", () => {
    const def: AttributeDef = {
      type: ValueType.Enum,
      values: ["horizontal", "vertical"],
    };
    expect(codeOf("vertical", def)).toBeUndefined();
    expect(checkValue("sideways", def)).toEqual({
      code: "E4005",
      message: '"sideways" is not one of: horizontal, vertical.',
    });
  });

  it("checks enum lists", () => {
    const def: AttributeDef = {
      type: ValueType.EnumList,
      values: ["title", "explicit", "artist", "favorite"],
    };
    expect(codeOf("title explicit artist favorite", def)).toBeUndefined();
    expect(codeOf("title  artist", def)).toBe("E4004");
    expect(codeOf("title title", def)).toBe("E4004");
    expect(codeOf("title album", def)).toBe("E4005");
  });

  it("checks resource key grammar", () => {
    const def: AttributeDef = { type: ValueType.ResourceKey };
    expect(codeOf("common.fullScreen", def)).toBeUndefined();
    expect(codeOf("playback", def)).toBe("E4004");
    expect(codeOf("Playback.next", def)).toBe("E4004");
    expect(codeOf("playback..next", def)).toBe("E4004");
  });

  it("checks reference syntax and kind", () => {
    const def: AttributeDef = {
      type: ValueType.Reference,
      refKinds: [ReferenceKind.Icon],
    };
    expect(codeOf("@icon/playPause", def)).toBeUndefined();
    expect(codeOf("icon/playPause", def)).toBe("E4004");
    expect(codeOf("@icon/Play", def)).toBe("E4004");
    expect(codeOf(`@icon/${"a".repeat(49)}`, def)).toBe("E4004");
    expect(checkValue("@panel/header", def)).toEqual({
      code: "E4010",
      message: "@panel/ references are not allowed here; use @icon/.",
    });
  });

  it("checks author ids", () => {
    const def: AttributeDef = { type: ValueType.Id };
    expect(codeOf("queue-panel", def)).toBeUndefined();
    expect(codeOf("a".repeat(48), def)).toBeUndefined();
    expect(codeOf("a".repeat(49), def)).toBe("E4004");
    expect(codeOf("queuePanel", def)).toBe("E4004");
    expect(codeOf("queue-", def)).toBe("E4004");
    expect(codeOf("1-queue", def)).toBe("E4004");
  });

  it("checks command id grammar", () => {
    const def: AttributeDef = { type: ValueType.Command };
    expect(codeOf("wmm.playback.prev", def)).toBeUndefined();
    expect(codeOf("wmm.ui.togglePanel", def)).toBeUndefined();
    expect(codeOf("wmm.playback", def)).toBe("E4004");
    expect(codeOf("app.playback.next", def)).toBe("E4004");
  });

  it("accepts any string", () => {
    expect(codeOf("1.0", { type: ValueType.String })).toBeUndefined();
  });

  it("checks grid tracks", () => {
    const def: AttributeDef = { type: ValueType.GridTracks };
    expect(codeOf("240 1*", def)).toBeUndefined();
    expect(codeOf("auto 1* auto", def)).toBeUndefined();
    expect(codeOf("@length/sidebar-width 1*", def)).toBeUndefined();
    expect(codeOf(Array(12).fill("1*").join(" "), def)).toBeUndefined();
    expect(codeOf(Array(13).fill("1*").join(" "), def)).toBe("E4004");
    expect(codeOf("0*", def)).toBe("E4006");
    expect(codeOf("101*", def)).toBe("E4006");
    expect(codeOf("1fr", def)).toBe("E4004");
    expect(codeOf("*", def)).toBe("E4004");
  });
});
