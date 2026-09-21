import { type Face } from "@/src/components/Box/Skin/boxFaces";

export function getFaceForQuote(id: string, category: string): Face {
  if (category === "box_spam") {
    const index = Number(id.split("_").at(-1));
    return index <= 1 ? "surprised" : index <= 3 ? "angry" : "crying";
  }
  if (id === "easter_2") return "angry";
  if (category === "easter") return "blushed";
  if (["win_mastery", "streak"].includes(category)) return "love";
  if (["win_fast", "comeback", "startup_morning", "startup_day", "startup_evening", "startup_night", "first_time", "return"].includes(category)) return "happy";
  if (category === "win_standard") return "blushed";
  if (category === "loss") return "sad";
  if (["hint", "long_think"].includes(category)) return "surprised";
  return "nice";
}

export function getFaceForPopup(color: "calm" | "angry" | "disoriented"): Face {
  return color === "angry" ? "sad" : color === "disoriented" ? "surprised" : "happy";
}

export function resolveNavbarMascotFace({
  popup,
  quote,
  tapFace,
}: {
  popup: { color: "calm" | "angry" | "disoriented" } | null;
  quote: { id: string; category: string } | null;
  tapFace: Face | null;
}): Face {
  if (popup) return getFaceForPopup(popup.color);
  if (quote) return getFaceForQuote(quote.id, quote.category);
  if (tapFace) return tapFace;
  return "happy";
}
