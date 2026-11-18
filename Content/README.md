# Paczki obrazów i audio

Audio pozostaje w `Audio/`: jedna paczka na język. Obrazy należą do zestawu,
np. `images_birds`, współdzielonego między dowolną liczbą kursów i języków.
Pierwszy zestaw to obecne zdjęcia ptaków, bez zmiany jakości.

## Dodanie zestawu

1. Dodaj pliki źródłowe, np. `assets/learning/flashcards/leaves/`.
2. Dodaj `Content/packs/images/leaves.json`:

```json
{
  "id": "images_leaves",
  "titleKey": "contentDownload.leaves",
  "files": {
    "oak.webp": "assets/learning/flashcards/leaves/oak.webp"
  }
}
```

3. Dodaj tłumaczenia `contentDownload.leaves`. W definicjach oficjalnych kursów
   (`src/constants/officialPacks.ts`) ustaw `requiredImagePacks: ["images_leaves"]`.
   Te same zależności przypisz każdej wersji językowej. Jeden kurs może wymagać
   kilku paczek. Nie dodawaj mapy `require()` dla zasobów przeniesionych do PAD.
4. W CSV użyj identyfikatora `oak.webp` albo `asset://images_leaves/oak.webp`.
   Generator bazy zapisuje stabilną referencję `asset://…`.
   Przy zmianie istniejącego kursu zwiększ jego `packVersion` w obu obecnych
   manifestach kursów (runtime oraz generator bazy).
5. Uruchom:

```bash
npm run content:check
npm run content:prepare -- --android
npm run db:prebuild
```

Generator przygotowuje katalog runtime, zapasową mapę dołączonych obrazów,
manifesty PAD i moduły Gradle. Przed ponownym bundlowaniem Android odtwarza
wygenerowany katalog zasobów Metro, aby usunąć stare kopie zdjęć z modułu bazowego. Nie edytuj wygenerowanych plików. Plugin Expo
korzysta z tego samego generatora podczas prebuild. Polecenia `audio:*` pozostają
obsługiwane; `audio:prepare -- --android` zachowuje także paczki obrazów.

## Warianty aplikacji

Metro wybiera mapę obrazów podczas budowania grafu zależności:

- Android release: PAD, bez zapasowych `require()` zdjęć w bazowym APK.
- Android development, Expo Go, iOS, web: zdjęcia w aplikacji.
- W development panel przy kursie jest widoczny także z dołączonymi zdjęciami;
  przycisk symuluje postęp bez transferu PAD. Sesja używa rzeczywistych dołączonych zdjęć.
- `CONTENT_IMAGES_DELIVERY=pad`: wymuszenie PAD dla testowego buildu Androida.
- `CONTENT_IMAGES_DELIVERY=bundled`: wymuszenie dołączonych zdjęć na Androidzie.

Przy zmianie wariantu uruchom ponownie Metro. Produkcyjny wariant PAD wymaga
nowego natywnego buildu; nie wysyłaj katalogu zasobów przez OTA do starszej wersji.
Zwiększ versionCode przed publikacją w Google Play.

## Działanie

Panel przy wybranym kursie i w ustawieniach wyglądu pochodzi z dawnego panelu
audio na kurs. Pobieranie jest ręczne. Wspólny stan i transfer są kluczowane nazwą
paczki. Anulowanie zatrzymuje transfer również dla innych korzystających kursów.
Nauka i powtórki nie montują sesji przed sprawdzeniem wymaganych zdjęć. Po pobraniu
użytkownik naciska „Rozpocznij”. Bez wymaganych paczek kurs można wybrać i ustawić.

Baza zapisuje identyfikatory obrazów, nigdy ścieżki PAD. Wszystkie powierzchnie
wyświetlania rozwiązują je do bieżącego URI. Po powrocie z tła i zmianie stanu
paczki cache jest unieważniany. Dotychczasowy synchronizator oficjalnych fiszek
migruje obrazy według kursu i external_id; pomija is_user_edited i nie resetuje
postępów przy zmianie samego obrazu. Stare kopie plików pozostają na urządzeniu.

## Sprawdzanie

```bash
node Content/tools/catalog.test.cjs
npx jest Content/runtime/__tests__ --runInBand
npm run content:verify:aab -- /path/to/app-release.aab
```

Weryfikator sprawdza również audio, manifesty, sumy kontrolne zdjęć i ich brak
w module bazowym/innych paczkach. Test rzeczywistego transferu i aktualizacji
wymaga urządzenia z wersją dostarczoną przez Google Play lub bundletool local testing.
Menedżer usuwania paczek i migracja pozostałych obrazów poza pierwszym etapem.
