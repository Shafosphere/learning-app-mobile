const BOX_SKIN_HEIGHT = 122;

export function getBoxCarouselNaturalHeight({
  isSmallPhoneLayout,
  bottomClearance = 0,
}: {
  isSmallPhoneLayout: boolean;
  bottomClearance?: number;
}): number {
  const activeBoxScale = isSmallPhoneLayout ? 1.3 : 2.05;
  const activeBoxLift = isSmallPhoneLayout ? 2 : 12;
  const stageVerticalPadding = isSmallPhoneLayout ? 6 : 40;
  const listVerticalPadding = isSmallPhoneLayout ? 4 : 14;
  const activeCounterHeight = isSmallPhoneLayout ? 32 : 46;
  const stageHeight = Math.ceil(
    BOX_SKIN_HEIGHT * activeBoxScale +
      activeBoxLift * 2 +
      stageVerticalPadding,
  );

  return (
    stageHeight +
    listVerticalPadding * 2 +
    activeCounterHeight +
    bottomClearance
  );
}
