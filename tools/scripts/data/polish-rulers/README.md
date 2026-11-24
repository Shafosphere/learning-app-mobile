# Materiały do kursów Władcy Polski

Źródłem treści jest `tools/wladcy_polski.csv`. Generator zachowuje źródłowe ID,
aliasy, kolejność pierwszego objęcia władzy i pełny zapis lat panowania.
Dla wielu okresów panowania średniki zachowują osobne warianty, a pole
`explanation` podaje pełne lata panowania połączone słowem „oraz”.
Przy jednym okresie wyjaśnienie pozostaje puste.
Kurs samych dat obejmuje wyłącznie 29 rekordów oznaczonych
`fiszka_dat_panowania_bez_uwag=True`.

## Odtwarzanie

```bash
npm run assets:polish-rulers -- --offline
npm run assets:attributions
npm run content:check
npm run content:prepare -- --android
npm run db:prebuild
```

Tryb offline wymaga zapisanych miniaturek źródłowych w
`assets/learning/flashcards/polish-rulers/source/`. Obrazy pozostają lokalne,
zgodnie z `.gitignore` tego projektu. Końcowe pliki WebP znajdują się katalog wyżej.
Do paczki PAD trafia tylko 48 końcowych obrazów, bez źródeł.

`npm run assets:polish-rulers -- --fetch-only` pobiera metadane Commons i brakujące
miniaturki do kontroli. Domyślne uruchomienie wykonuje też generowanie kursów.
Commons ogranicza pobieranie oryginałów, dlatego używana jest usługa miniatur
960 px. Końcowy rozmiar jest ograniczony także wymiarami oryginalnego obrazu
lub jego kadru: generator nie powiększa małych reprodukcji.

## Kontrola źródeł

- `commons-metadata.json` zawiera metadane API, szablony prawne, opis pliku,
  wikitext, wymiary i SHA-1 wersji obrazu. Treść kursów pochodzi z CSV,
  nie z opisów Commons.
- `image-reviews.json` zapisuje wynik kontroli każdej postaci, autorstwo,
  datę kontroli oraz opcjonalny kadr w pikselach oryginalnego pliku Commons.
  Zmiana tytułu lub SHA-1 źródła wymaga ponownej kontroli przed generowaniem.
- `sources.json` dokumentuje zamiany plików wskazanych w CSV. Portret
  Sobieskiego zastąpiono kolorową reprodukcją według Matejki bez napisu
  przechodzącego przez portret. W atrybucji uwzględniono także kolorystów.
- Commons potwierdza domenę publiczną wszystkich 48 wykorzystanych obrazów.
  Dla stron bez pola Artist autora ustalono z wikitextu lub kategorii pocztu.
  Autor ryciny Henryka IV Probusa to Bartłomiej Strachowski, wbrew
  niepełnej informacji w źródłowym CSV.
- Kadry Mieszka Plątonogiego i Wacława III pomijają napisy identyfikujące
  postać. Kadry Henryka Pobożnego i Henryka IV Probusa zbliżają postać.
  Monogram artysty i rok wykonania rysunku Jana Olbrachta pozostawiono.

Dwa kursy obrazkowe współdzielą
`images_polish_rulers`; kurs dat nie wymaga pobierania obrazów.
