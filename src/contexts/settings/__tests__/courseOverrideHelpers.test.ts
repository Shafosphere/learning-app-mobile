import type { LanguageCourse } from "@/src/types/course";

import {
  resolveActiveCourseOverride,
  resolveBuiltinOverride,
  resolveCustomOverride,
  setBuiltinOverride,
  setCustomOverride,
} from "../courseOverrideHelpers";
import type { CourseOverrideState } from "../types";

const builtinParams = {
  sourceLang: "en",
  targetLang: "pl",
  level: "A1" as const,
};
const builtinKey = "en|pl|A1";

describe("courseOverrideHelpers", () => {
  it("resolves builtin and custom overrides when present", () => {
    const overrides: CourseOverrideState<boolean> = {
      builtin: { [builtinKey]: true },
      custom: { "7": false },
    };

    expect(resolveBuiltinOverride(builtinParams, overrides, false)).toBe(true);
    expect(resolveCustomOverride(7, overrides, true)).toBe(false);
  });

  it("falls back to default value when override is missing", () => {
    const overrides: CourseOverrideState<string> = {
      builtin: {},
      custom: {},
    };

    expect(resolveBuiltinOverride(builtinParams, overrides, "large")).toBe(
      "large"
    );
    expect(resolveCustomOverride(7, overrides, "dynamic")).toBe("dynamic");
  });

  it("removes builtin override when next value equals default", async () => {
    const setOverrides = jest.fn<Promise<void>, [CourseOverrideState<boolean>]>(
      async () => {}
    );

    await setBuiltinOverride({
      params: builtinParams,
      value: false,
      defaultValue: false,
      overrides: {
        builtin: { [builtinKey]: true },
        custom: { "7": true },
      },
      setOverrides,
    });

    expect(setOverrides).toHaveBeenCalledWith({
      builtin: {},
      custom: { "7": true },
    });
  });

  it("removes custom override when next value equals default", async () => {
    const setOverrides = jest.fn<Promise<void>, [CourseOverrideState<boolean>]>(
      async () => {}
    );

    await setCustomOverride({
      courseId: 7,
      value: true,
      defaultValue: true,
      overrides: {
        builtin: { [builtinKey]: false },
        custom: { "7": false },
      },
      setOverrides,
    });

    expect(setOverrides).toHaveBeenCalledWith({
      builtin: { [builtinKey]: false },
      custom: {},
    });
  });

  it("does not persist when stored value already matches", async () => {
    const setOverrides = jest.fn<Promise<void>, [CourseOverrideState<boolean>]>(
      async () => {}
    );
    const overrides: CourseOverrideState<boolean> = {
      builtin: { [builtinKey]: true },
      custom: { "7": false },
    };

    await setBuiltinOverride({
      params: builtinParams,
      value: true,
      defaultValue: false,
      overrides,
      setOverrides,
    });
    await setCustomOverride({
      courseId: 7,
      value: false,
      defaultValue: true,
      overrides,
      setOverrides,
    });

    expect(setOverrides).not.toHaveBeenCalled();
  });

  it("resolves active value by custom, builtin, default precedence", () => {
    const courses: LanguageCourse[] = [
      {
        sourceLang: "en",
        targetLang: "pl",
        level: "A1",
      },
    ];
    const getBuiltin = jest.fn(() => "builtin");
    const getCustom = jest.fn(() => "custom");

    expect(
      resolveActiveCourseOverride({
        courses,
        activeCourseIdx: 0,
        activeCustomCourseId: 7,
        defaultValue: "default",
        getBuiltin,
        getCustom,
      })
    ).toBe("custom");
    expect(getCustom).toHaveBeenCalledWith(7);
    expect(getBuiltin).not.toHaveBeenCalled();

    getBuiltin.mockClear();
    getCustom.mockClear();

    expect(
      resolveActiveCourseOverride({
        courses,
        activeCourseIdx: 0,
        activeCustomCourseId: null,
        defaultValue: "default",
        getBuiltin,
        getCustom,
      })
    ).toBe("builtin");
    expect(getBuiltin).toHaveBeenCalledWith({
      sourceLang: "en",
      targetLang: "pl",
      level: "A1",
    });
    expect(getCustom).not.toHaveBeenCalled();

    expect(
      resolveActiveCourseOverride({
        courses,
        activeCourseIdx: null,
        activeCustomCourseId: null,
        defaultValue: "default",
        getBuiltin,
        getCustom,
      })
    ).toBe("default");
  });
});
