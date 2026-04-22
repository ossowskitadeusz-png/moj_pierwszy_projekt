# Plan Nauki Podstaw Programowania Webowego

## Cele Główne
- Opanowanie struktury dokumentów HTML.
- Zrozumienie stylowania CSS.
- Perfekcyjna obsługa workflow w Git (commit, push, branch).

## Fazy Projektu
## [BLUEPRINT] Faza 1: Mechanika i Struktura HTML (DOM Foundation)

### Cele techniczne:
1. Zrozumienie roli przeglądarki jako interpretera kodu.
2. Opanowanie hierarchii drzewa DOM (Document Object Model).
3. Poprawne stosowanie tagów semantycznych vs blokowych.

### Harmonogram mikro-zadań:
1. **Lekcja 1**: Anatomia tagu i struktura dokumentu (DOCTYPE, head, body).
2. **Lekcja 2**: Tekst i hierarchia (h1-h6, p, br, hr) – dlaczego struktura ma znaczenie dla SEO i czytników.
3. **Lekcja 3**: Grupowanie danych (div, span) – kontenery jako fundament pod CSS.
4. **Lekcja 4**: Listy i tabele – reprezentacja danych technicznych.

### [MILESTONE] Test Systemowy 1:
- Zadanie: Samodzielne zbudowanie "Karty Charakterystyki Urządzenia" w czystym HTML.
- Kryteria: 0 błędów walidacji, poprawna hierarchia nagłówków, użycie minimum 10 różnych tagów.
- Nagroda: Ocena w skali 1-10 i odblokowanie Fazy 2 (CSS).

## [BLUEPRINT] Faza 2: Estetyka i Układ (Visual Engineering)

### Cele techniczne:
1. Zrozumienie Box Modelu (klucz do układania elementów).
2. Opanowanie kaskadowości i priorytetów selektorów CSS.
3. Budowa elastycznych układów za pomocą Flexbox.

### Harmonogram mikro-zadań:
1. **Lekcja 5**: Box Model – marginesy (margin), obramowania (border) i wypełnienie (padding).
2. **Lekcja 6**: Selektory i Kaskada – jak CSS wybiera, który styl zastosować.
3. **Lekcja 7**: Flexbox – zarządzanie przestrzenią i osiami (inżynierski layout).
4. **Lekcja 8**: Typografia i Kolory – czcionki Google Fonts i systemy HEX/RGB.

### [MILESTONE] Test Systemowy 2:
- Zadanie: Pełne ostylowanie pliku `test_1.html`.
- Kryteria: Responsywny układ (Flexbox), użycie zmiennych CSS, czytelność na poziomie dokumentacji technicznej.
- Nagroda: Ocena 1-10 i odblokowanie Fazy 3 (Git Proficiency).

## [BLUEPRINT] Faza 3: Kontrola Wersji i Dokumentacja (Git Proficiency)

### Cele techniczne:
1. Skuteczne rozwiązywanie problemów w pracy grupowej (konflikty).
2. Wykorzystanie gałęzi do bezpiecznego testowania nowych funkcjonalności.
3. Tworzenie profesjonalnej dokumentacji technicznej (Markdown).

### Harmonogram mikro-zadań:
1. **Lekcja 9**: Podstawy Git (Init, Add, Commit). [ZAKOŃCZONE]
2. **Lekcja 10**: Synchronizacja z chmurą (Push/Pull/Clone). [ZAKOŃCZONE]
3. **Lekcja 11**: Zarządzanie konfliktami (Merge Conflicts). [ZAKOŃCZONE: 10/10]
4. **Lekcja 12**: Zaawansowany Markdown – składnia dokumentacji technicznej. [W TOKU]
5. **Lekcja 13**: Strategie Branchingu – praca na gałęziach feature.

### [MILESTONE] Test Systemowy 3:
- Zadanie: Przygotowanie repozytorium do "produkcji".
- Kryteria: Czysta historia commitów, profesjonalne README, poprawny merge z gałęzi feature do main.
- Nagroda: Certyfikat ukończenia modułu "Fundamenty".

## [BLUEPRINT] Faza 4: Analytical Dashboard (Backend & Data)

### Cele techniczne:
1. Zarządzanie zależnościami za pomocą **NPM**.
2. Architektura bazy danych **SQLite** (zgodnie z Konstytucją).
3. Logika analityczna w **Node.js** (przetwarzanie danych).

### Harmonogram mikro-zadań:
1. **Lekcja 14**: Fundamenty NPM – `npm init`, `package.json` i skrypty.
2. **Lekcja 15**: Modelowanie Danych – projektowanie tabel w SQLite.
3. **Lekcja 16**: System CRUD – zapis i odczyt danych z bazy.
4. **Lekcja 17**: Logika analityczna – obliczenia i statystyki w JS.

### [MILESTONE] Test Systemowy 4:
- Zadanie: Skrypt `init_db.js` generujący bazę z danymi testowymi.
- Kryteria: Poprawność schematu, obsługa błędów, czytelność kodu.

## [BLUEPRINT] Faza 5: Full-Stack Integration (The Server)

### Cele techniczne:
1. Stworzenie serwera za pomocą **Express.js**.
2. Komunikacja między przeglądarką a serwerem (**API**).
3. Dynamiczne odświeżanie strony bez przeładowania (**Fetch API**).

### Harmonogram mikro-zadań:
1. **Lekcja 18**: Express Setup – instalacja i uruchomienie serwera HTTP. [ZAKOŃCZONE]
2. **Lekcja 19**: JSON API – endpoint przesyłający dane z bazy. [ZAKOŃCZONE]
3. **Lekcja 20**: Frontend Fetch – pobieranie danych w JavaScript przeglądarkowym. [ZAKOŃCZONE]
4. **Lekcja 21**: DOM Update – dynamiczne generowanie tabeli na stronie. [ZAKOŃCZONE]

### [MILESTONE] Test Systemowy 5:
- Zadanie: Dashboard w przeglądarce automatycznie wyświetla dane pobrane z SQLite.
- Kryteria: Brak błędów w konsoli przeglądarki, responsywność, poprawne mapowanie danych.

## Checklisty Techniczne
- [ ] Każdy plik HTML musi być zgodny ze standardem W3C.
- [ ] Każdy commit w Git musi mieć jasny, techniczny opis.
- [ ] Dane wrażliwe (jeśli będą) muszą być w `.env`.
