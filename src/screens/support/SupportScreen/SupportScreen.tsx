import MyButton from "@/src/components/button/button";
import { SUPPORT_EMAIL } from "@/src/constants/support";
import { useStyles } from "@/src/screens/support/SupportScreen/SupportScreen-styles";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as MailComposer from "expo-mail-composer";
import { Link } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Linking, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

type DiagnosticEntry = {
  key: "version" | "build" | "device" | "system";
  label: string;
  value: string;
};

function buildDiagnosticEntries(): DiagnosticEntry[] {
  const version =
    Constants.expoConfig?.version ??
    Constants.nativeAppVersion ??
    "niedostępny";
  const build = Constants.nativeBuildVersion ?? "niedostępny";
  const deviceModel = Device.modelName ?? "niedostępny";
  const osName = Device.osName ?? "System";
  const osVersion = Device.osVersion ?? "niedostępny";

  return [
    {
      key: "version",
      label: "Wersja aplikacji",
      value: version,
    },
    {
      key: "build",
      label: "Build",
      value: build,
    },
    {
      key: "device",
      label: "Model urządzenia",
      value: deviceModel,
    },
    {
      key: "system",
      label: "System",
      value: `${osName} ${osVersion}`.trim(),
    },
  ];
}

function formatBody(selectedDiagnostics: DiagnosticEntry[]) {
  const intro = "Opisz problem (kroki, co widzisz):";
  const diagnostics = selectedDiagnostics
    .map((entry) => `${entry.label}: ${entry.value}`)
    .join("\n");

  return `${intro}\n\n---\nO aplikacji (dołączone automatycznie):\n${diagnostics}`;
}

export default function SupportScreen() {
  const styles = useStyles();
  const { t } = useTranslation();
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const diagnosticEntries = useMemo(buildDiagnosticEntries, []);
  const emailBody = useMemo(() => formatBody(diagnosticEntries), [diagnosticEntries]);

  const openMailto = useCallback(
    async (subject: string, body: string, successMessage: string) => {
      const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
        subject,
      )}&body=${encodeURIComponent(body)}`;
      try {
        await Linking.openURL(url);
        setStatus(successMessage);
      } catch (error) {
        console.warn("[Support] mailto failed", error);
        setStatus(t("support.status.mailClientFailed"));
      }
    },
    [t],
  );

  const handleSendEmail = useCallback(async () => {
    setBusy(true);
    setStatus(null);

    try {
      const available = await MailComposer.isAvailableAsync();
      if (available) {
        const result = await MailComposer.composeAsync({
          recipients: [SUPPORT_EMAIL],
          subject: t("support.report.subject"),
          body: emailBody,
        });

        if (result.status === MailComposer.MailComposerStatus.SENT) {
          setStatus(t("support.status.reportSent"));
          return;
        }

        if (result.status === MailComposer.MailComposerStatus.CANCELLED) {
          setStatus(t("support.status.sendCancelled"));
          return;
        }
      }

      await openMailto(
        t("support.report.subject"),
        emailBody,
        t("support.status.mailtoOpenedReport"),
      );
    } catch (error) {
      console.warn("[Support] send email failed", error);
      setStatus(t("support.status.composerFailed"));
      await openMailto(
        t("support.report.subject"),
        emailBody,
        t("support.status.mailtoOpenedReport"),
      );
    } finally {
      setBusy(false);
    }
  }, [emailBody, openMailto, t]);

  const handleSendSuggestion = useCallback(async () => {
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
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.header}>{t("support.report.title")}</Text>
          <Text style={styles.subtitle}>{t("support.report.subtitle")}</Text>
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

        <View style={styles.section}>
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

        <View style={styles.section}>
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

        <View style={styles.panel}>
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

        <View style={styles.section}>
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
              />
            </Link>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
