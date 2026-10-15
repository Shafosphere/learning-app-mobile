import { Profiler, type ProfilerOnRenderCallback, type ReactNode } from "react";
import {
  COURSE_ACTIVATION_DIAGNOSTICS_ENABLED,
  recordCourseActivationEvent,
} from "@/src/services/courseActivationDiagnostics";

const onRender: ProfilerOnRenderCallback = (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
  recordCourseActivationEvent("react.commit", { id, phase, actualDuration, baseDuration, startTime, commitTime });
};

// A function instead of a component: disabled diagnostics add no React boundary.
export function profileCourseActivation(id: string, children: ReactNode) {
  return COURSE_ACTIVATION_DIAGNOSTICS_ENABLED
    ? <Profiler id={id} onRender={onRender}>{children}</Profiler>
    : children;
}
