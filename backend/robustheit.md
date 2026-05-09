# Robustheit des Systems

## 1. Authentifizierung & Sicherheit

Alle Routen außer `/api/auth/login` erfordern einen gültigen JWT.

```js
// Middleware prüft Bearer-Token bei jedem Request
req.employee = jwt.verify(auth.slice(7), JWT_SECRET);

// Passwort wird nie plain gespeichert
const hash = bcrypt.hashSync(employee_password, 10);
bcrypt.compareSync(employee_password, employee.employee_password);
```

---

## 2. SQL-Injection-Schutz

Ausschließlich parametrisierte Queries — keine String-Konkatenation mit User-Input.

```js
// Sicher: ? als Platzhalter
db.prepare(`SELECT * FROM Employee WHERE employee_username = ?`).get(username);

// Auch bei dynamischen WHERE-Klauseln: params-Array, nie Template-String mit Input
conditions.push(`b.title LIKE ?`);
params.push(`%${title}%`);
```

---

## 3. Validierung

```js
// Pflichtfelder
if (!title) return res.status(400).json({ error: 'title is required' });

// Format
if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
  return res.status(400).json({ error: 'Invalid email format' });

// Geschäftsregel
if (rent_per_day !== undefined && rent_per_day <= 0)
  return res.status(400).json({ error: 'rent_per_day must be > 0' });

if (employee_password.length < 8)
  return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen haben' });
```

---

## 4. Duplikat-Checks

```js
// ISBN
const duplicate = db.prepare(`SELECT book_id FROM Book WHERE isbn = ?`).get(isbn);
if (duplicate) return res.status(409).json({ error: 'ISBN already exists' });

// Email
const duplicate = db.prepare(`SELECT customer_id FROM Customer WHERE email = ?`).get(email);
if (duplicate) return res.status(409).json({ error: 'Email already in use' });

// Telefon (via UNIQUE constraint + catch)
if (e.message.includes('UNIQUE constraint failed: Customer.phone'))
  return res.status(409).json({ error: 'Phone number already in use' });

// Benutzername
if (e.message.includes('UNIQUE constraint failed: Employee.employee_username'))
  return res.status(409).json({ error: 'Benutzername bereits vergeben' });
```

---

## 5. Existenz-Checks (FK-Validierung vor Insert)

```js
// Genre muss existieren bevor Buch angelegt wird
const genre = db.prepare(`SELECT genre_id FROM Genre WHERE genre_id = ?`).get(genre_id);
if (!genre) return res.status(400).json({ error: 'Genre not found' });

// Buchzustand muss existieren bevor Exemplar angelegt wird
const condition = db.prepare(`SELECT book_condition_id FROM Book_Condition WHERE book_condition_id = ?`).get(condition_id);
if (!condition) return res.status(400).json({ error: 'Book condition not found' });
```

---

## 6. Business-Rules

```js
// Exemplar muss verfügbar sein (kein offenes Rental)
const openRental = db.prepare(`
  SELECT r.rental_id FROM Rental r
  LEFT JOIN Book_Return br ON r.rental_id = br.rental_id
  WHERE r.book_copy_id = ? AND br.book_return_id IS NULL
`).get(book_copy_id);
if (openRental) return res.status(409).json({ error: 'Book copy is not available' });

// Max. 5 aktive Ausleihen pro Kunde
const { count } = db.prepare(`
  SELECT COUNT(*) AS count FROM Rental r
  LEFT JOIN Book_Return br ON r.rental_id = br.rental_id
  WHERE r.customer_id = ? AND br.book_return_id IS NULL
`).get(customer_id);
if (count >= 5) return res.status(409).json({ error: 'Customer has reached the maximum of 5 active rentals' });

// Exemplar mit Ausleihen kann nicht gelöscht werden
if (rentals.length > 0)
  return res.status(409).json({ error: 'Exemplar hat bestehende Ausleihen und kann nicht gelöscht werden' });
```

---

## 7. Transaktionen (ACID)

```js
// UC-01: Buch + Autoren atomar — entweder alles oder nichts
const bookId = db.transaction(() => {
  const result = db.prepare(`INSERT INTO Book ...`).run(...);
  for (const name of author_names) { /* Author anlegen + verknüpfen */ }
  return id;
})();

// UC-05: Rückgabe + automatische Mahnung atomar
db.transaction(() => {
  db.prepare(`INSERT INTO Book_Return ...`).run(...);
  if (lateDays > 0) {
    db.prepare(`INSERT INTO Admonition ...`).run(...);
  }
})();

// DELETE Book/Customer: kaskadierendes Löschen atomar
db.transaction(() => {
  db.prepare(`DELETE FROM Admonition ...`).run(...);
  db.prepare(`DELETE FROM Book_Return ...`).run(...);
  db.prepare(`DELETE FROM Rental ...`).run(...);
  db.prepare(`DELETE FROM Book ...`).run(...);
})();
```

---

## 8. Automatische Mahnung bei Verspätung (UC-05 → UC-06)

Bei Rückgabe wird automatisch geprüft ob das Buch zu spät zurückgegeben wurde:

```js
const lateDays = Math.round((returnDate - requiredDate) / (1000 * 60 * 60 * 24));

const typeName = lateDays <= 7 ? 'Stufe 1'
               : lateDays <= 30 ? 'Stufe 2'
               : 'Stufe 3';
```

| Verzug | Mahnstufe |
|---|---|
| 1–7 Tage | Stufe 1 |
| 8–30 Tage | Stufe 2 |
| > 30 Tage | Stufe 3 |

---

## 9. Fehler-Kommunikation ans Frontend

Alle Fehler haben aussagekräftige HTTP-Statuscodes:

| Code | Bedeutung |
|---|---|
| 400 | Ungültige Eingabe / fehlendes Pflichtfeld |
| 401 | Nicht authentifiziert |
| 404 | Ressource nicht gefunden |
| 405 | Endpoint nicht erlaubt (z.B. roher POST /book-returns) |
| 409 | Konflikt (Duplikat, nicht verfügbar, aktive Ausleihen) |

Das Frontend liest `data.error` aus und zeigt es als Toast-Nachricht an.
