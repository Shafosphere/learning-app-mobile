import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "expo-router";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  getOnboardingCheckpoint,
  OnboardingCheckpoint,
  setOnboardingCheckpoint,
} from "@/src/services/onboardingCheckpoint";

const PIN_ROUTE = "/createcourse";
const ACTIVATE_ROUTE = "/coursepanel";

export function OnboardingGate() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    courses,
    pinnedOfficialCourseIds,
    activeCourse,
    activeCustomCourseId,
  } = useSettings();
  const coursesCount = courses.length;
  const pinnedCount = pinnedOfficialCourseIds?.length ?? 0;
  const [hydrated, setHydrated] = useState(false);
  const [checkpoint, setCheckpoint] = useState<OnboardingCheckpoint>(
    "pin_required"
  );
  const lastRedirectRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getOnboardingCheckpoint()
      .then((stored) => {
        if (!mounted) return;
        if (stored) {
          setCheckpoint(stored);
        }
      })
      .finally(() => {
        if (mounted) setHydrated(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const resolvedCheckpoint = useMemo<OnboardingCheckpoint>(() => {
    const hasActive = !!activeCourse || activeCustomCourseId != null;
    const hasPinned = coursesCount > 0 || pinnedCount > 0;

    if (hasActive) return "done";
    if (hasPinned) return "activate_required";
    return checkpoint;
  }, [activeCourse, activeCustomCourseId, checkpoint, coursesCount, pinnedCount]);

  useEffect(() => {
    if (!hydrated) return;
    if (resolvedCheckpoint !== checkpoint) {
      setCheckpoint(resolvedCheckpoint);
      void setOnboardingCheckpoint(resolvedCheckpoint);
    } else {
      // ensure persisted even if same, to cover first boot default
      void setOnboardingCheckpoint(resolvedCheckpoint);
    }
  }, [checkpoint, hydrated, resolvedCheckpoint]);

  useEffect(() => {
    if (!hydrated) return;
    if (resolvedCheckpoint === "done") return;

    const target =
      resolvedCheckpoint === "pin_required" ? PIN_ROUTE : ACTIVATE_ROUTE;

    // W trybie aktywacji pozwalamy zostać na ekranie przypinania,
    // żeby użytkownik sam przeszedł dalej.
    if (resolvedCheckpoint === "activate_required" && pathname === PIN_ROUTE) {
      lastRedirectRef.current = null;
      return;
    }

    const alreadyOnTarget =
      pathname === target || pathname?.startsWith(`${target}?`);
    if (alreadyOnTarget) {
      lastRedirectRef.current = null;
      return;
    }

    const lastRedirect = lastRedirectRef.current;
    if (lastRedirect === target) {
      return;
    }

    lastRedirectRef.current = target;
    router.replace(target);
  }, [hydrated, pathname, resolvedCheckpoint, router]);

  return null;
}

export default OnboardingGate;
