import type {
  SessionStep,
  SessionStepType,
} from "@/src/screens/review/minigames/sessionStore";

type SessionRoute =
  | "/review/minigames/memorygame"
  | "/review/minigames/chooseone"
  | "/review/minigames/inputaletter"
  | "/review/minigames/getapair"
  | "/review/table"
  | "/review/brain";

export const getRouteForStepType = (type: SessionStepType): SessionRoute => {
  switch (type) {
    case "memory":
      return "/review/minigames/memorygame";
    case "chooseone":
      return "/review/minigames/chooseone";
    case "inputaletter":
      return "/review/minigames/inputaletter";
    case "getapair":
      return "/review/minigames/getapair";
    case "table":
      return "/review/table";
    default:
      return "/review/brain";
  }
};

export const getRouteForStep = (step: SessionStep): SessionRoute =>
  getRouteForStepType(step.type);
