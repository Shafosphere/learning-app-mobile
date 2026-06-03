import {
  BUBBLE_NAVIGATION_HEIGHT,
  computeBubbleFrame,
  computeMultiPassThroughBlockerRects,
  computePassThroughBlockerRects,
  getEstimatedBubbleHeight,
} from "@/src/components/onboarding/coachmarkPositioning";

describe("computeBubbleFrame", () => {
  it("includes the navigation row in the regular coachmark height estimate", () => {
    expect(getEstimatedBubbleHeight(undefined)).toBe(132 + BUBBLE_NAVIGATION_HEIGHT);
  });

  it("can use the original coachmark height without the navigation row", () => {
    expect(getEstimatedBubbleHeight(undefined, { includeNavigation: false })).toBe(132);
  });

  it("keeps the full coachmark height above a bottom spotlight target", () => {
    const coachmarkHeight = getEstimatedBubbleHeight(undefined);
    const frame = computeBubbleFrame({
      rootLayout: { width: 360, height: 720 },
      bubbleHeight: coachmarkHeight,
      localTargetRect: { x: 240, y: 520, width: 90, height: 52 },
      localAvoidRects: [],
      isSpotlightStep: true,
      minTop: 12,
      maxBottom: 708,
    });

    expect(frame.top + coachmarkHeight).toBeLessThanOrEqual(520 - 12);
  });

  it("uses the full coachmark height when avoiding extra anchors", () => {
    const coachmarkHeight = getEstimatedBubbleHeight(undefined);
    const avoidRect = { x: 110, y: 420, width: 140, height: 56 };
    const frame = computeBubbleFrame({
      rootLayout: { width: 360, height: 720 },
      bubbleHeight: coachmarkHeight,
      localTargetRect: null,
      localAvoidRects: [avoidRect],
      isSpotlightStep: false,
      minTop: 12,
      maxBottom: 708,
    });

    expect(
      frame.top + coachmarkHeight <= avoidRect.y - 12 ||
        frame.top >= avoidRect.y + avoidRect.height + 12,
    ).toBe(true);
  });

  it("centers intro steps with the provided coachmark height", () => {
    const frame = computeBubbleFrame({
      rootLayout: { width: 360, height: 720 },
      bubbleHeight: 220,
      localTargetRect: null,
      localAvoidRects: [],
      isSpotlightStep: false,
      layout: "centered_intro",
      minTop: 12,
      maxBottom: 708,
    });

    expect(frame.top).toBe(250);
  });

  it("creates four blockers around a pass-through target", () => {
    expect(
      computePassThroughBlockerRects({
        rootLayout: { width: 360, height: 720 },
        passThroughRect: { x: 80, y: 240, width: 120, height: 90 },
      }),
    ).toEqual([
      { left: 0, top: 0, width: 360, height: 240 },
      { left: 0, top: 330, width: 360, height: 390 },
      { left: 0, top: 240, width: 80, height: 90 },
      { left: 200, top: 240, width: 160, height: 90 },
    ]);
  });

  it("leaves multiple pass-through targets unblocked", () => {
    const blockers = computeMultiPassThroughBlockerRects({
      rootLayout: { width: 360, height: 720 },
      passThroughRects: [
        { x: 40, y: 100, width: 280, height: 240 },
        { x: 120, y: 560, width: 120, height: 48 },
      ],
    });

    expect(blockers).not.toContainEqual({ left: 40, top: 100, width: 280, height: 240 });
    expect(blockers).not.toContainEqual({ left: 120, top: 560, width: 120, height: 48 });
    expect(blockers).toContainEqual({ left: 0, top: 0, width: 40, height: 100 });
    expect(blockers).toContainEqual({ left: 240, top: 560, width: 80, height: 48 });
  });
});
