# Präsentation — Folieninhalte

---

## Folie 1: Use Cases

| UC | Beschreibung |
|---|---|
| UC-01 | Buch anlegen — mit Autor (neu oder bestehend), ISBN-Duplikatprüfung |
| UC-02 | Exemplar anlegen — Zustand, Preis, maximale Leihdauer |
| UC-03 | Kunden erstellen — E-Mail-Validierung, Adresse find-or-create |
| UC-04 | Buch ausleihen — Verfügbarkeitscheck, max. 5 aktive Ausleihen, Fälligkeitsdatum automatisch |
| UC-05 | Buch zurückgeben — Mietbetrag berechnen, automatische Mahnung bei Verspätung |
| UC-06 | Mahnung — Stufe 1 (≤7 Tage) / Stufe 2 (≤30 Tage) / Stufe 3 (>30 Tage) |
| UC-07 | Bücher filtern — Titel, Autor, Genre, Verfügbarkeit, Preis, Pagination |
| UC-08 | Kundenliste — Filter, Pagination, Ausleihhistorie pro Kunde |

---

## Folie 2: Endpoints

| Method | Endpoint | UC |
|---|---|---|
| POST | `/api/books` | UC-01 |
| POST | `/api/books/:id/copies` | UC-02 |
| POST | `/api/customers` | UC-03 |
| POST | `/api/rentals` | UC-04 |
| POST | `/api/rentals/:id/return` | UC-05 |
| POST | `/api/admonitions` | UC-06 |
| GET | `/api/books?title=&genre=&onlyAvailable=` | UC-07 |
| GET | `/api/customers?nameSearch=&hasOpenRentals=` | UC-08 |
| GET | `/api/customers/:id` | UC-08 |
| POST | `/api/auth/login` | Auth |

---

## Folie 3: Robustheit

| Kriterium | Umsetzung |
|---|---|
| **Authentifizierung** | JWT auf allen Routes, bcrypt Passwort-Hashing |
| **SQL-Injection** | Ausschließlich parametrisierte Queries (`?`), kein String-Concat mit User-Input |
| **Validierung** | Pflichtfelder, E-Mail-Format, `rent_per_day > 0`, Passwort ≥ 8 Zeichen |
| **Duplikat-Checks** | ISBN, E-Mail, Telefon, Benutzername → HTTP 409 |
| **Existenz-Checks** | Genre, Buchzustand, Kunde, Exemplar vor jedem Insert geprüft |
| **Transaktionen** | UC-01 (Buch + Autoren), UC-05 (Rückgabe + Mahnung), DELETE (Kaskade) |
| **Exceptions** | HTTP 400 / 401 / 404 / 405 / 409 mit klarer Fehlermeldung |
| **Frontend** | Alle Fehler via Toast-Notification sichtbar |
