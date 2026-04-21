# Konstytucja Projektu: Gemini (Project Constitution)

## Reguły Behawioralne (Behavioral Rules)
1. **No-Code Halt**: Nie piszemy żadnego kodu funkcjonalnego, dopóki `task_plan.md` nie posiada zatwierdzonego "Blueprintu".
2. **Commit Strategy**: Każda zmiana w kodzie musi być poprzedzona sprawdzeniem statusu (`git status`) i udokumentowana w `progress.md`.
3. **Engineering Clarity**: Wyjaśnienia techniczne muszą odwoływać się do logiki systemowej (wejście/wyjście, struktura, przepływ).

## Inwarianty Architektoniczne (Architectural Invariants)
- **Struktura**: Pliki HTML muszą zawierać metadane (charset, viewport).
- **Kod**: Stosujemy wcięcie 2 lub 4 spacje (konsekwentnie).
- **Język**: Kod i komentarze techniczne w języku polskim lub angielskim (zależnie od kontekstu), nazewnictwo zmiennych logiczne i techniczne.

## Schematy Danych (Data Schemas)
- Na etapie nauki HTML: modele obiektowe DOM (Document Object Model).
- Na etapie Dashboardu: schematy SQLite zdefiniowane w `init_db.js`.
