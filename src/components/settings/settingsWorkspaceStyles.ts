// Shared geometry for app settings and course settings in tablet landscape.
export const settingsWorkspaceStyles = {
  settingsWorkspace: { flex: 1 },
  settingsWorkspaceLandscape: { flexDirection: "row-reverse" },
  settingsBody: { flex: 1 },
  settingsBodyLandscape: { paddingHorizontal: 24, paddingTop: 8 },
  scrollViewLandscape: { maxWidth: 720 },
  scrollContentLandscape: { paddingHorizontal: 0, paddingTop: 0 },
  buttonsContainerLandscape: { paddingHorizontal: 0 },
  buttonsRowLandscape: { maxWidth: 720 },
} as const;
