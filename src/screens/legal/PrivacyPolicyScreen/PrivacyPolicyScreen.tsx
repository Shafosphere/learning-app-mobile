import LegalDocumentScreen from "@/src/components/legal/LegalDocumentScreen";
import React from "react";

const PRIVACY_SECTION_KEYS = [
  "overview",
  "controller",
  "purposes",
  "localData",
  "permissions",
  "recipients",
  "retention",
  "noTracking",
  "deletion",
  "transfers",
  "security",
  "rights",
] as const;

export default function PrivacyPolicyScreen() {
  return (
    <LegalDocumentScreen
      heroKey="legal.privacyPolicy"
      sectionKeys={[...PRIVACY_SECTION_KEYS]}
      emphasizedSectionKeys={["controller", "rights"]}
    />
  );
}
