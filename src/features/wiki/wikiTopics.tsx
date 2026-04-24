import React from "react";
import { View, Text, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import BoxSkin from "@/src/components/Box/Skin/BoxSkin";
import MyButton from "@/src/components/button/button";
import Card from "@/src/components/card/card";
import { CardHint } from "@/src/components/card/subcomponents/CardHint";
import { CourseListCard } from "@/src/components/course/CourseListCard";
import type {
  ManualCard,
  ManualCardType,
} from "@/src/hooks/useManualCardsForm";
import { ManualCardsEditor } from "@/src/components/courseEditor/editFlashcards/editFlashcards";
import type { ManualCardsEditorStyles } from "@/src/components/courseEditor/editFlashcards/editFlashcards";
import { CourseIconColorSelector } from "@/src/components/courseEditor/iconEdit/iconEdit";
import { CourseSettingsSection } from "@/src/components/courseEditor/SettingsCourse";
import { useCourseEditStyles } from "@/src/screens/courses/editcourse/CourseEditScreen/CourseEditScreen-styles";
import { CardTypeSelector } from "@/src/components/courseEditor/CardTypeSelector";
import { CsvImportGuide } from "@/src/components/courseEditor/CsvImportGuide";
import type { WordWithTranslations } from "@/src/types/boxes";
import { useSettings } from "@/src/contexts/SettingsContext";
import { ThemeColors } from "@/src/theme/theme";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Octicons from "@expo/vector-icons/Octicons";

const SAMPLE_WORD: WordWithTranslations = {
  id: 1,
  text: "apple",
  translations: ["jabłko"],
  flipped: false,
  // hintFront: "czerwone i rośnie na drzewie",
  // hintBack: "czerwone i rośnie na drzewie",
};

const SAMPLE_COURSES = [
  {
    id: 1,
    name: "Hiszpański start",
    cardsCount: 120,
    iconId: "book",
    iconColor: "#F4B942",
    flagCode: "es",
  },
  {
    id: 2,
    name: "ANG B1",
    cardsCount: 95,
    iconId: "globe",
    iconColor: "#2AA845",
    flagCode: "en",
  },
  {
    id: 3,
    name: "Francuski podstawy",
    cardsCount: 60,
    iconId: "heart",
    iconColor: "#FF7AA2",
    flagCode: "fr",
  },
];

const SAMPLE_ACTIVATE_COURSES = SAMPLE_COURSES.map((course, index) => ({
  ...course,
  isHighlighted: index === 1,
}));

const SAMPLE_PIN_COURSES = SAMPLE_COURSES.map((course, index) => ({
  ...course,
  isPinned: index === 1,
}));

const handlePlaceholderCoursePress = () => {};
const handlePlaceholderEditCourse = () => {};
const handlePlaceholderPinToggle = () => {};
const noop = () => {};

const SAMPLE_MANUAL_CARD: ManualCard = {
  id: "wiki-card-1",
  front: "Bonjour",
  answers: ["Dzień dobry", "Cześć"],
  flipped: false,
  type: "text",
  answerOnly: false,
  hintFront: "",
  hintBack: "",
  imageFront: null,
  imageBack: null,
  explanation: null,
};

function CourseAppearancePreview() {
  return (
    <CourseIconColorSelector
      courseName="Francuski w podróży"
      onCourseNameChange={noop}
      selectedIcon="book"
      selectedColor="#F4B942"
      selectedColorId="amber"
      onIconChange={noop}
      onColorChange={noop}
      previewName="Francuski w podróży"
      nameSectionDescription="Nazwa pojawia się na liście kursów i pomaga szybko znaleźć właściwy zestaw."
      iconSectionDescription="To ten symbol widzisz później przy kursie na liście i w podglądzie."
      colorSectionDescription="Kolor jest akcentem kursu i pomaga odróżnić go od innych."
      disabled
    />
  );
}

function ManualCardLockPreview() {
  return (
    <ManualCardsEditor
      manualCards={[SAMPLE_MANUAL_CARD]}
      styles={{} as ManualCardsEditorStyles}
      onCardFrontChange={noop}
      onCardAnswerChange={noop}
      onAddAnswer={noop}
      onRemoveAnswer={noop}
      onAddCard={noop}
      onRemoveCard={noop}
      onToggleFlipped={noop}
      showDefaultBottomAddButton={false}
    />
  );
}

function CardTypePreview({
  value = "text",
}: {
  value?: ManualCardType;
}) {
  return (
    <CardTypeSelector
      label="Typ nowej fiszki"
      value={value}
      onChange={noop}
      options={[
        { key: "text", label: "Tekstowa" },
        { key: "true_false", label: "Prawda / Fałsz" },
        { key: "know_dont_know", label: "Umiem / Nie umiem" },
      ]}
    />
  );
}

function CsvImportGuidePreview() {
  return (
    <CsvImportGuide
      onPickCsvFile={noop}
      onPickTxtFile={noop}
      onDownloadTemplate={noop}
      selectedFileName="francuski-podroze.csv"
      isAnalyzing={false}
    />
  );
}

function CourseSettingsPreview() {
  const styles = useCourseEditStyles();
  const { colors } = useSettings();

  return (
    <CourseSettingsSection
      styles={styles}
      colors={colors}
      switchColors={{
        thumb: "#FFFFFF",
        trackFalse: "#CBD5E1",
        trackTrue: "#4ADE80",
      }}
      boxZeroEnabled
      onToggleBoxZero={noop}
      autoflowEnabled
      onToggleAutoflow={noop}
      reviewsEnabled
      onToggleReviews={noop}
      showExplanationEnabled
      onToggleShowExplanation={noop}
      explanationOnlyOnWrong={false}
      onToggleExplanationOnlyOnWrong={noop}
      skipCorrectionEnabled={false}
      onToggleSkipCorrection={noop}
      trueFalseButtonsVariant="true_false"
      onSelectTrueFalseButtonsVariant={noop}
      showTrueFalseButtonsVariant
      cardSize="large"
      onSelectCardSize={noop}
      showImageSizeOptions
      imageSize="medium"
      imageSizeOptions={["dynamic", "small", "medium", "large", "very_large"]}
      onSelectImageSize={noop}
      imageSizeEnabled
      showImageFrameOption
      imageFrameEnabled
      onToggleImageFrame={noop}
    />
  );
}

function CardPreview({
  mode,
  backgroundColorOverride,
  textColorOverride,
}: {
  mode: "default" | "correction";
  backgroundColorOverride?: string;
  textColorOverride?: string;
}) {
  const [answer, setAnswer] = React.useState("");
  const [result, setResult] = React.useState<boolean | null>(
    mode === "correction" ? false : null,
  );
  const [correction, setCorrection] = React.useState<{
    awers: string;
    rewers: string;
    input1: string;
    input2?: string;
    mode?: "demote" | "intro";
    cardId?: number;
  } | null>(
    mode === "correction"
      ? {
          awers: SAMPLE_WORD.text,
          rewers: SAMPLE_WORD.translations[0],
          input1: "",
          mode: "demote",
          cardId: SAMPLE_WORD.id,
        }
      : null,
  );

  const confirm = React.useCallback(() => {
    setResult(true);
  }, []);

  const wrongInputChange = React.useCallback((which: 1 | 2, value: string) => {
    setCorrection((prev) => {
      if (!prev) return prev;
      if (which === 1) return { ...prev, input1: value };
      return { ...prev, input2: value };
    });
  }, []);

  const setCorrectionRewers = React.useCallback(() => {}, []);
  const handleHintUpdate = React.useCallback(() => {}, []);

  return (
    <View style={{ alignItems: "center" }}>
      <Card
        selectedItem={SAMPLE_WORD}
        setAnswer={setAnswer}
        answer={answer}
        result={result}
        confirm={confirm}
        reversed={false}
        setResult={setResult}
        correction={correction}
        wrongInputChange={wrongInputChange}
        setCorrectionRewers={setCorrectionRewers}
        introMode={false}
        onHintUpdate={handleHintUpdate}
        isFocused
        backgroundColorOverride={backgroundColorOverride}
        textColorOverride={textColorOverride}
      />
    </View>
  );
}

function HintDotsPreview() {
  return (
    <View style={{ alignItems: "center" }}>
      <CardHint
        currentHint={null}
        isEditingHint={false}
        hintDraft=""
        setHintDraft={() => {}}
        startHintEditing={() => {}}
        cancelHintEditing={() => {}}
        finishHintEditing={() => {}}
        deleteHint={() => {}}
        hintActionsStyle={{}}
        shouldMarqueeHint={false}
        selectedItem={{ id: SAMPLE_WORD.id }}
        onHintUpdate={() => {}}
        onHintInputBlur={() => {}}
      />
    </View>
  );
}

export type BlockTone = "pink" | "green" | "yellow";

export type WikiBlock =
  | { type: "heading"; text: string; icon?: string; tone?: BlockTone }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[]; tone?: BlockTone }
  | { type: "callout"; text: string; tone?: BlockTone }
  | {
      type: "example";
      label?: string;
      render: (colors: ThemeColors) => React.ReactNode;
      tone?: BlockTone;
    };

type WikiTopic = {
  title: string;
  subtitle: string;
  blocks: WikiBlock[];
};

export const WIKI_TOPICS: WikiTopic[] = [
  // {
  //   title: "Intro",
  //   subtitle: "O czym jest ta apka",
  //   blocks: [
  //     { type: "heading", icon: "🎯", text: "Jak to działa?", tone: "pink" },
  //     {
  //       type: "paragraph",
  //       text: "Używamy zmodyfikowanego systemu Leitnera.",
  //     },
  //     {
  //       type: "list",
  //       items: [
  //         "Trudne słówka wracają częściej",
  //         "Opanowane pojawiają się rzadziej",
  //       ],
  //       tone: "pink",
  //     },
  //     { type: "heading", icon: "💡", text: "Dlaczego warto?", tone: "green" },
  //     {
  //       type: "paragraph",
  //       text: "Ta apka powstała, bo chciałem mieć coś prostego, działającego offline i nie szpiegującego mnie.",
  //     },
  //     {
  //       type: "paragraph",
  //       text: "Żadnych kont, żadnego wysyłania danych – wszystko zostaje na Twoim telefonie.",
  //     },
  //     {
  //       type: "paragraph",
  //       text: "Tworzona w 100% przeze mnie, dla Ciebie. Offline, prywatna, bez zbędnych fajerwerków. Po prostu działa. I tyle. 🚀",
  //     },
  //   ],
  // },
  {
    title: "Przypinanie kursu",
    subtitle: "Jak przypiąć kurs",
    blocks: [
      {
        type: "paragraph",
        text: "Ekran przypinania to Twój osobisty selektor",
      },
      {
        type: "heading",
        icon: "📌",
        text: "Co tu robisz?",
        tone: "pink",
      },
      {
        type: "list",
        items: [
          "Przeglądasz wszystkie kursy i wybierasz te, które Cię teraz interesują",
          "Masz kilka tematów na raz? Przypnij je i miej pod ręką",
          "Przypięte kursy lądują na kolejnym ekranie, tym do aktywacji",
        ],
        tone: "pink",
      },
      {
        type: "example",
        tone: "green",
        render: (colors) => (
          <View style={{ gap: 12 }}>
            {SAMPLE_PIN_COURSES.map((course) => (
              <CourseListCard
                key={course.id}
                title={course.name}
                subtitle={`fiszki: ${course.cardsCount}`}
                iconId={course.iconId}
                iconColor={course.iconColor}
                flagCode={course.flagCode}
                containerStyle={{ backgroundColor: colors.background }}
                onPress={() => handlePlaceholderPinToggle()}
                rightAccessory={
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      course.isPinned
                        ? `Odepnij zestaw ${course.name} `
                        : `Przypnij zestaw ${course.name} `
                    }
                    style={{ padding: 6 }}
                    onPress={(event) => {
                      event.stopPropagation();
                      handlePlaceholderPinToggle();
                    }}
                  >
                    <View
                      style={[
                        {
                          width: 32,
                          height: 32,
                          borderRadius: 10,
                          borderWidth: 2,
                          borderColor: course.isPinned
                            ? colors.my_green
                            : colors.border,
                          backgroundColor: colors.background,
                          alignItems: "center",
                          justifyContent: "center",
                        },
                      ]}
                    >
                      {course.isPinned ? (
                        <Octicons
                          name="pin"
                          size={20}
                          color={colors.headline}
                        />
                      ) : null}
                    </View>
                  </Pressable>
                }
              />
            ))}
          </View>
        ),
      },
      {
        type: "callout",
        text: "Nie przesadzaj z liczbą przypiętych kursów - im mniej, tym łatwiej się skupić. Możesz je zmienić w każdej chwili.",
        tone: "pink",
      },
    ],
  },
  {
    title: "Aktywacja kursu",
    subtitle: "Jak aktywować kurs",
    blocks: [
      {
        type: "paragraph",
        text: "Tutaj widzisz kursy, które przypiąłeś/przypiełaś na poprzednim ekranie. To Twoja robocza lista.",
      },
      { type: "heading", icon: "✅", text: "Jak to działa?", tone: "green" },
      {
        type: "list",
        items: [
          "Kliknij na kurs, żeby go aktywować",
          "Aktywny kurs = jego fiszki pojawią się w grze",
          "Możesz mieć aktywny tylko jeden kurs naraz",
        ],
        tone: "green",
      },
      {
        type: "example",
        tone: "green",
        render: (colors) => (
          <View style={{ gap: 12 }}>
            {SAMPLE_ACTIVATE_COURSES.map((course) => (
              <CourseListCard
                key={course.id}
                title={course.name}
                subtitle={`fiszki: ${course.cardsCount}`}
                iconId={course.iconId}
                iconColor={course.iconColor}
                flagCode={course.flagCode}
                isHighlighted={course.isHighlighted}
                containerStyle={{ backgroundColor: colors.background }}
                onPress={() => handlePlaceholderCoursePress()}
                rightAccessory={
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Edytuj kurs ${course.name}`}
                    style={{ padding: 6 }}
                    onPress={(event) => {
                      event.stopPropagation();
                      handlePlaceholderEditCourse();
                    }}
                    hitSlop={8}
                  >
                    <FontAwesome6
                      name="edit"
                      size={24}
                      color={colors.headline}
                    />
                  </Pressable>
                }
              />
            ))}
          </View>
        ),
      },
      {
        type: "callout",
        text: "Kliknęcie w ikonkę obok kursu otwiera ustawienia. Znajdują sie tam ustawienia które będą miały wpływ tylko na ten kurs.",
        tone: "green",
      },
    ],
  },
  {
    title: "Ustawienia",
    subtitle: "Dostosuj pod siebie",
    blocks: [
      {
        type: "paragraph",
        text: "W aplikacji są dwa rodzaje ustawień: globalne (dla całej apki) oraz kursu (osobno dla każdego kursu).",
      },
      {
        type: "heading",
        icon: "🎛️",
        text: "Ustawienia aplikacji (globalne)",
        tone: "pink",
      },
      {
        type: "paragraph",
        text: "Dotyczą całej aplikacji, (prawy dolny róg na pasku).",
      },
      {
        type: "example",
        tone: "pink",
        render: (colors) => (
          <View
            style={{
              width: "100%",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Ionicons name="settings-sharp" size={22} color={colors.headline} />
            </View>
          </View>
        ),
      },
      {
        type: "list",
        tone: "pink",
        items: [
        ],
      },
      { type: "heading", icon: "⚙️", text: "Ustawienia kursu", tone: "green" },
      {
        type: "paragraph",
        text: "Są to idiwudualne ustawienia dla kazdego kursu.",
      },
      {
        type: "example",
        label: "Na ekranie aktywacji kursu: ",
        tone: "green",
        render: (colors) => (
          <CourseListCard
            title="Hangul - czytanie"
            subtitle="fiszki: 120"
            iconId="book"
            iconColor="#F4B942"
            flagCode="kr"
            containerStyle={{ backgroundColor: colors.background }}
            onPress={() => handlePlaceholderCoursePress()}
            rightAccessory={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ustawienia kursu Hangul - czytanie"
                style={{ padding: 6 }}
                onPress={(event) => {
                  event.stopPropagation();
                  handlePlaceholderEditCourse();
                }}
                hitSlop={8}
              >
                <FontAwesome6 name="edit" size={24} color={colors.headline} />
              </Pressable>
            }
          />
        ),
      },
      {
        type: "example",
        label: "Klikasz tą ikone: ",
        tone: "green",
        render: (colors) => (
          <View style={{ alignItems: "center" }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <FontAwesome6 name="edit" size={24} color={colors.headline} />
            </View>
          </View>
        ),
      },
    ],
  },
  {
    title: "Fiszki",
    subtitle: "Jak działa gra?",
    blocks: [

      // 1) Szybki start (użytkownik ma od razu ruszyć)
      { type: "heading", icon: "⚡", text: "Szybki start", tone: "green" },
      {
        type: "list",
        tone: "green",
        items: [
          "Upewnij się, że masz przypięty i aktywny kurs.",
          "Kliknij „Dodaj fiszki”, aby wrzucić 10 kart do pudełka 1.",
          "Kliknij pudełko 1, aby je aktywować (pojawi się zielona kreska).",
          "Odpowiadaj na karcie i zatwierdzaj odpowiedzi.",
          "Gdy skończą się karty, dodaj kolejne „Dodaj fiszki”.",
        ],
      },

      // {
      //   type: "example",
      //   tone: "yellow",
      //   render: (colors) => (
      //     <Text
      //       style={{
      //         fontSize: 15,
      //         lineHeight: 22,
      //         color: colors.paragraph,
      //         fontStyle: "italic",
      //       }}
      //     >
      //       Jeśli nie masz jeszcze aktywnego kursu, przypnij go i aktywuj w
      //       sekcji kursów.
      //     </Text>
      //   ),
      // },

      // 2) Interfejs: co oznacza co
      {
        type: "heading",
        icon: "🧭",
        text: "Co widzisz na ekranie",
        tone: "pink",
      },
      {
        type: "list",
        tone: "pink",
        items: [
          "Pudełka: przechowują fiszki, ich liczba jest wyświetlana pod danym pudełkiem.",
          "Aktywne pudełko: ma pod spodem zieloną kreskę i to z niego losuje się fiszka.",
          "Karta: u góry masz pytanie, na dole wpisujesz odpowiedź.",
          "Przyciski pod kartą: „Dodaj fiszki” dorzuca nowe karty, „Zatwierdź” sprawdza odpowiedź.",
          "Tryb poprawki: pojawia się po błędnej odpowiedzi i prosi o wpisanie poprawnej wersji.",
        ],
      },

      {
        type: "example",
        tone: "yellow",
        render: (colors) => (
          <View style={{ alignItems: "center", gap: 12 }}>
            <View style={{ flexDirection: "row", gap: 15 }}>
              <MyButton text="Dodaj fiszki" color="my_yellow" />
              <MyButton text="Zatwierdź" color="my_green" />
            </View>
            <Text
              style={{
                fontSize: 14,
                color: colors.paragraph,
                textAlign: "center",
              }}
            >
              Przyciski pod kartą: dodawanie nowych fiszek i zatwierdzanie
              odpowiedzi.
            </Text>
          </View>
        ),
      },

      {
        type: "paragraph",
        text: "Czasem pudełko 1 ma już 10 fiszek na starcie. To efekt automatu (opis znajdziesz w ustawieniach).",
      },

      {
        type: "example",
        render: (colors) => (
          <View style={{ alignItems: "center", gap: 10 }}>
            <Pressable
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: colors.my_yellow,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="add" size={26} color="#0F172A" />
            </Pressable>
            <Text
              style={{
                fontSize: 14,
                color: colors.paragraph,
                textAlign: "center",
              }}
            >
              Mniejszy przycisk Dodaj fiszki który wystepuje w trybie prawda / fałsz
            </Text>
          </View>
        ),
      },

      // 3) Zasady systemu (krótko, bez rozwlekania)
      { type: "heading", icon: "📦", text: "Zasady", tone: "pink" },
      {
        type: "list",
        tone: "pink",
        items: [
          "Nowa fiszka startuje w pudełku numer jeden.",
          "Poprawna odpowiedź przesuwa fiszkę do kolejnego pudełka.",
          "Błędna odpowiedź cofa fiszkę do pudełka numer jeden.",
          "Nauka kończy się kiedy porpawnie wpiszesz odpowiedź w pudełku numer pięć.",
        ],
      },

      // 4) Krok po kroku (pełna wersja)
      {
        type: "heading",
        icon: "🎮",
        text: "Jak grać, krok po kroku",
        tone: "green",
      },

      {
        type: "paragraph",
        text: "1) Kliknij „Dodaj fiszki”. Do pudełka numer jeden wpadnie 10 nowych kart.",
      },
      {
        type: "paragraph",
        text: "2) Kliknij pierwsze pudełko aby je aktywować. Aktywne pudełko ma zieloną kreskę pod spodem.",
      },
      {
        type: "example",
        tone: "green",
        render: (colors) => (
          <View style={{ gap: 10, alignItems: "center" }}>
            <BoxSkin wordCount={12} face="happy" isActive />
            <Text
              style={{
                fontSize: 14,
                lineHeight: 20,
                color: colors.paragraph,
                textAlign: "center",
              }}
            >
              Aktywne pudełko losuje fiszki do karty. Przytrzymaj palec na pudełku, aby
              podejrzeć jego zawartość.
            </Text>
          </View>
        ),
      },

      {
        type: "paragraph",
        text: "3) Na karcie pojawi się wylosowana fiszka. Wpisz odpowiedź i kliknij „Zatwierdź”.",
      },
      {
        type: "example",
        tone: "yellow",
        render: (colors) => (
          <CardPreview
            mode="default"
            backgroundColorOverride={
              ["#001534", "#000000"].includes(
                colors.background.toLowerCase?.() ?? colors.background,
              )
                ? colors.lightbg
                : "#f2f4f6"
            }
            textColorOverride={colors.font}
          />
        ),
      },

      {
        type: "paragraph",
        text: "4) Jeśli odpowiedź jest poprawna, fiszka przechodzi do pudełka 2. Jeśli jest błędna, przechodzisz do trybu poprawki.",
      },
      {
        type: "example",
        tone: "pink",
        render: (colors) => (
          <CardPreview
            mode="correction"
            backgroundColorOverride={colors.my_red}
          />
        ),
      },

      {
        type: "paragraph",
        text: "5) W trybie poprawki przepisz poprawną odpowiedź dokładnie tak, jak jest pokazana. Po poprawieniu losuje się kolejna fiszka.",
      },

      {
        type: "paragraph",
        text: "6) Gdy skończą się fiszki, kliknij „Dodaj fiszki” i kontynuuj.",
      },


      {
        type: "paragraph",
        text: "7) Jeśli jakaś fiszka nie chce wejść do głowy, nad kartą kliknij przycisk: ",
      },
      {
        type: "example",
        tone: "yellow",
        render: (colors) => (
          <View style={{ gap: 8 }}>
            <HintDotsPreview />
            <Text
              style={{
                fontSize: 14,
                lineHeight: 20,
                color: colors.paragraph,
                textAlign: "center",
              }}
            >
              Możesz dodać krótkie skojarzenie lub wskazówkę widoczną przy tej fiszce w trakcie nauki.
            </Text>
          </View>
        ),
      },
      // 5) Praktyczne wskazówki
      { type: "heading", icon: "🧠", text: "Wskazówki", tone: "yellow" },
      {
        type: "list",
        tone: "yellow",
        items: [
          "W pudełku 1 zwykle dobrze działa 10–15 fiszek, ale warto sprawdzić, co pasuje Tobie.",
          "Przerwy są częścią nauki. Żeby zapamiętać, mózg potrzebuje odstępów między powtórkami.",
        ],
      },

    ],
  },

  {
    title: "Tworzenie kursu",
    subtitle: "Jak stworzyć własny kurs",
    blocks: [
      {
        type: "paragraph",
        text: "Kreator własnego kursu ma teraz trzy etapy: najpierw wygląd, potem treść, a na końcu ustawienia. Dzięki temu najpierw nadajesz kursowi tożsamość, później dodajesz fiszki, a dopiero na końcu decydujesz, jak kurs ma działać w nauce.",
      },
      {
        type: "heading",
        icon: "1",
        text: "Etap 1. Wygląd kursu",
        tone: "green",
      },
      {
        type: "paragraph",
        text: "Na pierwszym ekranie ustawiasz nazwę, ikonę i kolor. Nazwa jest obowiązkowa, bo to ona pojawi się później na liście kursów. Ikona pomaga rozpoznać kurs jednym spojrzeniem, a kolor działa jako jego akcent wizualny.",
      },
      {
        type: "list",
        items: [
          "Pole nazwy kursu jest wymagane, więc bez niego nie przejdziesz dalej.",
          "Ikona będzie widoczna przy kursie na listach, w aktywacji i podczas edycji.",
          "Kolor nie zmienia treści fiszek, ale pomaga szybko odróżnić kurs od innych.",
          "Strzałka wstecz cofa Cię do poprzedniego ekranu, a przycisk „dalej” prowadzi do etapu dodawania treści.",
        ],
        tone: "green",
      },
      {
        type: "example",
        tone: "green",
        render: () => <CourseAppearancePreview />,
      },
      {
        type: "heading",
        icon: "2",
        text: "Etap 2. Treść i import",
        tone: "pink",
      },
      {
        type: "paragraph",
        text: "Drugi etap służy do wypełnienia kursu fiszkami. Możesz robić to ręcznie albo przez import pliku. To tutaj decydujesz też, jaki typ ma nowo dodawana karta.",
      },
      {
        type: "list",
        tone: "pink",
        items: [
          "Tryb „ręcznie” pozwala wpisywać awers i odpowiedzi od razu w edytorze.",
          "Tryb „CSV” lub import tekstu otwiera przewodnik i pozwala wczytać większą paczkę kart naraz.",
          "Selektor typu karty określa format nowo dodawanych fiszek: tekstowa, Prawda / Fałsz albo Umiem / Nie umiem.",
          "Po imporcie aplikacja analizuje plik i pokazuje, ile wierszy da się wczytać, a które trzeba poprawić.",
        ],
      },
      {
        type: "paragraph",
        text: "Kłódka przy polu „Awers” steruje kierunkiem danej fiszki. Gdy ją przełączysz, karta zostaje odwrócona i zmienia się to, z której strony pytasz, a z której odpowiadasz.",
      },
      {
        type: "example",
        tone: "pink",
        render: () => <ManualCardLockPreview />,
      },
      {
        type: "example",
        tone: "pink",
        render: () => <CardTypePreview />,
      },
      {
        type: "example",
        tone: "pink",
        render: () => <CsvImportGuidePreview />,
      },
      {
        type: "callout",
        text: "Import nie zapisuje pliku w ciemno. Najpierw dostajesz analizę z ostrzeżeniami i błędami, więc łatwo sprawdzisz, co rzeczywiście trafi do kursu.",
        tone: "pink",
      },
      {
        type: "heading",
        icon: "3",
        text: "Etap 3. Ustawienia kursu",
        tone: "green",
      },
      {
        type: "paragraph",
        text: "Na końcu ustawiasz, jak kurs ma zachowywać się podczas nauki. To nie jest kosmetyka: te przełączniki wpływają na tempo dodawania fiszek, tryb powtórek i sposób prezentacji kart.",
      },
      {
        type: "list",
        tone: "green",
        items: [
          "Faza zapoznania (Pudełko 0) dodaje łagodniejszy etap wejściowy przed zwykłą nauką.",
          "Automat fiszek sam przełącza pudełka i dobiera nowe słowa, żeby nauka szła płynniej.",
          "Włącz powtórki dodaje karty z tego kursu do codziennych sesji powtórkowych.",
          "Pomiń poprawkę po błędzie od razu przechodzi do kolejnej fiszki po złej odpowiedzi tekstowej.",
          "Rozmiar fiszki decyduje, czy karta ma być duża i pokazywać cały tekst, czy mniejsza i bardziej zwarta.",
          "Rozmiar obrazu oraz Ramka obrazu wpływają na wygląd kart z grafikami.",
        ],
      },
      {
        type: "example",
        tone: "green",
        render: () => <CourseSettingsPreview />,
      },
      {
        type: "callout",
        text: "Dobry start to mały kurs z 20-30 fiszkami. Najłatwiej wtedy zobaczyć, jak działają ustawienia i które z nich naprawdę pasują do Twojego stylu nauki.",
        tone: "green",
      },
    ],
  },
  {
    title: "Powtórki",
    subtitle: "Jak robić powtórki",
    blocks: [
      {
        type: "callout",
        text: "Wkrótce. 🚧",
        tone: "pink",
      },
    ],
  },
];
