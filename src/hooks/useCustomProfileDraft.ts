import { useCallback, useMemo, useRef, useState } from "react";
import {
  DEFAULT_PROFILE_COLOR,
  PROFILE_COLORS,
  PROFILE_ICONS,
} from "@/src/constants/customProfile";

export interface CustomProfileDraftState {
  profileName: string;
  iconId: string | null;
  iconColor: string;
  colorId: string | null;
  reviewsEnabled: boolean;
}

export interface UseCustomProfileDraftOptions {
  initialName?: string;
  initialIconId?: string | null;
  initialIconColor?: string | null;
  initialColorId?: string | null;
  initialReviewsEnabled?: boolean;
}

export type ProfileColorOption = (typeof PROFILE_COLORS)[number];

export function useCustomProfileDraft(options: UseCustomProfileDraftOptions = {}) {
  const defaultColor = useMemo(
    () =>
      PROFILE_COLORS.find((color) => color.hex === DEFAULT_PROFILE_COLOR) ??
      PROFILE_COLORS[0] ??
      null,
    []
  );

  const initialStateRef = useRef<CustomProfileDraftState | null>(null);

  if (!initialStateRef.current) {
    initialStateRef.current = {
      profileName: options.initialName ?? "",
      iconId: options.initialIconId ?? PROFILE_ICONS[0]?.id ?? null,
      iconColor:
        options.initialIconColor ??
        defaultColor?.hex ??
        DEFAULT_PROFILE_COLOR,
      colorId:
        options.initialColorId ??
        defaultColor?.id ??
        null,
      reviewsEnabled: options.initialReviewsEnabled ?? false,
    };
  }

  const initialState = initialStateRef.current;
  if (!initialState) {
    throw new Error("useCustomProfileDraft failed to initialize default state");
  }

  const [profileName, setProfileName] = useState(initialState.profileName);
  const [iconId, setIconId] = useState<string | null>(initialState.iconId);
  const [iconColor, setIconColor] = useState<string>(initialState.iconColor);
  const [colorId, setColorId] = useState<string | null>(initialState.colorId);
  const [reviewsEnabled, setReviewsEnabled] = useState<boolean>(
    initialState.reviewsEnabled
  );

  const toggleReviewsEnabled = useCallback(() => {
    setReviewsEnabled((prev) => !prev);
  }, []);

  const handleColorChange = useCallback((color: ProfileColorOption) => {
    setIconColor(color.hex);
    setColorId(color.id);
  }, []);

  const resetDraft = useCallback(() => {
    setProfileName(initialState.profileName);
    setIconId(initialState.iconId);
    setIconColor(initialState.iconColor);
    setColorId(initialState.colorId);
    setReviewsEnabled(initialState.reviewsEnabled);
  }, [initialState]);

  const hydrateDraft = useCallback(
    (draft: Partial<CustomProfileDraftState>) => {
      if (draft.profileName !== undefined) {
        setProfileName(draft.profileName);
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
    profileName,
    setProfileName,
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
