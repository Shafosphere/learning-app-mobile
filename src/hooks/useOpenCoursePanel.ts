import { CommonActions } from "@react-navigation/native";
import { useNavigationContainerRef } from "expo-router";
import { useCallback } from "react";

export function useOpenCoursePanel() {
  const navigationRef = useNavigationContainerRef();

  return useCallback(() => {
    // Preserve the caller on first entry, but pop to an existing panel on return.
    // Use the container ref because Navbar is rendered outside the root Stack.
    navigationRef.dispatch(
      CommonActions.navigate({ name: "coursepanel/index", pop: true }),
    );
  }, [navigationRef]);
}
