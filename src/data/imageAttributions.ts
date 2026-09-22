import { IMAGE_ATTRIBUTION_COURSES } from "@/src/data/generatedImageAttributions";

export type LocalizedText = { pl: string; en: string };

export type ImageAttribution = {
  id: string;
  commonName: string;
  scientificName: string;
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

export { IMAGE_ATTRIBUTION_COURSES };

export function getImageAttributionCourse(courseId: string) {
  return IMAGE_ATTRIBUTION_COURSES.find((course) => course.id === courseId);
}
