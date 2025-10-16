import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_COURSE_COLOR,
  COURSE_ICONS,
  CourseColorOption,
  getCourseColorsForTheme,
} from "@/src/constants/customCourse";
import { useSettings } from "@/src/contexts/SettingsContext";

export interface CustomCourseDraftState {
  courseName: string;
  iconId: string | null;
  iconColor: string;
  colorId: string | null;
  reviewsEnabled: boolean;
}

export interface UseCustomCourseDraftOptions {
  initialName?: string;
  initialIconId?: string | null;
  initialIconColor?: string | null;
  initialColorId?: string | null;
  initialReviewsEnabled?: boolean;
}

export function useCustomCourseDraft(options: UseCustomCourseDraftOptions = {}) {
  const { colors } = useSettings();

  const courseColors = useMemo(
    () => getCourseColorsForTheme(colors),
    [colors]
  );

  const defaultColorHex = colors.headline ?? DEFAULT_COURSE_COLOR;

  const defaultColor = useMemo(() => {
    const match = courseColors.find(
      (color) => color.hex.toLowerCase() === defaultColorHex.toLowerCase()
    );
    return match ?? courseColors[0] ?? null;
  }, [courseColors, defaultColorHex]);

  const initialStateRef = useRef<CustomCourseDraftState | null>(null);

  if (!initialStateRef.current) {
    initialStateRef.current = {
      courseName: options.initialName ?? "",
      iconId: options.initialIconId ?? COURSE_ICONS[0]?.id ?? null,
      iconColor:
        options.initialIconColor ??
        defaultColor?.hex ??
        DEFAULT_COURSE_COLOR,
      colorId:
        options.initialColorId ??
        defaultColor?.id ??
        null,
      reviewsEnabled: options.initialReviewsEnabled ?? false,
    };
  }

  const initialState = initialStateRef.current;
  if (!initialState) {
    throw new Error("useCustomCourseDraft failed to initialize default state");
  }

  const [courseName, setCourseName] = useState(initialState.courseName);
  const [iconId, setIconId] = useState<string | null>(initialState.iconId);
  const [iconColor, setIconColor] = useState<string>(initialState.iconColor);
  const [colorId, setColorId] = useState<string | null>(initialState.colorId);
  const [reviewsEnabled, setReviewsEnabled] = useState<boolean>(
    initialState.reviewsEnabled
  );

  useEffect(() => {
    if (courseColors.length === 0) {
      return;
    }

    const selectedColor =
      (colorId
        ? courseColors.find((color) => color.id === colorId)
        : undefined) ??
      courseColors.find(
        (color) =>
          color.hex.trim().toLowerCase() === iconColor.trim().toLowerCase()
      );

    if (!selectedColor) {
      return;
    }

    const nextHex = selectedColor.hex.trim().toLowerCase();
    const currentHex = iconColor.trim().toLowerCase();

    if (nextHex !== currentHex) {
      setIconColor(selectedColor.hex);
      if (initialStateRef.current) {
        initialStateRef.current.iconColor = selectedColor.hex;
        initialStateRef.current.colorId = selectedColor.id;
      }
    }
  }, [courseColors, colorId, iconColor, setIconColor]);

  const toggleReviewsEnabled = useCallback(() => {
    setReviewsEnabled((prev) => !prev);
  }, []);

  const handleColorChange = useCallback((color: CourseColorOption) => {
    setIconColor(color.hex);
    setColorId(color.id);
  }, []);

  const resetDraft = useCallback(() => {
    setCourseName(initialState.courseName);
    setIconId(initialState.iconId);
    setIconColor(initialState.iconColor);
    setColorId(initialState.colorId);
    setReviewsEnabled(initialState.reviewsEnabled);
  }, [initialState]);

  const hydrateDraft = useCallback(
    (draft: Partial<CustomCourseDraftState>) => {
      if (draft.courseName !== undefined) {
        setCourseName(draft.courseName);
      }
      if (draft.iconId !== undefined) {
        setIconId(draft.iconId);
      }
      if (draft.iconColor !== undefined) {
        setIconColor(draft.iconColor);
      }
      if (draft.colorId !== undefined) {
        setColorId(draft.colorId);
      }
      if (draft.reviewsEnabled !== undefined) {
        setReviewsEnabled(draft.reviewsEnabled);
      }
    },
    []
  );

  return {
    courseName,
    setCourseName,
    iconId,
    setIconId,
    iconColor,
    setIconColor,
    colorId,
    setColorId,
    reviewsEnabled,
    setReviewsEnabled,
    toggleReviewsEnabled,
    handleColorChange,
    hydrateDraft,
    resetDraft,
  };
}
