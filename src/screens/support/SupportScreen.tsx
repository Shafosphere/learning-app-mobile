import MyButton from "@/src/components/button/button";
import { useStyles } from "@/src/screens/support/SupportScreen-styles";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as MailComposer from "expo-mail-composer";
import { Link } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Linking, Platform, ScrollView, Text, View } from "react-native";

const SUPPORT_EMAIL = "support@example.com";
const BUG_REPORT_SUBJECT = "Zgłoszenie błędu - Learning App";
const SUGGESTION_SUBJECT = "Sugestia / pomysł - Learning App";
const SUGGESTION_BODY =
  "Masz pomysł na nową funkcję lub ulepszenie? Opisz w kilku zdaniach co chcesz zmienić i dlaczego będzie to pomocne.";

type DiagnosticEntry = {
  key: "app" | "platform" | "device";
  label: string;
  value: string;
};

function buildDiagnosticEntries(): DiagnosticEntry[] {
  const version = Constants.expoConfig?.version ?? "unknown";
  const androidVersionCode =
    Constants.expoConfig?.android?.versionCode ?? "n/a";
  const iosBuildNumber = Constants.expoConfig?.ios?.buildNumber ?? "n/a";
  const deviceModel = Device.modelName ?? "unknown";
  const deviceName = Device.deviceName ?? "unknown";
  const osName = Device.osName ?? Platform.OS;
  const osVersion = Device.osVersion ?? "unknown";

  return [
    {
      key: "app",
      label: "Wersja aplikacji",
      value: `App version: ${version} (android: ${androidVersionCode}, ios: ${iosBuildNumber})`,
    },
    {
      key: "platform",
      label: "Platforma i OS",
      value: `Platform: ${Platform.OS}; OS: ${osName} ${osVersion}`,
    },
    {
      key: "device",
      label: "Model urządzenia",
      value: `Device: ${deviceModel} (${deviceName})`,
    },
  ];
}

function formatBody(selectedDiagnostics: string[]) {
  const intro = "Opisz problem (kroki, co widzisz):";

  return `${intro}\n\n---\nDane techniczne (dołączone automatycznie):\n${selectedDiagnostics.join(
    "\n",
  )}`;
}

export default function SupportScreen() {
  const styles = useStyles();
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const diagnosticEntries = useMemo(buildDiagnosticEntries, []);
  const selectedDiagnostics = useMemo(
    () => diagnosticEntries.map((entry) => entry.value),
    [diagnosticEntries],
  );

  const emailBody = useMemo(
    () => formatBody(selectedDiagnostics),
    [selectedDiagnostics],
  );

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
        setStatus(
          "Nie udało się otworzyć klienta poczty. Skopiuj dane ręcznie i wyślij własnoręcznie.",
        );
      }
    },
    [],
  );

  const handleSendEmail = useCallback(async () => {
    setBusy(true);
    setStatus(null);

    try {
      const available = await MailComposer.isAvailableAsync();
      if (available) {
        const result = await MailComposer.composeAsync({
          recipients: [SUPPORT_EMAIL],
          subject: BUG_REPORT_SUBJECT,
          body: emailBody,
        });

        if (result.status === MailComposer.MailComposerStatus.SENT) {
          setStatus("Wysłane przez klienta poczty. Dziękujemy!");
          return;
        }

        if (result.status === MailComposer.MailComposerStatus.CANCELLED) {
          setStatus("Wysyłka anulowana. Możesz spróbować ponownie.");
          return;
        }
      }

      await openMailto(
        BUG_REPORT_SUBJECT,
        emailBody,
        "Otworzyłem mailto:. Dopisz opis i wyślij wiadomość.",
      );
    } catch (error) {
      console.warn("[Support] send email failed", error);
      setStatus(
        "Nie udało się otworzyć composer-a. Spróbuj ponownie lub użyj mailto.",
      );
      await openMailto(
        BUG_REPORT_SUBJECT,
        emailBody,
        "Otworzyłem mailto:. Dopisz opis i wyślij wiadomość.",
      );
    } finally {
      setBusy(false);
    }
  }, [emailBody, openMailto]);

  const handleSendSuggestion = useCallback(async () => {
    setBusy(true);
    setStatus(null);

    try {
      const available = await MailComposer.isAvailableAsync();
      if (available) {
        const result = await MailComposer.composeAsync({
          recipients: [SUPPORT_EMAIL],
          subject: SUGGESTION_SUBJECT,
          body: SUGGESTION_BODY,
        });

        if (result.status === MailComposer.MailComposerStatus.SENT) {
          setStatus("Sugestia wysłana. Dziękujemy za pomysł!");
          return;
        }

        if (result.status === MailComposer.MailComposerStatus.CANCELLED) {
          setStatus("Wysyłka anulowana. Możesz spróbować ponownie.");
          return;
        }
      }

      await openMailto(
        SUGGESTION_SUBJECT,
        SUGGESTION_BODY,
        "Otworzyłem mailto:. Opisz swój pomysł i wyślij wiadomość.",
      );
    } catch (error) {
      console.warn("[Support] send suggestion failed", error);
      setStatus(
        "Nie udało się otworzyć composer-a. Spróbuj ponownie lub użyj mailto.",
      );
      await openMailto(
        SUGGESTION_SUBJECT,
        SUGGESTION_BODY,
        "Otworzyłem mailto:. Opisz swój pomysł i wyślij wiadomość.",
      );
    } finally {
      setBusy(false);
    }
  }, [openMailto]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.header}>Wyślij sugestię</Text>
          <Text style={styles.subtitle}>
            Masz pomysł na nową funkcję lub poprawkę? Podziel się nim, a my
            sprawdzimy jak możemy go wdrożyć.
          </Text>
          <View style={styles.buttonWrapper}>
            <MyButton
              text="Podziel się pomysłem"
              onPress={handleSendSuggestion}
              width={160}
              disabled={busy}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.header}>Zgłoś problem</Text>
          <Text style={styles.subtitle}>
            Otworzymy Twoją domyślną aplikację poczty z uzupełnionym tematem i
            danymi technicznymi (wersja, platforma/OS, model). Dodaj opis i
            wyślij.
          </Text>
          <View style={styles.buttonWrapper}>
            <MyButton
              text="Wyślij e-mail"
              onPress={handleSendEmail}
              width={160}
              disabled={busy}
            />
          </View>
          {status ? <Text style={styles.status}>{status}</Text> : null}
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Dane techniczne</Text>
            <Text style={styles.panelSubtitle}>
              Dołączamy je automatycznie do zgłoszenia.
            </Text>
          </View>

          <View style={styles.panelBody}>
            <View style={styles.staticList}>
              {diagnosticEntries.map((entry) => (
                <View style={styles.staticRow} key={entry.key}>
                  <View style={styles.chipBox}>
                    <View style={styles.chipCheck} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.chipText}>{entry.label}</Text>
                    <Text style={styles.staticValue}>{entry.value}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.header}>Potrzebujesz wskazówki?</Text>
          <Text style={styles.subtitle}>
            Zanim wyślesz zgłoszenie możesz sprawdzić nasz poradnik.
          </Text>
          <View style={styles.buttonWrapper}>
            <Link href="/wiki" asChild>
              <MyButton text="co i jak" color="my_green" width={140} />
            </Link>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
