# Wersja aplikacji przed publikacją

Przed każdym nowym uploadem do Google Play zwiększ wersję w **obu** miejscach:

1. `app.json`
   - `expo.version` — widoczna dla użytkownika, np. `1.0.3`.
   - `expo.android.versionCode` — liczba całkowita, np. `4`.
2. `android/app/build.gradle`
   - `versionName` — musi być takie samo jak `expo.version`.
   - `versionCode` — musi być takie samo jak `expo.android.versionCode`.
3. `package.json`
   - `version` — ustaw taką samą wersję widoczną dla użytkownika.

`versionCode` musi być za każdym razem **większy** niż każdy kod kiedykolwiek wysłany do Google Play. Nie można ponownie użyć poprzedniej wartości, nawet jeśli wydanie nie zostało opublikowane.

Po zmianie zbuduj nowy plik `.aab`. Wysłanie wcześniej zbudowanego pliku nadal da błąd, bo zawiera on poprzedni `versionCode`.

Przykład kolejnego wydania po `1.0.2` / `3`:

```text
version: 1.0.3
versionCode: 4
```
