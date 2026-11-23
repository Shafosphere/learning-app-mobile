/* eslint-disable @typescript-eslint/no-require-imports */
import { OFFICIAL_PACKS } from "../officialPacks";

const { OFFICIAL_PACKS: buildPacks, readCardsFromCsv } = require("../../../tools/scripts/build-prebuilt-db");

it("includes every basic element unchanged in the full progressive stage", () => {
  const stages = OFFICIAL_PACKS.filter(pack => pack.knowledgeGroupId === "elements")
    .sort((a, b) => a.position! - b.position!);
  expect(stages.map(pack => pack.slug)).toEqual(["pierwiastki_podstawowe", "pierwiastki_pozostale"]);
  const cards = stages.map(pack => {
    const buildPack = buildPacks.find((entry: { slug: string }) => entry.slug === pack.slug);
    expect(buildPack).toMatchObject({ name: pack.name, packVersion: pack.packVersion });
    return readCardsFromCsv(buildPack) as { externalId: string; frontText: string; backText: string; answers: string[] }[];
  });
  expect(cards[0]).toHaveLength(30);
  expect(cards[1]).toHaveLength(118);
  const fullSet = new Map(cards[1].map(card => [card.externalId, card]));
  expect(fullSet.size).toBe(118);
  for (const card of cards[0]) {
    expect(fullSet.get(card.externalId)).toEqual(expect.objectContaining({
      externalId: card.externalId, frontText: card.frontText, backText: card.backText, answers: card.answers,
    }));
  }
});
