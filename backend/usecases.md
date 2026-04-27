# Aufgabe: Buchverleih Use Cases umsetzen

Setze die folgenden Use Cases im bestehenden Backend um. Halte dich strikt an die bestehende Projektstruktur, Coding-Konventionen und Architekturmuster.

## Vorgehen

1. **Erst analysieren, dann implementieren:**
   - Lies die bestehende Projektstruktur (Ordner, Schichten, Naming Conventions)
   - Identifiziere das verwendete Pattern (Repository, Service Layer, Controller, DTOs, etc.)
   - Prüfe das ORM/Datenbank-Setup (EF Core / Dapper / direktes SQL?)
   - Schau dir bestehende Endpoints an, um den Stil zu übernehmen
   - **Stelle Rückfragen, wenn etwas unklar ist – nicht raten**

2. **Datenmodell prüfen:**
   - Vergleiche das vorhandene Datenmodell mit dem ERD unten
   - Falls Entities fehlen oder abweichen: melde es, bevor du Migrations erstellst

3. **Implementierung pro Use Case:**
   - Entity / Model (falls noch nicht vorhanden)
   - Repository-Methoden
   - Service-Layer mit Business Logic
   - Controller / API-Endpoint
   - DTOs für Request/Response
   - Input-Validation
   - Aussagekräftige Exceptions mit passenden HTTP-Statuscodes

4. **Nach jedem Use Case:**
   - Kurz testen (Build muss durchlaufen)
   - Zusammenfassung was geändert wurde

## ERD (Datenmodell-Referenz)

```
Book (book_id, title, isbn, genre_id FK)
Genre (genre_id, genre_name)
Author (author_id, author_name)
Book_Author (book_author_id, book_id FK, author_id FK)
Book_Condition (book_condition_id, book_condition_name)
Book_Copy (book_copy_id, max_rental_days, condition_description, rent_per_day, book_id FK, condition_id FK)
Customer (customer_id, customer_name, email, phone, address_id FK)
Address (address_id, zipcode, city, street)
Employee (employee_id, employee_name)
Rental (rental_id, rental_date, required_date, customer_id FK, employee_id FK, book_copy_id FK)
Book_Return (book_return_id, return_date, rent_amount, rental_id FK, employee_id FK)
Admonition (admonition_id, admonition_date, book_return_id FK, admonition_type_id FK)
Admonition_Type (admonition_type_id, admonition_type_name, amount)
```

## Use Cases

### UC-01: Buch anlegen
- Endpoint: `POST /api/books`
- Input: title, isbn, genre_id, author_ids (Liste)
- Validierung: ISBN-Duplikate prüfen, Genre muss existieren
- Author-Verknüpfungen über Book_Author anlegen
- Autor automatisch anlegen, falls noch nicht vorhanden (oder eigener Endpoint dafür – frag nach)

### UC-02: Exemplar anlegen
- Endpoint: `POST /api/books/{bookId}/copies`
- Input: condition_id, max_rental_days, rent_per_day, condition_description
- Validierung: Buch und Zustand müssen existieren
- Geschäftsregel: rent_per_day > 0, max_rental_days > 0

### UC-03: Kunden erstellen
- Endpoint: `POST /api/customers`
- Input: customer_name, email, phone, address (zipcode, city, street)
- Adresse wiederverwenden, falls identische bereits existiert (find-or-create)
- E-Mail-Duplikate verhindern, E-Mail-Format validieren

### UC-04: Buch ausleihen
- Endpoint: `POST /api/rentals`
- Input: customer_id, book_copy_id, employee_id (oder aus Auth-Context)
- Validierung:
  - Exemplar muss verfügbar sein (kein offenes Rental ohne Book_Return)
  - Kunde existiert
  - Optional: max. parallele Ausleihen pro Kunde (z. B. 5)
- `required_date` automatisch berechnen: `rental_date + max_rental_days` des Exemplars

### UC-05: Buch zurückgeben
- Endpoint: `POST /api/rentals/{rentalId}/return`
- Input: employee_id (oder aus Auth-Context)
- Logik:
  - Prüfen, ob Rental noch offen ist
  - `rent_amount` = Tage zwischen rental_date und return_date × rent_per_day
  - Book_Return anlegen
  - Bei Verspätung (return_date > required_date): automatisch Admonition erzeugen (siehe UC-06)

### UC-06: Mahngebühren verbuchen
- Wird automatisch von UC-05 ausgelöst, zusätzlich Endpoint für manuelle Mahnungen:
- Endpoint: `POST /api/admonitions`
- Input: book_return_id, admonition_type_id
- Logik bei Verspätung: passenden Admonition_Type anhand Verzugstage wählen
  - 1–7 Tage: Stufe 1
  - 8–30 Tage: Stufe 2
  - > 30 Tage: Stufe 3
  - (Diese Stufen müssen als Admonition_Type-Datensätze existieren – ggf. Seed-Daten anlegen)

### UC-07: Bücher/Exemplare filtern
- Endpoint: `GET /api/books` mit Query-Parametern:
  - `title` (LIKE-Suche), `isbn`, `authorName`, `genreId`, `onlyAvailable` (bool), `minPricePerDay`, `maxPricePerDay`, `conditionId`
- Alle Parameter optional, kombinierbar
- Pagination: `page`, `pageSize`
- Response: Buchliste mit Anzahl verfügbarer Exemplare

### UC-08: Kunden-Liste
- Endpoint: `GET /api/customers` mit Query-Parametern:
  - `nameSearch`, `city`, `hasOpenRentals` (bool), `hasOpenAdmonitions` (bool)
- Pagination
- Detail-Endpoint: `GET /api/customers/{id}` mit Ausleihhistorie

## Wichtige Anforderungen

- **Keine Halluzinationen:** Wenn du nicht weißt, wie etwas im bestehenden Code gemacht wird → schau nach oder frag
- **Keine Breaking Changes** an bestehenden Endpoints
- **Konsistenz** mit bestehendem Code-Stil (Indentation, Naming, Error-Handling)
- **Async/await** überall wo das Projekt es schon nutzt
- **Logging** im selben Stil wie bestehender Code
- **Migrations** falls EF Core verwendet wird – nicht selbst die DB-Schema-Datei editieren
- Bei Unsicherheiten lieber **kleinere Schritte** und nachfragen

## Reihenfolge

Implementiere in dieser Reihenfolge (Abhängigkeiten):
1. UC-01 (Buch) → UC-02 (Exemplar)
2. UC-03 (Kunde)
3. UC-07 + UC-08 (Listen/Filter – braucht keine Mutationen)
4. UC-04 (Ausleihe)
5. UC-05 (Rückgabe) → UC-06 (Mahnung)

## Start

Bevor du Code schreibst:
1. Liste mir die bestehende Projektstruktur
2. Sag mir, welche Entities/Tabellen schon existieren und welche fehlen
3. Frag mich konkret zu jedem unklaren Punkt
4. Erst dann beginnen wir mit UC-01