import MyButton from "@/src/components/button/button";
import { useStyles } from "@/src/screens/support/SupportScreen-styles";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as MailComposer from "expo-mail-composer";
import { Link } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";

const SUPPORT_EMAIL = "support@example.com";

type DiagnosticKey = "app" | "platform" | "device" | "locale" | "session";

type DiagnosticEntry = {
  key: DiagnosticKey;
  label: string;
  value: string;
  defaultChecked: boolean;
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
  const locale =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().locale
      : "unknown";

  return [
    {
      key: "app",
      label: "Wersja aplikacji",
      value: `App version: ${version} (android: ${androidVersionCode}, ios: ${iosBuildNumber})`,
      defaultChecked: true,
    },
    {
      key: "platform",
      label: "Platforma i OS",
      value: `Platform: ${Platform.OS}; OS: ${osName} ${osVersion}`,
      defaultChecked: true,
    },
    {
      key: "device",
      label: "Model urządzenia",
      value: `Device: ${deviceModel} (${deviceName})`,
      defaultChecked: true,
    },
    {
      key: "locale",
      label: "Język / locale",
      value: `Locale: ${locale}`,
      defaultChecked: false,
    },
    {
      key: "session",
      label: "Sesja",
      value: `Session: ${Constants.sessionId}`,
      defaultChecked: false,
    },
  ];
}

function formatBody(
  selectedDiagnostics: string[],
  includeDiagnostics: boolean
) {
  const intro = "Opisz problem (kroki, co widzisz):";
  if (!includeDiagnostics) {
    return `${intro}\n\n(Dane techniczne nie zostaną dołączone. Przełącz w ekranie zgłoszenia, aby je dodać.)`;
  }
  if (selectedDiagnostics.length === 0) {
    return `${intro}\n\n(Wybrałeś włączenie diagnostyki, ale żadnych pól nie zaznaczono.)`;
  }

  return `${intro}\n\n---\nDane techniczne (dołączone automatycznie):\n${selectedDiagnostics.join(
    "\n"
  )}`;
}

function pluralizeFields(count: number) {
  if (count === 1) return "pole";
  if (count >= 2 && count <= 4) return "pola";
  return "pól";
}

export default function SupportScreen() {
  const styles = useStyles();
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [includeDiagnostics, setIncludeDiagnostics] = useState(false);
  const diagnosticEntries = useMemo(buildDiagnosticEntries, []);
  const [selectedFields, setSelectedFields] = useState<Record<
    DiagnosticKey,
    boolean
  >>(() =>
    diagnosticEntries.reduce(
      (acc, entry) => ({ ...acc, [entry.key]: entry.defaultChecked }),
      {} as Record<DiagnosticKey, boolean>
    )
  );

  const selectedDiagnostics = useMemo(() => {
    if (!includeDiagnostics) return [];
    return diagnosticEntries
      .filter((entry) => selectedFields[entry.key])
      .map((entry) => entry.value);
  }, [diagnosticEntries, includeDiagnostics, selectedFields]);

  const emailBody = useMemo(
    () => formatBody(selectedDiagnostics, includeDiagnostics),
    [selectedDiagnostics, includeDiagnostics]
  );

  const checkedCount = useMemo(
    () =>
      diagnosticEntries.filter((entry) => selectedFields[entry.key]).length,
    [diagnosticEntries, selectedFields]
  );

  const summaryText = useMemo(() => {
    if (!includeDiagnostics) {
      return "Dane techniczne nie będą dołączone.";
    }
    if (checkedCount === 0) {
      return "Włączone, ale bez wybranych pól.";
    }
    return `Dołączysz ${checkedCount} ${pluralizeFields(
      checkedCount
    )} danych technicznych.`;
  }, [checkedCount, includeDiagnostics]);

  const toggleField = useCallback(
    (key: DiagnosticKey) => {
      if (!includeDiagnostics) return;
      setSelectedFields((prev) => ({
        ...prev,
        [key]: !prev[key],
      }));
    },
    [includeDiagnostics]
  );

  const toggleAllFields = useCallback(() => {
    const allSelected = checkedCount === diagnosticEntries.length;
    const shouldSelectAll = !includeDiagnostics || !allSelected;

    setIncludeDiagnostics(true);
    setSelectedFields((prev) =>
      diagnosticEntries.reduce(
        (acc, entry) => ({ ...acc, [entry.key]: shouldSelectAll }),
        { ...prev }
      )
    );
  }, [checkedCount, diagnosticEntries, includeDiagnostics]);

  const openMailto = useCallback(async () => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      "Zgłoszenie błędu - Learning App"
    )}&body=${encodeURIComponent(emailBody)}`;
    try {
      await Linking.openURL(url);
      setStatus("Otworzyłem mailto:. Dopisz opis i wyślij wiadomość.");
    } catch (error) {
      console.warn("[Support] mailto failed", error);
      setStatus(
        "Nie udało się otworzyć klienta poczty. Skopiuj dane ręcznie i wyślij własnoręcznie."
      );
    }
  }, [emailBody]);

  const handleSendEmail = useCallback(async () => {
    setBusy(true);
    setStatus(null);

    try {
      const available = await MailComposer.isAvailableAsync();
      if (available) {
        const result = await MailComposer.composeAsync({
          recipients: [SUPPORT_EMAIL],
          subject: "Zgłoszenie błędu - Learning App",
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

      await openMailto();
    } catch (error) {
      console.warn("[Support] send email failed", error);
      setStatus(
        "Nie udało się otworzyć composer-a. Spróbuj ponownie lub użyj mailto."
      );
      await openMailto();
    } finally {
      setBusy(false);
    }
  }, [emailBody, openMailto]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.header}>Zgłoś problem</Text>
          <Text style={styles.subtitle}>
            Otworzymy Twoją domyślną aplikację poczty z uzupełnionym tematem i
            danymi technicznymi. Dodaj opis i wyślij.
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
            <View style={{ flex: 1 }}>
              <Text style={styles.panelTitle}>Czy chcesz dodać dane techniczne?</Text>
              <Text style={styles.panelSubtitle}>
                Wybierz, jakie informacje mają trafić do raportu.
              </Text>
            </View>
            <View style={styles.switchPill}>
              <Text style={styles.switchLabel}>Dane techniczne</Text>
              <Switch
                value={includeDiagnostics}
                onValueChange={setIncludeDiagnostics}
                accessibilityLabel="Dołącz dane techniczne do zgłoszenia"
              />
            </View>
          </View>

          <View style={styles.panelBody}>
            <View style={styles.sectionTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionName}>
                  Dołączyć dane techniczne do raportu?
                </Text>
                <Text style={styles.sectionHint}>
                  Wersja aplikacji, platforma, model urządzenia i kontekst
                  sesji. Wybierz, co chcesz przesłać.
                </Text>
              </View>
            </View>

            <View style={styles.chips}>
              {diagnosticEntries.map((entry) => {
                const checked = selectedFields[entry.key];
                return (
                  <Pressable
                    key={entry.key}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked, disabled: !includeDiagnostics }}
                    accessibilityLabel={entry.label}
                    onPress={() => toggleField(entry.key)}
                    style={[
                      styles.chip,
                      checked ? styles.chipChecked : styles.chipUnchecked,
                      !includeDiagnostics && styles.chipDisabled,
                    ]}
                  >
                    <View style={styles.chipBox}>
                      {checked ? <View style={styles.chipCheck} /> : null}
                    </View>
                    <Text style={styles.chipText}>{entry.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.footer} accessibilityLabel="Podsumowanie wyboru">
              <View style={styles.footerLeft}>
                <Text style={styles.footerTitle}>Podsumowanie</Text>
                <Text style={styles.footerSummary}>{summaryText}</Text>
              </View>
              <Pressable
                style={[
                  styles.footerButton,
                  !includeDiagnostics && styles.chipDisabled,
                ]}
                onPress={toggleAllFields}
                accessibilityRole="button"
                accessibilityLabel={
                  checkedCount === diagnosticEntries.length
                    ? "Odznacz wszystko"
                    : "Zaznacz wszystko"
                }
              >
                <Text style={styles.footerButtonText}>
                  {checkedCount === diagnosticEntries.length
                    ? "Odznacz wszystko"
                    : "Zaznacz wszystko"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.header}>Potrzebujesz FAQ?</Text>
          <Text style={styles.subtitle}>
            Zanim wyślesz zgłoszenie, możesz sprawdzić odpowiedzi na
            najczęstsze pytania.
          </Text>
          <Link href="/wiki" asChild>
            <MyButton text="Otwórz wiki" color="my_green" width={140} />
          </Link>
        </View>
      </ScrollView>
    </View>
  );
}
