# Model danych aplikacji do nauki słówek

Poniżej znajduje się szczegółowy opis struktury bazy danych SQLite dla aplikacji do nauki słówek, wraz z komentarzami wyjaśniającymi rolę każdej tabeli i kolumny.

---

## Tabela `languages`

Przechowuje dostępne języki.

```sql
CREATE TABLE languages (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,  -- unikalny identyfikator języka
  code TEXT    NOT NULL UNIQUE,            -- krótki kod (np. 'pl','en') do filtrowania
  name TEXT    NOT NULL                    -- pełna nazwa języka wyświetlana w UI
);
```

- **`id`**: unikalny klucz dla każdego języka  
- **`code`**: kod ISO lub inny skrótowy identyfikator  
- **`name`**: nazwa wyświetlana użytkownikowi  

---

## Tabela `words`

Przechowuje podstawowe słówka z przypisanym poziomem CEFR.

```sql
CREATE TABLE words (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,                                      -- unikalny identyfikator słówka
  language_id INTEGER NOT NULL REFERENCES languages(id),                             -- wskazuje, w jakim języku jest słówko
  text        TEXT    NOT NULL,                                                      -- forma tekstowa słówka
  cefr_level  TEXT    NOT NULL CHECK(cefr_level IN ('A1','A2','B1','B2','C1','C2')), -- poziom trudności według CEFR
  UNIQUE(language_id, text)                                                          -- zabezpiecza przed duplikatami tego samego słówka w jednym języku
);
```

- **`language_id`**: FK do tabeli `languages`, określający język słówka  
- **`text`**: treść słówka  
- **`cefr_level`**: poziom od A1 do C2  
- **UNIQUE(language_id, text)**: zapobiega dodaniu tego samego słówka dwa razy w jednym języku  

---

## Tabela `translations`

Przechowuje wszystkie tłumaczenia słówek, nawet jeśli nie ma ich w tabeli `words`.

```sql
CREATE TABLE translations (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,  -- unikalny identyfikator rekordu tłumaczenia
  source_word_id      INTEGER NOT NULL REFERENCES words(id),         -- odniesienie do słówka źródłowego
  target_language_id  INTEGER NOT NULL REFERENCES languages(id),     -- określa język tłumaczenia
  translation_text    TEXT    NOT NULL,                             -- faktyczna forma tłumaczenia (np. "przerwa")
  target_word_id      INTEGER REFERENCES words(id),                  -- opcjonalne odniesienie, jeśli tłumaczenie też jest w tabeli words
  UNIQUE(source_word_id, target_language_id, translation_text)       -- zapobiega duplikowaniu tej samego tłumaczenia
);
```

- **`source_word_id`**: FK do słówka w `words`  
- **`target_language_id`**: język tłumaczenia  
- **`translation_text`**: forma tłumaczenia  
- **`target_word_id`**: opcjonalny FK, gdy tłumaczenie również występuje w `words`  
- **UNIQUE(...)**: gwarantuje, że nie będzie dwóch identycznych wpisów tłumaczenia  

---

## Tabela `language_pairs`

Definiuje dozwolone kierunki tłumaczeń.

```sql
CREATE TABLE language_pairs (
  source_language_id INTEGER NOT NULL REFERENCES languages(id),  -- język źródłowy
  target_language_id INTEGER NOT NULL REFERENCES languages(id),  -- język docelowy
  PRIMARY KEY (source_language_id, target_language_id)           -- każda para tylko raz
);
```

- Umożliwia walidację i dynamiczne generowanie listy dostępnych kierunków w UI  

---

## Indeksy i ustawienia wydajności

```sql
-- Indeksy przyspieszające filtrowanie:
CREATE INDEX idx_words_lang_cefr 
  ON words(language_id, cefr_level);
CREATE INDEX idx_trans_src_tgtlang 
  ON translations(source_word_id, target_language_id);

-- Ustawienia SQLite (wykonaj raz przy otwarciu DB):
PRAGMA journal_mode = WAL;     -- tryb Write-Ahead Logging
PRAGMA synchronous = NORMAL;   -- kompromis bezpieczeństwa i szybkości
PRAGMA cache_size = 10000;     -- bufor pamięci podręcznej
PRAGMA page_size = 4096;       -- rozmiar strony bazy danych
```

- Indeksy i PRAGMA poprawiają wydajność na dużych zbiorach danych  


---

## Przykład wstawienia danych

Podzielmy to na kroki, używając przykładu wiersza:

```
48,A1,time,"czas, okres, moment, chwila, raz, takt, czasowy, mierzyć, trwanie"
```

### 1. Wstawienie do `words`

| Kolumna                      | Wartość                                                   | Opis                                                               |
|------------------------------|-----------------------------------------------------------|--------------------------------------------------------------------|
| `id`                         | autoincrement                                             | Generowane automatycznie przez SQLite                              |
| `language_id`                | `(SELECT id FROM languages WHERE code='en')`              | Klucz obcy do tabeli `languages` wskazujący na "en"                |
| `text`                       | `time`                                                    | Słowo źródłowe                                                     |
| `cefr_level`                 | `A1`                                                      | Poziom CEFR                                                        |
| **UNIQUE(language_id, text)**| —                                                         | Zapobiega duplikatom słów w tym samym języku                       |

```sql
INSERT INTO words (language_id, text, cefr_level)
VALUES (
  (SELECT id FROM languages WHERE code='en'),
  'time',
  'A1'
);
```

### 2. Rozbicie tłumaczeń w `translations`

Dla każdego tłumaczenia (np. `czas`, `okres`, `moment`, ...) wykonujemy osobny INSERT:

| Kolumna                                   | Wartość                                                   | Opis                                                                  |
|-------------------------------------------|-----------------------------------------------------------|-----------------------------------------------------------------------|
| `source_word_id`                          | `48`                                                      | ID słówka `time` z tabeli `words`                                     |
| `target_language_id`                      | `(SELECT id FROM languages WHERE code='pl')`              | Klucz obcy do tabeli `languages` wskazujący na "pl"                   |
| `translation_text`                        | `'czas'`, `'okres'`, ...                                  | Kolejne formy tłumaczenia                                             |
| `target_word_id`                          | `NULL`                                                    | Jeśli tłumaczenie jest również w `words` → wstaw jego `id`, inaczej `NULL` |
| **UNIQUE(source_word_id, target_language_id, translation_text)** | —                        | Zapobiega duplikowaniu tej samej pary tłumaczeniowej                   |

Przykład dla pojedynczego tłumaczenia:

```sql
INSERT INTO translations (
  source_word_id,
  target_language_id,
  translation_text,
  target_word_id
)
VALUES (
  48,
  (SELECT id FROM languages WHERE code='pl'),
  'czas',
  NULL
);
```

### Dlaczego właśnie taki układ tabel?

| Element | Po co jest | Co dzięki temu zyskujemy |
|---------|------------|--------------------------|
| **`languages`** | Jedno źródło prawdy o językach (kod ISO, nazwa). | ‑ Dodajesz nowy język jednym INSERT‑em.
‑ Klucze obce w innych tabelach są krótkie (INT), więc baza rośnie wolniej. |
| **`words`** | Kanoniczna lista słówek, każde przypięte do języka i poziomu CEFR. | ‑ Brak duplikatów: `UNIQUE(language_id, text)`.
‑ Łatwe filtrowanie po poziomie (A1‑C2) lub języku.
‑ Możesz podłączyć moduł powtórek do pojedynczego identyfikatora słowa. |
| **`translations`** | Elastyczna mapa wiele‑do‑wielu między słowem źródłowym a dowolnym tłumaczeniem. | ‑ Każde znaczenie („czas”, „okres”, …) to oddzielny rekord, więc logika w aplikacji jest prosta.
‑ `target_language_id` mówi od razu, na który język jest przekład.
‑ `translation_text` przechowuje tłumaczenie nawet wtedy, gdy nie ma go w `words`.
‑ `target_word_id` *opcjonalnie* linkuje do rekordu w `words`. |
| **`language_pairs`** | Deklarujesz, które kierunki tłumaczeń oficjalnie obsługujesz. | ‑ Walidacja przy INSERT‑ach (blokujesz egzotyczne kombinacje).
‑ UI może z tej tabeli budować dropdown „ucz się z X na Y”.
‑ Skala niewielka, więc żaden koszt wydajnościowy. |
| **Indeksy + PRAGMA** | Techniczne drobiazgi dla szybkości i spójności. | ‑ Zapytania *O(log n)* zamiast pełnych skanów.
‑ WAL pozwala na jednoczesne odczyty/zapisy bez blokad.
‑ Cache i page size zmniejszają liczbę odwołań do dysku. |

#### Kluczowe korzyści

* **Skalowalność** – 25 000 słówek i 200 000 tłumaczeń to wciąż mały plik SQLite (kilkadziesiąt MB).  
* **Normalizacja** – unikamy powielania tych samych tekstów w wielu miejscach, więc baza jest lżejsza i łatwiejsza do utrzymania.  
* **Elastyczność** – możesz dodać język, słowo lub tłumaczenie bez ruszania schematu.  
* **Jakość danych** – unikalne klucze wymuszają brak dubli, a klucze obce pilnują spójności język ↔ słowo ↔ tłumaczenie.  
* **Gotowość na rozbudowę** – `target_word_id` i `language_pairs` dają miejsce na zaawansowane funkcje (fiszki, sync, statystyki postępów) bez przebudowy schematu.

