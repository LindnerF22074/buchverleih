import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const app = express();
app.use(cors());
app.use(express.json());

const port = 3300;
const db = new Database('./library.db');
db.pragma('foreign_keys = ON');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-bitte-in-.env-setzen';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

// ─── Auth ─────────────────────────────────────────────────────────────────────

function authenticateToken(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Kein Token angegeben' });
  try {
    req.employee = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Ungültiger oder abgelaufener Token' });
  }
}

app.post('/api/auth/login', (req, res) => {
  const { employee_username, employee_password } = req.body;
  if (!employee_username || !employee_password)
    return res.status(400).json({ error: 'employee_username und employee_password erforderlich' });

  const employee = db.prepare(`SELECT * FROM Employee WHERE employee_username = ?`).get(employee_username);
  if (!employee || !bcrypt.compareSync(employee_password, employee.employee_password))
    return res.status(401).json({ error: 'Ungültige Anmeldedaten' });

  const token = jwt.sign(
    { employee_id: employee.employee_id, employee_name: employee.employee_name, employee_username: employee.employee_username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
  res.json({ token, employee_id: employee.employee_id, employee_name: employee.employee_name });
});

// Alle folgenden Routen erfordern gültigen JWT
app.use(authenticateToken);

// ─── Books ────────────────────────────────────────────────────────────────────

// UC-07: GET /api/books with filters + pagination
app.get('/api/books', (req, res) => {
  const {
    title, isbn, authorName, genreId,
    onlyAvailable, minPricePerDay, maxPricePerDay, conditionId,
    page = 1, pageSize = 20,
    // legacy params kept for backwards compat
    genre, author,
  } = req.query;

  const conditions = [];
  const params = [];

  if (title) { conditions.push(`b.title LIKE ?`); params.push(`%${title}%`); }
  if (isbn) { conditions.push(`b.isbn = ?`); params.push(isbn); }
  if (genreId) { conditions.push(`b.genre_id = ?`); params.push(parseInt(genreId)); }
  if (genre) { conditions.push(`g.genre_name LIKE ?`); params.push(`%${genre}%`); }
  if (authorName || author) {
    const name = authorName || author;
    conditions.push(`EXISTS (
      SELECT 1 FROM Book_Author ba2
      JOIN Author a2 ON ba2.author_id = a2.author_id
      WHERE ba2.book_id = b.book_id AND a2.author_name LIKE ?
    )`);
    params.push(`%${name}%`);
  }
  if (conditionId) {
    conditions.push(`EXISTS (SELECT 1 FROM Book_Copy bc2 WHERE bc2.book_id = b.book_id AND bc2.condition_id = ?)`);
    params.push(parseInt(conditionId));
  }
  if (minPricePerDay) {
    conditions.push(`EXISTS (SELECT 1 FROM Book_Copy bc2 WHERE bc2.book_id = b.book_id AND bc2.rent_per_day >= ?)`);
    params.push(parseFloat(minPricePerDay));
  }
  if (maxPricePerDay) {
    conditions.push(`EXISTS (SELECT 1 FROM Book_Copy bc2 WHERE bc2.book_id = b.book_id AND bc2.rent_per_day <= ?)`);
    params.push(parseFloat(maxPricePerDay));
  }
  if (onlyAvailable === 'true') {
    conditions.push(`EXISTS (
      SELECT 1 FROM Book_Copy bc2
      WHERE bc2.book_id = b.book_id
      AND NOT EXISTS (
        SELECT 1 FROM Rental r
        LEFT JOIN Book_Return br ON r.rental_id = br.rental_id
        WHERE r.book_copy_id = bc2.book_copy_id AND br.book_return_id IS NULL
      )
    )`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  const books = db.prepare(`
    SELECT b.book_id, b.title, b.isbn, b.genre_id,
           g.genre_name,
           GROUP_CONCAT(DISTINCT a.author_name) AS authors,
           (
             SELECT COUNT(*) FROM Book_Copy bc2
             WHERE bc2.book_id = b.book_id
             AND NOT EXISTS (
               SELECT 1 FROM Rental r
               LEFT JOIN Book_Return br ON r.rental_id = br.rental_id
               WHERE r.book_copy_id = bc2.book_copy_id AND br.book_return_id IS NULL
             )
           ) AS available_copies
    FROM Book b
    LEFT JOIN Genre g ON b.genre_id = g.genre_id
    LEFT JOIN Book_Author ba ON b.book_id = ba.book_id
    LEFT JOIN Author a ON ba.author_id = a.author_id
    ${whereClause}
    GROUP BY b.book_id
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);

  const { total } = db.prepare(`
    SELECT COUNT(DISTINCT b.book_id) AS total
    FROM Book b
    LEFT JOIN Genre g ON b.genre_id = g.genre_id
    LEFT JOIN Book_Author ba ON b.book_id = ba.book_id
    LEFT JOIN Author a ON ba.author_id = a.author_id
    ${whereClause}
  `).get(...params);

  res.json({ data: books, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

app.get('/api/books/:id', (req, res) => {
  const book = db.prepare(`
    SELECT b.book_id, b.title, b.isbn,
           g.genre_name,
           GROUP_CONCAT(a.author_name, ', ') AS authors
    FROM Book b
    LEFT JOIN Genre g ON b.genre_id = g.genre_id
    LEFT JOIN Book_Author ba ON b.book_id = ba.book_id
    LEFT JOIN Author a ON ba.author_id = a.author_id
    WHERE b.book_id = ?
    GROUP BY b.book_id
  `).get(req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  res.json(book);
});

// UC-01: POST /api/books with author_ids/author_names, genre check, ISBN duplicate check
app.post('/api/books', (req, res) => {
  const { title, isbn, genre_id, author_ids = [], author_names = [] } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  if (isbn) {
    const duplicate = db.prepare(`SELECT book_id FROM Book WHERE isbn = ?`).get(isbn);
    if (duplicate) return res.status(409).json({ error: 'ISBN already exists' });
  }

  if (genre_id) {
    const genre = db.prepare(`SELECT genre_id FROM Genre WHERE genre_id = ?`).get(genre_id);
    if (!genre) return res.status(400).json({ error: 'Genre not found' });
  }

  try {
    const bookId = db.transaction(() => {
      const result = db.prepare(`INSERT INTO Book (title, isbn, genre_id) VALUES (?, ?, ?)`)
        .run(title, isbn ?? null, genre_id ?? null);
      const id = result.lastInsertRowid;

      for (const authorId of author_ids) {
        const author = db.prepare(`SELECT author_id FROM Author WHERE author_id = ?`).get(authorId);
        if (!author) throw Object.assign(new Error(`Author ${authorId} not found`), { status: 400 });
        db.prepare(`INSERT OR IGNORE INTO Book_Author (book_id, author_id) VALUES (?, ?)`).run(id, authorId);
      }

      for (const name of author_names) {
        let author = db.prepare(`SELECT author_id FROM Author WHERE author_name = ?`).get(name);
        if (!author) {
          const r = db.prepare(`INSERT INTO Author (author_name) VALUES (?)`).run(name);
          author = { author_id: r.lastInsertRowid };
        }
        db.prepare(`INSERT OR IGNORE INTO Book_Author (book_id, author_id) VALUES (?, ?)`).run(id, author.author_id);
      }

      return id;
    })();

    const book = db.prepare(`
      SELECT b.book_id, b.title, b.isbn, b.genre_id, g.genre_name,
             GROUP_CONCAT(a.author_name, ', ') AS authors
      FROM Book b
      LEFT JOIN Genre g ON b.genre_id = g.genre_id
      LEFT JOIN Book_Author ba ON b.book_id = ba.book_id
      LEFT JOIN Author a ON ba.author_id = a.author_id
      WHERE b.book_id = ?
      GROUP BY b.book_id
    `).get(bookId);
    res.status(201).json(book);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    throw e;
  }
});

app.put('/api/books/:id', (req, res) => {
  const { title, isbn, genre_id } = req.body;
  const result = db.prepare(`UPDATE Book SET title = COALESCE(?, title), isbn = COALESCE(?, isbn), genre_id = COALESCE(?, genre_id) WHERE book_id = ?`)
    .run(title ?? null, isbn ?? null, genre_id ?? null, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Book not found' });
  res.json({ book_id: parseInt(req.params.id), ...req.body });
});

app.delete('/api/books/:id', (req, res) => {
  const result = db.prepare(`DELETE FROM Book WHERE book_id = ?`).run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Book not found' });
  res.status(204).send();
});

// ─── Book Copies ──────────────────────────────────────────────────────────────

app.get('/api/book-copies', (req, res) => {
  const copies = db.prepare(`
    SELECT bc.*, b.title, bc2.book_condition_name
    FROM Book_Copy bc
    JOIN Book b ON bc.book_id = b.book_id
    JOIN Book_Condition bc2 ON bc.condition_id = bc2.book_condition_id
  `).all();
  res.json(copies);
});

app.get('/api/book-copies/:id', (req, res) => {
  const copy = db.prepare(`
    SELECT bc.*, b.title, bc2.book_condition_name
    FROM Book_Copy bc
    JOIN Book b ON bc.book_id = b.book_id
    JOIN Book_Condition bc2 ON bc.condition_id = bc2.book_condition_id
    WHERE bc.book_copy_id = ?
  `).get(req.params.id);
  if (!copy) return res.status(404).json({ error: 'Book copy not found' });
  res.json(copy);
});

// Legacy flat endpoint kept for backwards compat
app.post('/api/book-copies', (req, res) => {
  const { book_id, max_rental_days, rent_per_day, book_condition_id, condition_id: condId, condition_description } = req.body;
  const resolvedConditionId = condId ?? book_condition_id;
  if (!book_id || !resolvedConditionId) return res.status(400).json({ error: 'book_id and condition_id are required' });
  const result = db.prepare(`
    INSERT INTO Book_Copy (book_id, max_rental_days, rent_per_day, condition_id, condition_description)
    VALUES (?, ?, ?, ?, ?)
  `).run(book_id, max_rental_days ?? 30, rent_per_day ?? 0.15, resolvedConditionId, condition_description ?? null);
  res.status(201).json({ book_copy_id: result.lastInsertRowid, book_id, condition_id: resolvedConditionId, max_rental_days: max_rental_days ?? 30, rent_per_day: rent_per_day ?? 0.15, condition_description: condition_description ?? null });
});

// UC-02: POST /api/books/:bookId/copies
app.post('/api/books/:bookId/copies', (req, res) => {
  const { condition_id, max_rental_days, rent_per_day, condition_description } = req.body;
  const bookId = parseInt(req.params.bookId);

  if (!condition_id) return res.status(400).json({ error: 'condition_id is required' });
  if (rent_per_day !== undefined && rent_per_day <= 0) return res.status(400).json({ error: 'rent_per_day must be > 0' });
  if (max_rental_days !== undefined && max_rental_days <= 0) return res.status(400).json({ error: 'max_rental_days must be > 0' });

  const book = db.prepare(`SELECT book_id FROM Book WHERE book_id = ?`).get(bookId);
  if (!book) return res.status(404).json({ error: 'Book not found' });

  const condition = db.prepare(`SELECT book_condition_id FROM Book_Condition WHERE book_condition_id = ?`).get(condition_id);
  if (!condition) return res.status(400).json({ error: 'Book condition not found' });

  const result = db.prepare(`
    INSERT INTO Book_Copy (book_id, max_rental_days, rent_per_day, condition_id, condition_description)
    VALUES (?, ?, ?, ?, ?)
  `).run(bookId, max_rental_days ?? 30, rent_per_day ?? 0.15, condition_id, condition_description ?? null);

  res.status(201).json({
    book_copy_id: result.lastInsertRowid,
    book_id: bookId,
    condition_id,
    max_rental_days: max_rental_days ?? 30,
    rent_per_day: rent_per_day ?? 0.15,
    condition_description: condition_description ?? null,
  });
});

app.delete('/api/book-copies/:id', (req, res) => {
  const result = db.prepare(`DELETE FROM Book_Copy WHERE book_copy_id = ?`).run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Book copy not found' });
  res.status(204).send();
});

// ─── Genres ───────────────────────────────────────────────────────────────────

app.get('/api/genres', (req, res) => {
  res.json(db.prepare(`SELECT * FROM Genre`).all());
});

app.post('/api/genres', (req, res) => {
  const { genre_name } = req.body;
  if (!genre_name) return res.status(400).json({ error: 'genre_name is required' });
  const result = db.prepare(`INSERT INTO Genre (genre_name) VALUES (?)`).run(genre_name);
  res.status(201).json({ genre_id: result.lastInsertRowid, genre_name });
});

app.delete('/api/genres/:id', (req, res) => {
  const result = db.prepare(`DELETE FROM Genre WHERE genre_id = ?`).run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Genre not found' });
  res.status(204).send();
});

// ─── Authors ──────────────────────────────────────────────────────────────────

app.get('/api/authors', (req, res) => {
  res.json(db.prepare(`SELECT * FROM Author`).all());
});

app.post('/api/authors', (req, res) => {
  const { author_name } = req.body;
  if (!author_name) return res.status(400).json({ error: 'author_name is required' });
  const result = db.prepare(`INSERT INTO Author (author_name) VALUES (?)`).run(author_name);
  res.status(201).json({ author_id: result.lastInsertRowid, author_name });
});

app.delete('/api/authors/:id', (req, res) => {
  const result = db.prepare(`DELETE FROM Author WHERE author_id = ?`).run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Author not found' });
  res.status(204).send();
});

// ─── Customers ────────────────────────────────────────────────────────────────

// UC-08: GET /api/customers with filters + pagination
app.get('/api/customers', (req, res) => {
  const { nameSearch, city, hasOpenRentals, hasOpenAdmonitions, page = 1, pageSize = 20 } = req.query;

  const conditions = [];
  const params = [];

  if (nameSearch) { conditions.push(`c.customer_name LIKE ?`); params.push(`%${nameSearch}%`); }
  if (city) { conditions.push(`a.city LIKE ?`); params.push(`%${city}%`); }
  if (hasOpenRentals === 'true') {
    conditions.push(`EXISTS (
      SELECT 1 FROM Rental r
      LEFT JOIN Book_Return br ON r.rental_id = br.rental_id
      WHERE r.customer_id = c.customer_id AND br.book_return_id IS NULL
    )`);
  } else if (hasOpenRentals === 'false') {
    conditions.push(`NOT EXISTS (
      SELECT 1 FROM Rental r
      LEFT JOIN Book_Return br ON r.rental_id = br.rental_id
      WHERE r.customer_id = c.customer_id AND br.book_return_id IS NULL
    )`);
  }
  if (hasOpenAdmonitions === 'true') {
    conditions.push(`EXISTS (
      SELECT 1 FROM Rental r
      JOIN Book_Return br ON r.rental_id = br.rental_id
      JOIN Admonition ad ON br.book_return_id = ad.book_return_id
      WHERE r.customer_id = c.customer_id
    )`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  const customers = db.prepare(`
    SELECT c.customer_id, c.customer_name, c.email, c.phone,
           a.zipcode, a.city, a.street
    FROM Customer c
    LEFT JOIN Address a ON c.address_id = a.address_id
    ${whereClause}
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);

  const { total } = db.prepare(`
    SELECT COUNT(*) AS total
    FROM Customer c
    LEFT JOIN Address a ON c.address_id = a.address_id
    ${whereClause}
  `).get(...params);

  res.json({ data: customers, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

// UC-08: GET /api/customers/:id with rental history
app.get('/api/customers/:id', (req, res) => {
  const customer = db.prepare(`
    SELECT c.*, a.zipcode, a.city, a.street
    FROM Customer c
    LEFT JOIN Address a ON c.address_id = a.address_id
    WHERE c.customer_id = ?
  `).get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const rental_history = db.prepare(`
    SELECT r.rental_id, r.rental_date, r.required_date,
           b.title AS book_title,
           br.book_return_id, br.return_date, br.rent_amount,
           CASE WHEN br.book_return_id IS NULL THEN 'open' ELSE 'returned' END AS status
    FROM Rental r
    LEFT JOIN Book_Copy bc ON r.book_copy_id = bc.book_copy_id
    LEFT JOIN Book b ON bc.book_id = b.book_id
    LEFT JOIN Book_Return br ON r.rental_id = br.rental_id
    WHERE r.customer_id = ?
    ORDER BY r.rental_date DESC
  `).all(req.params.id);

  const admonitions = db.prepare(`
    SELECT ad.admonition_id, ad.admonition_date,
           at.admonition_type_name, at.amount,
           br.return_date, b.title AS book_title
    FROM Admonition ad
    JOIN Admonition_Type at ON ad.admonition_type_id = at.admonition_type_id
    JOIN Book_Return br ON ad.book_return_id = br.book_return_id
    JOIN Rental r ON br.rental_id = r.rental_id
    LEFT JOIN Book_Copy bc ON r.book_copy_id = bc.book_copy_id
    LEFT JOIN Book b ON bc.book_id = b.book_id
    WHERE r.customer_id = ?
    ORDER BY ad.admonition_date DESC
  `).all(req.params.id);

  res.json({ ...customer, rental_history, admonitions });
});

// UC-03: POST /api/customers with inline address + email validation
app.post('/api/customers', (req, res) => {
  const { customer_name, email, phone, address, address_id: directAddressId } = req.body;
  if (!customer_name) return res.status(400).json({ error: 'customer_name is required' });

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (email) {
    const duplicate = db.prepare(`SELECT customer_id FROM Customer WHERE email = ?`).get(email);
    if (duplicate) return res.status(409).json({ error: 'Email already in use' });
  }

  let address_id = directAddressId ? parseInt(directAddressId) : null;
  if (address && !address_id) {
    const { zipcode, city, street } = address;
    db.prepare(`INSERT OR IGNORE INTO Address (zipcode, city, street) VALUES (?, ?, ?)`)
      .run(zipcode ?? null, city ?? null, street ?? null);
    const addr = db.prepare(`SELECT address_id FROM Address WHERE zipcode IS ? AND city IS ? AND street IS ?`)
      .get(zipcode ?? null, city ?? null, street ?? null);
    address_id = addr.address_id;
  }

  try {
    const result = db.prepare(`INSERT INTO Customer (customer_name, email, phone, address_id) VALUES (?, ?, ?, ?)`)
      .run(customer_name, email ?? null, phone ?? null, address_id);
    res.status(201).json({ customer_id: result.lastInsertRowid, customer_name, email: email ?? null, phone: phone ?? null, address_id });
  } catch (e) {
    if (e.message.includes('UNIQUE constraint failed: Customer.phone')) {
      return res.status(409).json({ error: 'Phone number already in use' });
    }
    throw e;
  }
});

app.put('/api/customers/:id', (req, res) => {
  const { customer_name, email, phone, address_id } = req.body;
  const result = db.prepare(`
    UPDATE Customer SET
      customer_name = COALESCE(?, customer_name),
      email = COALESCE(?, email),
      phone = COALESCE(?, phone),
      address_id = COALESCE(?, address_id)
    WHERE customer_id = ?
  `).run(customer_name ?? null, email ?? null, phone ?? null, address_id ?? null, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Customer not found' });
  res.json({ customer_id: parseInt(req.params.id), ...req.body });
});

app.delete('/api/customers/:id', (req, res) => {
  const result = db.prepare(`DELETE FROM Customer WHERE customer_id = ?`).run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Customer not found' });
  res.status(204).send();
});

// ─── Employees ────────────────────────────────────────────────────────────────

app.get('/api/employees', (req, res) => {
  const employees = db.prepare(`SELECT employee_id, employee_name, employee_username FROM Employee`).all();
  res.json(employees);
});

app.get('/api/employees/:id', (req, res) => {
  const employee = db.prepare(`SELECT employee_id, employee_name, employee_username FROM Employee WHERE employee_id = ?`).get(req.params.id);
  if (!employee) return res.status(404).json({ error: 'Employee not found' });
  res.json(employee);
});

app.post('/api/employees', (req, res) => {
  const { employee_name, employee_username, employee_password } = req.body;
  if (!employee_name || !employee_username || !employee_password)
    return res.status(400).json({ error: 'employee_name, employee_username und employee_password erforderlich' });
  if (employee_password.length < 8)
    return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen haben' });
  const hash = bcrypt.hashSync(employee_password, 10);
  try {
    const result = db.prepare(`INSERT INTO Employee (employee_name, employee_username, employee_password) VALUES (?, ?, ?)`)
      .run(employee_name, employee_username, hash);
    res.status(201).json({ employee_id: result.lastInsertRowid, employee_name, employee_username });
  } catch (e) {
    if (e.message.includes('UNIQUE constraint failed: Employee.employee_username'))
      return res.status(409).json({ error: 'Benutzername bereits vergeben' });
    throw e;
  }
});

app.delete('/api/employees/:id', (req, res) => {
  const result = db.prepare(`DELETE FROM Employee WHERE employee_id = ?`).run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Employee not found' });
  res.status(204).send();
});

// ─── Rentals ──────────────────────────────────────────────────────────────────

app.get('/api/rentals', (req, res) => {
  const rentals = db.prepare(`
    SELECT r.*, c.customer_name, e.employee_name, b.title AS book_title
    FROM Rental r
    JOIN Customer c ON r.customer_id = c.customer_id
    LEFT JOIN Employee e ON r.employee_id = e.employee_id
    LEFT JOIN Book_Copy bc ON r.book_copy_id = bc.book_copy_id
    LEFT JOIN Book b ON bc.book_id = b.book_id
  `).all();
  res.json(rentals);
});

app.get('/api/rentals/:id', (req, res) => {
  const rental = db.prepare(`
    SELECT r.*, c.customer_name, e.employee_name, b.title AS book_title
    FROM Rental r
    JOIN Customer c ON r.customer_id = c.customer_id
    LEFT JOIN Employee e ON r.employee_id = e.employee_id
    LEFT JOIN Book_Copy bc ON r.book_copy_id = bc.book_copy_id
    LEFT JOIN Book b ON bc.book_id = b.book_id
    WHERE r.rental_id = ?
  `).get(req.params.id);
  if (!rental) return res.status(404).json({ error: 'Rental not found' });
  res.json(rental);
});

// UC-04: POST /api/rentals with availability check, max-5 rule, required_date auto
app.post('/api/rentals', (req, res) => {
  const { customer_id, book_copy_id, employee_id } = req.body;
  if (!customer_id || !book_copy_id) return res.status(400).json({ error: 'customer_id and book_copy_id are required' });

  const customer = db.prepare(`SELECT customer_id FROM Customer WHERE customer_id = ?`).get(customer_id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const copy = db.prepare(`SELECT * FROM Book_Copy WHERE book_copy_id = ?`).get(book_copy_id);
  if (!copy) return res.status(404).json({ error: 'Book copy not found' });

  const openRental = db.prepare(`
    SELECT r.rental_id FROM Rental r
    LEFT JOIN Book_Return br ON r.rental_id = br.rental_id
    WHERE r.book_copy_id = ? AND br.book_return_id IS NULL
  `).get(book_copy_id);
  if (openRental) return res.status(409).json({ error: 'Book copy is not available' });

  const { count: activeCount } = db.prepare(`
    SELECT COUNT(*) AS count FROM Rental r
    LEFT JOIN Book_Return br ON r.rental_id = br.rental_id
    WHERE r.customer_id = ? AND br.book_return_id IS NULL
  `).get(customer_id);
  if (activeCount >= 5) return res.status(409).json({ error: 'Customer has reached the maximum of 5 active rentals' });

  const today = new Date();
  const rental_date = today.toISOString().split('T')[0];
  const reqDate = new Date(today);
  reqDate.setDate(reqDate.getDate() + copy.max_rental_days);
  const required_date = reqDate.toISOString().split('T')[0];

  const result = db.prepare(`
    INSERT INTO Rental (rental_date, required_date, customer_id, employee_id, book_copy_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(rental_date, required_date, customer_id, employee_id ?? null, book_copy_id);

  res.status(201).json({
    rental_id: result.lastInsertRowid,
    rental_date,
    required_date,
    customer_id,
    employee_id: employee_id ?? null,
    book_copy_id,
  });
});

// UC-05: POST /api/rentals/:rentalId/return
app.post('/api/rentals/:rentalId/return', (req, res) => {
  const { employee_id } = req.body;
  const rentalId = parseInt(req.params.rentalId);

  const rental = db.prepare(`
    SELECT r.*, bc.rent_per_day, bc.max_rental_days
    FROM Rental r
    JOIN Book_Copy bc ON r.book_copy_id = bc.book_copy_id
    WHERE r.rental_id = ?
  `).get(rentalId);
  if (!rental) return res.status(404).json({ error: 'Rental not found' });

  const existing = db.prepare(`SELECT book_return_id FROM Book_Return WHERE rental_id = ?`).get(rentalId);
  if (existing) return res.status(409).json({ error: 'Rental already returned' });

  const return_date = new Date().toISOString().split('T')[0];

  const rentalDate = new Date(rental.rental_date);
  const returnDate = new Date(return_date);
  const days = Math.max(1, Math.round((returnDate - rentalDate) / (1000 * 60 * 60 * 24)));
  const rent_amount = +(days * rental.rent_per_day).toFixed(2);

  const result = db.transaction(() => {
    const ret = db.prepare(`
      INSERT INTO Book_Return (return_date, rental_id, employee_id, rent_amount)
      VALUES (?, ?, ?, ?)
    `).run(return_date, rentalId, employee_id ?? null, rent_amount);
    const book_return_id = ret.lastInsertRowid;

    const requiredDate = new Date(rental.required_date);
    const lateDays = Math.round((returnDate - requiredDate) / (1000 * 60 * 60 * 24));

    let admonition = null;
    if (lateDays > 0) {
      const typeName = lateDays <= 7 ? 'Stufe 1' : lateDays <= 30 ? 'Stufe 2' : 'Stufe 3';
      const admType = db.prepare(`SELECT admonition_type_id FROM Admonition_Type WHERE admonition_type_name = ?`).get(typeName);
      if (admType) {
        const adm = db.prepare(`
          INSERT INTO Admonition (admonition_date, book_return_id, admonition_type_id)
          VALUES (?, ?, ?)
        `).run(return_date, book_return_id, admType.admonition_type_id);
        admonition = { admonition_id: adm.lastInsertRowid, admonition_date: return_date, admonition_type_name: typeName, late_days: lateDays };
      }
    }

    return { book_return_id, rent_amount, late_days: Math.max(0, lateDays), admonition };
  })();

  res.status(201).json({ ...result, return_date, rental_id: rentalId, employee_id: employee_id ?? null });
});

app.delete('/api/rentals/:id', (req, res) => {
  const result = db.prepare(`DELETE FROM Rental WHERE rental_id = ?`).run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Rental not found' });
  res.status(204).send();
});

// ─── Book Returns ─────────────────────────────────────────────────────────────

app.get('/api/book-returns', (req, res) => {
  const returns = db.prepare(`
    SELECT br.*, r.rental_date, c.customer_name, b.title AS book_title, e.employee_name
    FROM Book_Return br
    JOIN Rental r ON br.rental_id = r.rental_id
    JOIN Customer c ON r.customer_id = c.customer_id
    LEFT JOIN Employee e ON br.employee_id = e.employee_id
    LEFT JOIN Book_Copy bc ON r.book_copy_id = bc.book_copy_id
    LEFT JOIN Book b ON bc.book_id = b.book_id
  `).all();
  res.json(returns);
});

app.post('/api/book-returns', (req, res) => {
  const { return_date, rental_id, employee_id, rent_amount } = req.body;
  if (!return_date || !rental_id) return res.status(400).json({ error: 'return_date and rental_id are required' });
  const result = db.prepare(`
    INSERT INTO Book_Return (return_date, rental_id, employee_id, rent_amount)
    VALUES (?, ?, ?, ?)
  `).run(return_date, rental_id, employee_id ?? null, rent_amount ?? null);
  res.status(201).json({ book_return_id: result.lastInsertRowid, ...req.body });
});

// ─── Admonitions ──────────────────────────────────────────────────────────────

app.get('/api/admonitions', (req, res) => {
  const admonitions = db.prepare(`
    SELECT ad.*, at.admonition_type_name, at.amount,
           br.return_date, br.rental_id,
           r.rental_date, c.customer_name
    FROM Admonition ad
    JOIN Admonition_Type at ON ad.admonition_type_id = at.admonition_type_id
    JOIN Book_Return br ON ad.book_return_id = br.book_return_id
    JOIN Rental r ON br.rental_id = r.rental_id
    JOIN Customer c ON r.customer_id = c.customer_id
  `).all();
  res.json(admonitions);
});

// UC-06: POST /api/admonitions with book_return_id + admonition_type selection
app.post('/api/admonitions', (req, res) => {
  const { book_return_id, admonition_type_id } = req.body;
  if (!book_return_id || !admonition_type_id)
    return res.status(400).json({ error: 'book_return_id and admonition_type_id are required' });

  const bookReturn = db.prepare(`SELECT * FROM Book_Return WHERE book_return_id = ?`).get(book_return_id);
  if (!bookReturn) return res.status(404).json({ error: 'Book return not found' });

  const admType = db.prepare(`SELECT * FROM Admonition_Type WHERE admonition_type_id = ?`).get(admonition_type_id);
  if (!admType) return res.status(404).json({ error: 'Admonition type not found' });

  const admonition_date = new Date().toISOString().split('T')[0];
  const result = db.prepare(`
    INSERT INTO Admonition (admonition_date, book_return_id, admonition_type_id) VALUES (?, ?, ?)
  `).run(admonition_date, book_return_id, admonition_type_id);

  res.status(201).json({ admonition_id: result.lastInsertRowid, admonition_date, book_return_id, admonition_type_id });
});

// ─── Admonition Types ─────────────────────────────────────────────────────────

app.get('/api/admonition-types', (req, res) => {
  res.json(db.prepare(`SELECT * FROM Admonition_Type`).all());
});

app.post('/api/admonition-types', (req, res) => {
  const { admonition_type_name, amount } = req.body;
  if (!admonition_type_name) return res.status(400).json({ error: 'admonition_type_name is required' });
  const result = db.prepare(`INSERT INTO Admonition_Type (admonition_type_name, amount) VALUES (?, ?)`)
    .run(admonition_type_name, amount ?? 0);
  res.status(201).json({ admonition_type_id: result.lastInsertRowid, admonition_type_name, amount: amount ?? 0 });
});

// ─── Addresses ────────────────────────────────────────────────────────────────

app.get('/api/addresses', (req, res) => {
  res.json(db.prepare(`SELECT * FROM Address`).all());
});

app.post('/api/addresses', (req, res) => {
  const { zipcode, city, street } = req.body;
  const result = db.prepare(`INSERT OR IGNORE INTO Address (zipcode, city, street) VALUES (?, ?, ?)`)
    .run(zipcode ?? null, city ?? null, street ?? null);
  const address = db.prepare(`SELECT * FROM Address WHERE zipcode IS ? AND city IS ? AND street IS ?`)
    .get(zipcode ?? null, city ?? null, street ?? null);
  res.status(result.changes > 0 ? 201 : 200).json(address);
});

// ─── Book Conditions ──────────────────────────────────────────────────────────

app.get('/api/book-conditions', (req, res) => {
  res.json(db.prepare(`SELECT * FROM Book_Condition`).all());
});

app.post('/api/book-conditions', (req, res) => {
  const { book_condition_name } = req.body;
  if (!book_condition_name) return res.status(400).json({ error: 'book_condition_name is required' });
  const result = db.prepare(`INSERT INTO Book_Condition (book_condition_name) VALUES (?)`).run(book_condition_name);
  res.status(201).json({ book_condition_id: result.lastInsertRowid, book_condition_name });
});

// ─────────────────────────────────────────────────────────────────────────────

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
