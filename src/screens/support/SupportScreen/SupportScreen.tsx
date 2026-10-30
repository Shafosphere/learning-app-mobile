import MyButton from "@/src/components/button/button";
import { NudgeModal } from "@/src/components/nudge/NudgeModal";
import { SUPPORT_EMAIL } from "@/src/constants/support";
import { useDeviceLayout } from "@/src/hooks/useDeviceLayout";
import { useStyles } from "@/src/screens/support/SupportScreen/SupportScreen-styles";
import { createSupportDiagnosticsAttachment } from "@/src/services/supportDiagnostics";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as MailComposer from "expo-mail-composer";
import { Link } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

type DiagnosticEntry = {
  key: "version" | "build" | "device" | "system";
  label: string;
  value: string;
};

type ReportMailAttempt = {
  opened: boolean;
  leftApp: boolean;
  returned: boolean;
  requiresReturn: boolean;
};

function buildDiagnosticEntries(t: TFunction): DiagnosticEntry[] {
  const unavailable = t("support.diagnostics.unavailable");
  const version =
    Constants.expoConfig?.version ??
    Constants.nativeAppVersion ??
    unavailable;
  const build = Constants.nativeBuildVersion ?? unavailable;
  const deviceModel = Device.modelName ?? unavailable;
  const osName = Device.osName ?? t("support.diagnostics.labels.system");
  const osVersion = Device.osVersion ?? unavailable;

  return [
    {
      key: "version",
      label: t("support.diagnostics.labels.version"),
      value: version,
    },
    {
      key: "build",
      label: t("support.diagnostics.labels.build"),
      value: build,
    },
    {
      key: "device",
      label: t("support.diagnostics.labels.device"),
      value: deviceModel,
    },
    {
      key: "system",
      label: t("support.diagnostics.labels.system"),
      value: `${osName} ${osVersion}`.trim(),
    },
  ];
}

function formatBody(selectedDiagnostics: DiagnosticEntry[], t: TFunction) {
  const intro = t("support.report.bodyIntro");
  if (selectedDiagnostics.length === 0) {
    return intro;
  }

  const diagnostics = selectedDiagnostics
    .map((entry) => `${entry.label}: ${entry.value}`)
    .join("\n");

  return `${intro}\n\n---\n${t("support.report.bodyDiagnosticsTitle")}:\n${diagnostics}`;
}

export default function SupportScreen() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { isTabletLayout, shortestSide, orientation, width } = useDeviceLayout();
  const useCenteredTabletLayout = isTabletLayout || shortestSide >= 560;
  const isLandscapeLayout = orientation === "landscape" && width >= 840;
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attachBasicData, setAttachBasicData] = useState(false);
  const [attachDiagnostics, setAttachDiagnostics] = useState(false);
  const [thankYouVisible, setThankYouVisible] = useState(false);
  const reportAttempt = useRef<ReportMailAttempt | null>(null);
  const appState = useRef(AppState.currentState);
  const mounted = useRef(true);

  const showReportThanksIfReady = useCallback(() => {
    const attempt = reportAttempt.current;
    if (
      mounted.current && attempt?.opened && appState.current === "active" &&
      (!attempt.requiresReturn || attempt.returned)
    ) {
      reportAttempt.current = null;
      setThankYouVisible(true);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    appState.current = AppState.currentState;
    const subscription = AppState.addEventListener("change", (state) => {
      appState.current = state;
      const attempt = reportAttempt.current;
      if (!attempt) return;
      if (state === "inactive" || state === "background") attempt.leftApp = true;
      if (state === "active" && attempt.leftApp) attempt.returned = true;
      showReportThanksIfReady();
    });
    return () => {
      mounted.current = false;
      reportAttempt.current = null;
      subscription.remove();
    };
  }, [showReportThanksIfReady]);

  const beginReportMailAttempt = useCallback((requiresReturn: boolean) => {
    const attempt: ReportMailAttempt = {
      opened: false, leftApp: false, returned: false, requiresReturn,
    };
    if (mounted.current) reportAttempt.current = attempt;
    return attempt;
  }, []);

  const completeReportMailAttempt = useCallback((attempt: ReportMailAttempt) => {
    if (reportAttempt.current !== attempt) return;
    attempt.opened = true;
    showReportThanksIfReady();
  }, [showReportThanksIfReady]);

  const closeThankYou = useCallback(() => setThankYouVisible(false), []);
  const diagnosticEntries = useMemo(() => buildDiagnosticEntries(t), [t]);
  const emailBody = useMemo(
    () => formatBody(attachBasicData ? diagnosticEntries : [], t),
    [attachBasicData, diagnosticEntries, t]
  );

  const openMailto = useCallback(
    async (subject: string, body: string, successMessage: string, isReport = false) => {
      const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
        subject,
      )}&body=${encodeURIComponent(body)}`;
      const attempt = isReport ? beginReportMailAttempt(true) : null;
      try {
        await Linking.openURL(url);
        if (attempt) completeReportMailAttempt(attempt);
        setStatus(successMessage);
      } catch (error) {
        if (attempt && reportAttempt.current === attempt) reportAttempt.current = null;
        console.warn("[Support] mailto failed", error);
        setStatus(t("support.status.mailClientFailed"));
      }
    },
    [beginReportMailAttempt, completeReportMailAttempt, t],
  );

  const handleSendEmail = useCallback(async () => {
    reportAttempt.current = null;
    setThankYouVisible(false);
    setBusy(true);
    setStatus(null);

    try {
      let attachments: string[] | undefined;
      let body = emailBody;
      if (attachDiagnostics) {
        const diagnosticsFileUri =
          await createSupportDiagnosticsAttachment(diagnosticEntries);
        attachments = [diagnosticsFileUri];
        body = `${body}\n\n${t("support.report.diagnosticsAttachmentNote")}`;
      }

      const available = await MailComposer.isAvailableAsync();
      if (available) {
        const attempt = beginReportMailAttempt(Platform.OS !== "ios");
        const result = await MailComposer.composeAsync({
          recipients: [SUPPORT_EMAIL],
          subject: t("support.report.subject"),
          body,
          attachments,
        });

        if (
          result.status === MailComposer.MailComposerStatus.CANCELLED ||
          result.status === MailComposer.MailComposerStatus.SAVED
        ) {
          if (reportAttempt.current === attempt) reportAttempt.current = null;
          setStatus(t(result.status === MailComposer.MailComposerStatus.CANCELLED
            ? "support.status.sendCancelled" : "support.status.draftSaved"));
        } else if (
          Platform.OS !== "ios" || result.status === MailComposer.MailComposerStatus.SENT
        ) {
          completeReportMailAttempt(attempt);
          setStatus(t(Platform.OS === "ios"
            ? "support.status.reportSent" : "support.status.mailtoOpenedReport"));
        } else {
          if (reportAttempt.current === attempt) reportAttempt.current = null;
        }
        return;
      }

      await openMailto(
        t("support.report.subject"),
        attachDiagnostics
          ? `${emailBody}\n\n${t("support.report.mailtoDiagnosticsUnavailable")}`
          : emailBody,
        attachDiagnostics
          ? t("support.status.mailtoOpenedReportNoAttachment")
          : t("support.status.mailtoOpenedReport"),
        true,
      );
    } catch (error) {
      reportAttempt.current = null;
      console.warn("[Support] send email failed", error);
      setStatus(t("support.status.composerFailed"));
      await openMailto(
        t("support.report.subject"),
        attachDiagnostics
          ? `${emailBody}\n\n${t("support.report.mailtoDiagnosticsUnavailable")}`
          : emailBody,
        attachDiagnostics
          ? t("support.status.mailtoOpenedReportNoAttachment")
          : t("support.status.mailtoOpenedReport"),
        true,
      );
    } finally {
      setBusy(false);
    }
  }, [attachDiagnostics, beginReportMailAttempt, completeReportMailAttempt, diagnosticEntries, emailBody, openMailto, t]);

  const handleSendSuggestion = useCallback(async () => {
    reportAttempt.current = null;
    setBusy(true);
    setStatus(null);

    try {
      const available = await MailComposer.isAvailableAsync();
      if (available) {
        const result = await MailComposer.composeAsync({
          recipients: [SUPPORT_EMAIL],
          subject: t("support.suggestion.subject"),
          body: t("support.suggestion.body"),
        });

        if (result.status === MailComposer.MailComposerStatus.SENT) {
          setStatus(t("support.status.suggestionSent"));
          return;
        }

        if (result.status === MailComposer.MailComposerStatus.CANCELLED) {
          setStatus(t("support.status.sendCancelled"));
          return;
        }
      }

      await openMailto(
        t("support.suggestion.subject"),
        t("support.suggestion.body"),
        t("support.status.mailtoOpenedSuggestion"),
      );
    } catch (error) {
      console.warn("[Support] send suggestion failed", error);
      setStatus(t("support.status.composerFailed"));
      await openMailto(
        t("support.suggestion.subject"),
        t("support.suggestion.body"),
        t("support.status.mailtoOpenedSuggestion"),
      );
    } finally {
      setBusy(false);
    }
  }, [openMailto, t]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={[
          styles.scrollView,
          useCenteredTabletLayout && styles.scrollViewTablet,
          isLandscapeLayout && styles.scrollViewLandscape,
        ]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.workspace, isLandscapeLayout && styles.workspaceLandscape]}>
          <View style={[styles.section, isLandscapeLayout && styles.sectionLandscape]}>
            <Text style={styles.header}>{t("support.report.title")}</Text>
            <Text style={styles.subtitle}>{t("support.report.subtitle")}</Text>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: attachBasicData }}
              onPress={() => setAttachBasicData((value) => !value)}
              style={styles.checkboxRow}
            >
              <View
                style={[
                  styles.checkboxBox,
                  attachBasicData ? styles.checkboxBoxActive : null,
                ]}
              >
                {attachBasicData ? <View style={styles.checkboxDot} /> : null}
              </View>
              <View style={styles.checkboxTextGroup}>
                <Text style={styles.checkboxTitle}>
                  {t("support.report.attachBasicData")}
                </Text>
                <Text style={styles.checkboxSubtitle}>
                  {t("support.report.attachBasicDataSubtitle")}
                </Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: attachDiagnostics }}
              onPress={() => setAttachDiagnostics((value) => !value)}
              style={styles.checkboxRow}
            >
              <View
                style={[
                  styles.checkboxBox,
                  attachDiagnostics ? styles.checkboxBoxActive : null,
                ]}
              >
                {attachDiagnostics ? <View style={styles.checkboxDot} /> : null}
              </View>
              <View style={styles.checkboxTextGroup}>
                <Text style={styles.checkboxTitle}>
                  {t("support.report.attachDiagnostics")}
                </Text>
                <Text style={styles.checkboxSubtitle}>
                  {t("support.report.attachDiagnosticsSubtitle")}
                </Text>
              </View>
            </Pressable>
            <View style={styles.buttonWrapper}>
              <MyButton
                text={t("support.report.button")}
                onPress={handleSendEmail}
                width={160}
                disabled={busy}
              />
            </View>
            {status ? <Text style={styles.status}>{status}</Text> : null}
          </View>

          <View style={[styles.section, isLandscapeLayout && styles.sectionLandscape]}>
            <Text style={styles.header}>{t("support.suggestion.title")}</Text>
            <Text style={styles.subtitle}>{t("support.suggestion.subtitle")}</Text>
            <View style={styles.buttonWrapper}>
              <MyButton
                text={t("support.suggestion.button")}
                onPress={handleSendSuggestion}
                width={160}
                disabled={busy}
              />
            </View>
          </View>

          <View style={[styles.section, isLandscapeLayout && styles.sectionLandscape]}>
            <Text style={styles.header}>{t("support.guide.title")}</Text>
            <Text style={styles.subtitle}>{t("support.guide.subtitle")}</Text>
            <View style={styles.buttonWrapper}>
              <Link href="/wiki" asChild>
                <MyButton
                  text={t("support.guide.button")}
                  color="my_green"
                  width={160}
                />
              </Link>
            </View>
          </View>

          <View style={[styles.panel, isLandscapeLayout && styles.sectionLandscape]}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>{t("support.about.title")}</Text>
              <Text style={styles.panelSubtitle}>{t("support.about.subtitle")}</Text>
            </View>

            <View style={styles.panelBody}>
              <View style={styles.staticList}>
                {diagnosticEntries.map((entry) => (
                  <View style={styles.staticRow} key={entry.key}>
                    <View style={styles.chipBox}>
                      <View style={styles.chipCheck} />
                    </View>
                    <View style={styles.staticContent}>
                      <Text style={styles.chipText}>{entry.label}</Text>
                      <Text style={styles.staticValue}>{entry.value}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={[styles.section, isLandscapeLayout && styles.sectionLandscape]}>
            <Text style={styles.header}>{t("support.legal.title")}</Text>
            <Text style={styles.subtitle}>{t("support.legal.subtitle")}</Text>
            <View style={styles.buttonWrapper}>
              <Link href="/privacy-policy" asChild>
                <MyButton
                  text={t("legal.entry.privacyButton")}
                  color="my_yellow"
                  width={160}
                />
              </Link>
            </View>
            <View style={styles.buttonWrapper}>
              <Link href="/licenses" asChild>
                <MyButton
                  text={t("legal.entry.licensesButton")}
                  color="my_green"
                  width={160}
                  textStyle={styles.legalButtonText}
                />
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
      <NudgeModal
        visible={thankYouVisible}
        title={t("support.report.thankYou.title")}
        description={t("support.report.thankYou.description")}
        confirmLabel={t("support.report.thankYou.confirm")}
        closeLabel={t("support.report.thankYou.close")}
        onConfirm={closeThankYou}
        onClose={closeThankYou}
      />
    </View>
  );
}
