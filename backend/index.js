import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';

const app = express();
app.use(cors());
app.use(express.json());

const port = 3300;
const db = new Database('./library.db');
db.pragma('foreign_keys = ON');

// ─── Books ────────────────────────────────────────────────────────────────────

app.get('/api/books', (req, res) => {
  let query = `
    SELECT b.book_id, b.title, b.isbn,
           g.genre_name,
           GROUP_CONCAT(a.author_name, ', ') AS authors
    FROM Book b
    LEFT JOIN Genre g ON b.genre_id = g.genre_id
    LEFT JOIN Book_Author ba ON b.book_id = ba.book_id
    LEFT JOIN Author a ON ba.author_id = a.author_id
  `;
  const params = [];
  if (req.query.genre) {
    query += ` WHERE g.genre_name LIKE ?`;
    params.push(`%${req.query.genre}%`);
  }
  if (req.query.author) {
    query += params.length ? ` AND` : ` WHERE`;
    query += ` a.author_name LIKE ?`;
    params.push(`%${req.query.author}%`);
  }
  query += ` GROUP BY b.book_id`;
  const books = db.prepare(query).all(...params);
  res.json(books);
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

app.post('/api/books', (req, res) => {
  const { title, isbn, genre_id } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  const result = db.prepare(`INSERT INTO Book (title, isbn, genre_id) VALUES (?, ?, ?)`).run(title, isbn ?? null, genre_id ?? null);
  res.status(201).json({ book_id: result.lastInsertRowid, title, isbn, genre_id });
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
    JOIN Book_Condition bc2 ON bc.book_condition_id = bc2.book_condition_id
  `).all();
  res.json(copies);
});

app.get('/api/book-copies/:id', (req, res) => {
  const copy = db.prepare(`
    SELECT bc.*, b.title, bc2.book_condition_name
    FROM Book_Copy bc
    JOIN Book b ON bc.book_id = b.book_id
    JOIN Book_Condition bc2 ON bc.book_condition_id = bc2.book_condition_id
    WHERE bc.book_copy_id = ?
  `).get(req.params.id);
  if (!copy) return res.status(404).json({ error: 'Book copy not found' });
  res.json(copy);
});

app.post('/api/book-copies', (req, res) => {
  const { book_id, max_rental_days, rent_per_day, book_condition_id, condition_description } = req.body;
  if (!book_id || !book_condition_id) return res.status(400).json({ error: 'book_id and book_condition_id are required' });
  const result = db.prepare(`
    INSERT INTO Book_Copy (book_id, max_rental_days, rent_per_day, book_condition_id, condition_description)
    VALUES (?, ?, ?, ?, ?)
  `).run(book_id, max_rental_days ?? 30, rent_per_day ?? 0.15, book_condition_id, condition_description ?? null);
  res.status(201).json({ book_copy_id: result.lastInsertRowid, ...req.body });
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

app.get('/api/customers', (req, res) => {
  const customers = db.prepare(`
    SELECT c.*, a.zipcode, a.city, a.street
    FROM Customer c
    LEFT JOIN Address a ON c.address_id = a.address_id
  `).all();
  res.json(customers);
});

app.get('/api/customers/:id', (req, res) => {
  const customer = db.prepare(`
    SELECT c.*, a.zipcode, a.city, a.street
    FROM Customer c
    LEFT JOIN Address a ON c.address_id = a.address_id
    WHERE c.customer_id = ?
  `).get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  res.json(customer);
});

app.post('/api/customers', (req, res) => {
  const { customer_name, email, phone, address_id } = req.body;
  if (!customer_name) return res.status(400).json({ error: 'customer_name is required' });
  const result = db.prepare(`INSERT INTO Customer (customer_name, email, phone, address_id) VALUES (?, ?, ?, ?)`)
    .run(customer_name, email ?? null, phone ?? null, address_id ?? null);
  res.status(201).json({ customer_id: result.lastInsertRowid, ...req.body });
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
    return res.status(400).json({ error: 'employee_name, employee_username, and employee_password are required' });
  const result = db.prepare(`INSERT INTO Employee (employee_name, employee_username, employee_password) VALUES (?, ?, ?)`)
    .run(employee_name, employee_username, employee_password);
  res.status(201).json({ employee_id: result.lastInsertRowid, employee_name, employee_username });
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

app.post('/api/rentals', (req, res) => {
  const { rental_date, required_date, customer_id, employee_id, book_copy_id } = req.body;
  if (!rental_date || !customer_id) return res.status(400).json({ error: 'rental_date and customer_id are required' });
  const result = db.prepare(`
    INSERT INTO Rental (rental_date, required_date, customer_id, employee_id, book_copy_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(rental_date, required_date ?? null, customer_id, employee_id ?? null, book_copy_id ?? null);
  res.status(201).json({ rental_id: result.lastInsertRowid, ...req.body });
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
    SELECT ad.*, at.admonition_type_name, at.amount, r.rental_date, c.customer_name
    FROM Admonition ad
    JOIN Admonition_Type at ON ad.admonition_type_id = at.admonition_type_id
    JOIN Rental r ON ad.rental_id = r.rental_id
    JOIN Customer c ON r.customer_id = c.customer_id
  `).all();
  res.json(admonitions);
});

app.post('/api/admonitions', (req, res) => {
  const { admonition_date, rental_id, admonition_type_id } = req.body;
  if (!admonition_date || !rental_id || !admonition_type_id)
    return res.status(400).json({ error: 'admonition_date, rental_id, and admonition_type_id are required' });
  const result = db.prepare(`INSERT INTO Admonition (admonition_date, rental_id, admonition_type_id) VALUES (?, ?, ?)`)
    .run(admonition_date, rental_id, admonition_type_id);
  res.status(201).json({ admonition_id: result.lastInsertRowid, ...req.body });
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
