import { getAudioCourse, getAudioPack, resolveRecording } from "../catalog";
import { mapCustomCardToWord, mapReviewCardToWord } from "@/src/utils/flashcardsMapper";
import type { CustomFlashcardRecord } from "@/src/db/sqlite/repositories/flashcards";

it("shares Spanish recordings across translations while keeping physical-side languages", () => {
  const pl = resolveRecording("es_to_pl_first_50", "0001", "front", "agua")!;
  expect(pl).toEqual(resolveRecording("es_to_en_first_50", "0001", "front", "agua"));
  expect(pl.recording).toMatchObject({ packName: "audio_es_50", language: "es-ES" });
  expect(pl.recording?.relativePath).toMatch(/^[a-f0-9]{64}\.mp3$/);
  expect(resolveRecording("es_to_pl_first_50", "0001", "back", "woda")).toEqual({ language: "pl-PL", recording: null });
  expect(resolveRecording("es_to_en_first_50", "0001", "back", "water")).toEqual({ language: "en-US", recording: null });
});
it("rejects obsolete text, absent identity and courses without audio", () => {
  expect(resolveRecording("es_to_pl_first_50", "0001", "front", "edited")?.recording).toBeNull();
  expect(resolveRecording("es_to_pl_first_50", null, "front", "agua")?.recording).toBeNull();
  expect(resolveRecording("unknown", "0001", "front", "eau")).toBeNull();
  expect(getAudioCourse("unknown")).toBeUndefined();
  expect(getAudioPack("audio_es_50")?.recordingCount).toBe(50);
});
it.each(["pl", "en"])("resolves shared Spanish MP3 and incremental packs with %s translations", (target) => {
  const first = resolveRecording(`es_to_${target}_first_50`, "0001", "front", "agua");
  for (const count of [150, 327]) {
    expect(resolveRecording(`es_to_${target}_first_${count}`, "0001", "front", "agua")).toEqual(first);
    expect(resolveRecording(`es_to_${target}_first_${count}`, "0107", "front", "ser")?.recording?.packName).toBe("audio_es_150");
  }
  expect(resolveRecording(`es_to_${target}_first_327`, "0051", "front", "hola")?.recording?.packName).toBe("audio_es_327");
  expect(resolveRecording(`es_to_${target}_first_327`, "0328", "front", "no me gusta")?.recording?.text).toBe("no me gusta");
});
it("preserves externalId through study and review mapping", () => {
  const card = { id: 7, externalId: "0001", frontText: "agua", backText: "water", answers: ["water"], flipped: true } as CustomFlashcardRecord;
  expect(mapCustomCardToWord(card).externalId).toBe("0001");
  expect(mapReviewCardToWord({ ...card, stage: 2, nextReview: 123 }).externalId).toBe("0001");
});
it("shares French recordings between A1 and smaller PL/EN courses and resolves single variants", () => {
  const water = resolveRecording("french_a1", "0216", "front", "eau");
  expect(water?.recording).not.toBeNull();
  for (const target of ["pl", "en"]) for (const count of [50, 150, 332]) {
    expect(resolveRecording(`fr_to_${target}_first_${count}`, "0001", "front", "eau")).toEqual(water);
  }
  for (const text of ["fait", "fais", "fasse", "faisons", "fassent"]) {
    expect(resolveRecording("french_a1", "0038", "front", text)?.recording).toMatchObject({ text, language: "fr-FR" });
  }
  expect(resolveRecording("french_a1", "0038", "front", "fait; fais")?.recording).toBeNull();
  expect(resolveRecording("french_a1", "0038", "back", "do")).toEqual({ language: "en-US", recording: null });
  expect(resolveRecording("fr_to_en_first_50", "0038", "front", "canape\u0301")?.recording?.text).toBe("canapé");
});
it.each([
  ["french_a2", "0702", ["montre", "montré", "montrent"]],
  ["french_b1", "2003", ["construit", "construite", "construits"]],
  ["french_b2", "5004", ["crie", "crié"]],
] as const)("resolves real generated forms in %s", (slug, externalId, forms) => {
  expect(getAudioCourse(slug)?.requiredPacks.length).toBe(2);
  for (const text of forms) expect(resolveRecording(slug, externalId, "front", text)?.recording).toMatchObject({ text, language: "fr-FR" });
  expect(resolveRecording(slug, externalId, "front", "edited")?.recording).toBeNull();
});
it("resolves recording index zero rather than treating it as missing", () => {
  expect(resolveRecording("french_b2", "7991", "front", "tactique")?.recording).toMatchObject({ text: "tactique", packName: "audio_fr_b2" });
});
