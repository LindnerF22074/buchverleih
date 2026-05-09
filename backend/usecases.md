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
