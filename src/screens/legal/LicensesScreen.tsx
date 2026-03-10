import LegalDocumentScreen from "@/src/screens/legal/LegalDocumentScreen";
import React from "react";

export default function LicensesScreen() {
  return (
    <LegalDocumentScreen
      heroKey="legal.licenses"
      sectionKeys={["materials"]}
    />
  );
}
