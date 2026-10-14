# Głośność audio

Ustawienia aplikacji mają dwa niezależne suwaki:

- **Głośność efektów**: poprawna/błędna odpowiedź; istniejący zapis `feedbackVolume` i domyślne 50% pozostają bez zmian.
- **Audio fiszek**: MP3 i odczyt telefonu; zapis `flashcards.audioVolume`, domyślnie 100%.

Switch w ustawieniach kursu nadal włącza/wyłącza audio tego kursu. Globalne 0% wycisza wszystkie kursy i przerywa aktywny odczyt oraz oczekujące żądania. MP3 reaguje na zmianę poziomu podczas odtwarzania; TTS otrzymuje aktualny poziom przy rozpoczęciu kolejnej wypowiedzi. Autoplay czeka na odczyt zapisanej głośności, aby przy uruchomieniu aplikacji nie ominąć zapisanego wyciszenia.

## Natywna obsługa TTS

`expo-speech` 14.0.8 udostępnia `volume` w JS, lecz fabryczny moduł Android/iOS go nie stosuje. `patches/expo-speech+14.0.8.patch` dodaje:

- Android: pole `volume` i parametr `TextToSpeech.Engine.KEY_PARAM_VOLUME`.
- iOS: pole `volume` i `AVSpeechUtterance.volume`.

`postinstall: patch-package` odtwarza poprawkę po instalacji zależności. Android autolinking wymusza `buildFromSource: ["expo-speech"]`; gotowy AAR ominąłby poprawkę źródeł. Przy aktualizacji expo-speech należy zweryfikować lub zastąpić patch.

Po zmianie potrzebny nowy build natywny. Expo Go oraz stare klienty deweloperskie nie zawierają poprawki: 0% jest obsługiwane przez JS, ale pośrednie poziomy TTS wymagają nowego modułu. Poprawka nie zmienia systemowej głośności telefonu ani głośności efektów odpowiedzi.
