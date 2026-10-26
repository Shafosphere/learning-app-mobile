/* eslint-disable @typescript-eslint/no-require-imports */
import { OFFICIAL_PACKS } from "../officialPacks";
import { imageMaps } from "../imageMaps";

const { OFFICIAL_PACKS: buildPacks, readCardsFromCsv } = require("../../../tools/scripts/build-prebuilt-db");

type SignCard = {
  externalId: string;
  imageFront: string;
  backText: string;
  answers: string[];
};

it("keeps road signs cumulative with identical stable IDs, images and answers in each larger stage", () => {
  const stages = OFFICIAL_PACKS.filter((pack) => pack.knowledgeGroupId === "roadSigns")
    .sort((a, b) => a.position! - b.position!);
  expect(stages.map((pack) => pack.slug)).toEqual([
    "znaki_drogowe_najwazniejsze", "znaki_drogowe_rozszerzone", "znaki_drogowe",
  ]);
  let previous: SignCard[] = [];
  for (const [index, pack] of stages.entries()) {
    const buildPack = buildPacks.find((entry: { slug: string }) => entry.slug === pack.slug);
    expect(buildPack).toMatchObject({ name: pack.name, packVersion: pack.packVersion });
    const cards: SignCard[] = readCardsFromCsv(buildPack);
    expect(cards).toHaveLength([80, 132, 165][index]);
    const byId = new Map(cards.map((card) => [card.externalId, card]));
    expect(byId.size).toBe(cards.length);
    for (const card of previous) {
      expect(byId.get(card.externalId)).toEqual(expect.objectContaining({
        imageFront: card.imageFront, backText: card.backText, answers: card.answers,
      }));
    }
    expect(pack.imageMap).toBe(imageMaps.roadSigns);
    for (const card of cards) {
      expect(Object.prototype.hasOwnProperty.call(pack.imageMap, card.imageFront)).toBe(true);
    }
    previous = cards;
  }
});
