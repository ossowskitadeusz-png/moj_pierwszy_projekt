## [BLUEPRINT] Faza 6: Engine Room Command Center (ERCC)

### Cele techniczne:
1. Skalowanie aplikacji do rangi "Centrum Dowodzenia".
2. Integracja systemu plików (`fs` w Node.js) z interfejsem webowym.
3. Wdrożenie zaawansowanego logowania aktywności (Audit Trail).
4. Implementacja systemu wielojęzyczności (i18n).

### Harmonogram mikro-zadań:
1. **Lekcja 22**: Re-architektura i UI – Budowa layoutu Dashboardu (Sidebar, Header, Content).
2. **Lekcja 23**: Interfejs Językowy (i18n) – Ładowanie i parsowanie plików `locales`.
3. **Lekcja 24**: File System Bridge – Skanowanie lokalnych folderów (API backendowe).
4. **Lekcja 25**: File Explorer UI – Wyświetlanie struktury folderów i nawigacja w przeglądarce.
5. **Lekcja 26**: Audit Logging – Rejestracja zdarzeń systemowych do bazy SQLite.
6. **Lekcja 27**: Integracja Legacy – Podpięcie starego modułu "Log Napraw" pod nowy Dashboard.

### [MILESTONE] Test Systemowy 6:
- Zadanie: W pełni funkcjonalny, lokalny web-dashboard przeglądający pliki i logujący aktywność.
- Kryteria: Działająca zmiana języka, responsywny design, poprawne zapisy do logu systemowego, pełna niezależność od chmury (offline-first).
