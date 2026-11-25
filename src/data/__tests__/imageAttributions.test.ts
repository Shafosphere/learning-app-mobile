import { IMAGE_ATTRIBUTION_COURSES, getImageAttributionCourse } from "../imageAttributions";
import { IMAGE_ATTRIBUTION_COURSES as raw } from "../generatedImageAttributions";

it("combines mushroom courses and rulers while retaining every distinct credit", () => {
  const creditKey = ({ id: _id, ...credit }: (typeof raw)[number]["attributions"][number]) => JSON.stringify(credit);
  for (const [id, ids] of [
    ["grzyby", ["grzyby_podstawowe", "grzyby_rozpoznawanie"]],
    ["wladcy_polski", ["wladcy_polski_portrety", "wladcy_polski_portrety_daty"]],
  ] as const) {
    const merged = getImageAttributionCourse(id)!;
    const originals = raw.filter(course => (ids as readonly string[]).includes(course.id));
    expect(new Set(merged.attributions.map(creditKey)))
      .toEqual(new Set(originals.flatMap(course => course.attributions.map(creditKey))));
    expect(new Set(merged.attributions.map(credit => credit.id)).size).toBe(merged.attributions.length);
    expect(IMAGE_ATTRIBUTION_COURSES.filter(course => (ids as readonly string[]).includes(course.id))).toHaveLength(0);
    for (const original of originals) expect(getImageAttributionCourse(original.id)).toBe(original);
  }
  expect(IMAGE_ATTRIBUTION_COURSES).toHaveLength(raw.length - 2);
});
