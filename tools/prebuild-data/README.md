# Prebuild Data Sources

Ten katalog zawiera surowe źródła danych (CSV) używane wyłącznie do generowania `assets/db/prebuilt.db`.

Te pliki nie są importowane przez runtime aplikacji, więc nie trafiają do bundla jako assets runtime.

## Workflow

1. Zaktualizuj CSV w tym katalogu.
2. Uruchom `npm run db:prebuild`.
3. Commituj zmiany w `assets/db/prebuilt.db`.
