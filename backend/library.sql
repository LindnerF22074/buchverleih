DROP TABLE IF EXISTS Admonition;
DROP TABLE IF EXISTS Admonition_Type;
DROP TABLE IF EXISTS Book_Return;
DROP TABLE IF EXISTS Rental;
DROP TABLE IF EXISTS Employee;
DROP TABLE IF EXISTS Customer;
DROP TABLE IF EXISTS Address;
DROP TABLE IF EXISTS Book_Copy;
DROP TABLE IF EXISTS Book_Author;
DROP TABLE IF EXISTS Book;
DROP TABLE IF EXISTS Author;
DROP TABLE IF EXISTS Genre;
DROP TABLE IF EXISTS Book_Condition;


CREATE TABLE Genre (
    genre_id INTEGER PRIMARY KEY AUTOINCREMENT,
    genre_name TEXT NOT NULL UNIQUE
);

CREATE TABLE Author (
    author_id INTEGER PRIMARY KEY AUTOINCREMENT,
    author_name TEXT NOT NULL
);

CREATE TABLE Book (
    book_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    isbn TEXT UNIQUE,
    genre_id INTEGER,
    FOREIGN KEY (genre_id) REFERENCES Genre(genre_id),
    CHECK (isbn IS NULL OR length(isbn) IN (10, 13))
);

CREATE TABLE Book_Author (
    book_author_id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    author_id INTEGER NOT NULL,
    FOREIGN KEY (book_id) REFERENCES Book(book_id),
    FOREIGN KEY (author_id) REFERENCES Author(author_id),
    UNIQUE (book_id, author_id)
);

CREATE TABLE Book_Condition (
    book_condition_id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_condition_name TEXT UNIQUE
);

CREATE TABLE Book_Copy (
    book_copy_id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    max_rental_days INTEGER DEFAULT 30,
    rent_per_day REAL DEFAULT 0.15,
    book_condition_id INTEGER NOT NULL,
    condition_description TEXT,
    FOREIGN KEY (book_id) REFERENCES Book(book_id),
    FOREIGN KEY (book_condition_id) REFERENCES Book_Condition(book_condition_id)
);

CREATE TABLE Address (
    address_id INTEGER PRIMARY KEY AUTOINCREMENT,
    zipcode TEXT,
    city TEXT,
    street TEXT,
    UNIQUE (zipcode, city, street),
    CHECK (zipcode IS NULL OR (length(zipcode) BETWEEN 4 AND 6 AND zipcode GLOB '[0-9][0-9][0-9][0-9]*'))
);

CREATE TABLE Customer (
    customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT UNIQUE,
    address_id INTEGER,
    FOREIGN KEY (address_id) REFERENCES Address(address_id),
    CHECK (email IS NULL OR email LIKE '%_@_%.__%')
);

CREATE TABLE Employee (
    employee_id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_name TEXT NOT NULL,
    employee_username TEXT NOT NULL UNIQUE,
    employee_password TEXT NOT NULL,
    CHECK (length(employee_password) >= 8)
);

CREATE TABLE Rental (
    rental_id INTEGER PRIMARY KEY AUTOINCREMENT,
    rental_date TEXT NOT NULL,
    required_date TEXT,
    customer_id INTEGER NOT NULL,
    employee_id INTEGER,
    book_copy_id INTEGER,
    FOREIGN KEY (customer_id) REFERENCES Customer(customer_id),
    FOREIGN KEY (employee_id) REFERENCES Employee(employee_id),
    FOREIGN KEY (book_copy_id) REFERENCES Book_Copy(book_copy_id),
    CHECK (required_date IS NULL OR required_date >= rental_date)
);

CREATE TABLE Book_Return (
    book_return_id INTEGER PRIMARY KEY AUTOINCREMENT,
    return_date TEXT NOT NULL,
    rental_id INTEGER NOT NULL,
    employee_id INTEGER,
    rent_amount REAL,
    FOREIGN KEY (rental_id) REFERENCES Rental(rental_id),
    FOREIGN KEY (employee_id) REFERENCES Employee(employee_id)
);

CREATE TABLE Admonition_Type (
    admonition_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
    admonition_type_name TEXT UNIQUE,
    amount REAL DEFAULT 0
);

CREATE TABLE Admonition (
    admonition_id INTEGER PRIMARY KEY AUTOINCREMENT,
    admonition_date TEXT NOT NULL,
    rental_id INTEGER NOT NULL,
    admonition_type_id INTEGER NOT NULL,
    FOREIGN KEY (rental_id) REFERENCES Rental(rental_id),
    FOREIGN KEY (admonition_type_id) REFERENCES Admonition_Type(admonition_type_id)
);
