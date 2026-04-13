# API Endpoints — Library Backend (Port 3300)

## Books

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/books` | List all books (filter via `?genre=` or `?author=`) |
| GET | `/api/books/:id` | Get a single book |
| POST | `/api/books` | Create a book |
| PUT | `/api/books/:id` | Update a book |
| DELETE | `/api/books/:id` | Delete a book |

## Book Copies

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/book-copies` | List all book copies |
| GET | `/api/book-copies/:id` | Get a single book copy |
| POST | `/api/book-copies` | Create a book copy |
| DELETE | `/api/book-copies/:id` | Delete a book copy |

## Genres

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/genres` | List all genres |
| POST | `/api/genres` | Create a genre |
| DELETE | `/api/genres/:id` | Delete a genre |

## Authors

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/authors` | List all authors |
| POST | `/api/authors` | Create an author |
| DELETE | `/api/authors/:id` | Delete an author |

## Customers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers` | List all customers (joins Address) |
| GET | `/api/customers/:id` | Get a single customer |
| POST | `/api/customers` | Create a customer |
| PUT | `/api/customers/:id` | Update a customer |
| DELETE | `/api/customers/:id` | Delete a customer |

## Employees

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employees` | List all employees (passwords excluded) |
| GET | `/api/employees/:id` | Get a single employee |
| POST | `/api/employees` | Create an employee |
| DELETE | `/api/employees/:id` | Delete an employee |

## Rentals

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rentals` | List all rentals (joins Book, Customer, Employee) |
| GET | `/api/rentals/:id` | Get a single rental |
| POST | `/api/rentals` | Create a rental |
| DELETE | `/api/rentals/:id` | Delete a rental |

## Book Returns

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/book-returns` | List all book returns |
| POST | `/api/book-returns` | Create a book return |

## Admonitions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admonitions` | List all admonitions |
| POST | `/api/admonitions` | Create an admonition |

## Admonition Types

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admonition-types` | List all admonition types |
| POST | `/api/admonition-types` | Create an admonition type |

## Addresses

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/addresses` | List all addresses |
| POST | `/api/addresses` | Create an address (deduplicates automatically) |

## Book Conditions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/book-conditions` | List all book conditions |
| POST | `/api/book-conditions` | Create a book condition |
