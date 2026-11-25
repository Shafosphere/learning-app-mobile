import { IMAGE_ATTRIBUTION_COURSES as RAW_IMAGE_ATTRIBUTION_COURSES } from "@/src/data/generatedImageAttributions";

export type LocalizedText = { pl: string; en: string };

export type ImageAttribution = {
  id: string;
  commonName: string;
  scientificName?: string;
  title: string;
  author: string;
  sourceUrl: string;
  license: string;
  licenseUrl?: string;
  changes: LocalizedText;
};

export type ImageAttributionCourse = {
  id: string;
  title: LocalizedText;
  attributions: ImageAttribution[];
};

const SHARED_IMAGE_GROUPS = [
  { id: "grzyby", title: { pl: "Grzyby", en: "Mushrooms" }, ids: ["grzyby_podstawowe", "grzyby_rozpoznawanie"] },
  { id: "wladcy_polski", title: { pl: "Władcy Polski", en: "Rulers of Poland" }, ids: ["wladcy_polski_portrety", "wladcy_polski_portrety_daty"] },
];

// Group shared image collections in the directory; preserve every distinct credit.
export const IMAGE_ATTRIBUTION_COURSES: ImageAttributionCourse[] = [];
for (const course of RAW_IMAGE_ATTRIBUTION_COURSES) {
  const group = SHARED_IMAGE_GROUPS.find(group => group.ids.includes(course.id));
  if (!group) {
    IMAGE_ATTRIBUTION_COURSES.push(course);
    continue;
  }
  if (IMAGE_ATTRIBUTION_COURSES.some(course => course.id === group.id)) continue;
  const seen = new Set<string>();
  const attributions = RAW_IMAGE_ATTRIBUTION_COURSES
    .filter(course => group.ids.includes(course.id))
    .flatMap(course => course.attributions.flatMap(attribution => {
      const { id, ...credit } = attribution;
      const key = JSON.stringify(credit);
      if (seen.has(key)) return [];
      seen.add(key);
      return [{ ...attribution, id: `${course.id}:${id}` }];
    }));
  IMAGE_ATTRIBUTION_COURSES.push({ id: group.id, title: group.title, attributions });
}

export function getImageAttributionCourse(courseId: string) {
  return IMAGE_ATTRIBUTION_COURSES.find((course) => course.id === courseId)
    ?? RAW_IMAGE_ATTRIBUTION_COURSES.find((course) => course.id === courseId);
}
