import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { createFlashcardsStudyStyles } from "@/src/features/flashcards/study/study.styles";

export const useStyles = createThemeStylesHook((colors) => ({
  ...createFlashcardsStudyStyles(colors),
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    zIndex: 40,
  },
  loadingOverlayContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
}));
