import LegalDocumentScreen from "@/src/components/legal/LegalDocumentScreen";
import React from "react";

export default function LicensesScreen() {
  return (
    <LegalDocumentScreen
      heroKey="legal.licenses"
      sectionKeys={["materials"]}
    />
  );
}
