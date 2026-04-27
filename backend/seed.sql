-- ─── Genres ───────────────────────────────────────────────────────────────────
INSERT INTO Genre (genre_name) VALUES ('Roman');
INSERT INTO Genre (genre_name) VALUES ('Klassiker');
INSERT INTO Genre (genre_name) VALUES ('Krimi');
INSERT INTO Genre (genre_name) VALUES ('Sachbuch');
INSERT INTO Genre (genre_name) VALUES ('Biografie');
INSERT INTO Genre (genre_name) VALUES ('Fantasy');
INSERT INTO Genre (genre_name) VALUES ('Lyrik');

-- ─── Book Conditions ──────────────────────────────────────────────────────────
INSERT INTO Book_Condition (book_condition_name) VALUES ('Neu');
INSERT INTO Book_Condition (book_condition_name) VALUES ('Sehr gut');
INSERT INTO Book_Condition (book_condition_name) VALUES ('Gut');
INSERT INTO Book_Condition (book_condition_name) VALUES ('Akzeptabel');
INSERT INTO Book_Condition (book_condition_name) VALUES ('Beschädigt');

-- ─── Authors ──────────────────────────────────────────────────────────────────
INSERT INTO Author (author_name) VALUES ('Franz Kafka');                    -- 1
INSERT INTO Author (author_name) VALUES ('Johann Wolfgang von Goethe');     -- 2
INSERT INTO Author (author_name) VALUES ('Thomas Mann');                    -- 3
INSERT INTO Author (author_name) VALUES ('Hermann Hesse');                  -- 4
INSERT INTO Author (author_name) VALUES ('Stefan Zweig');                   -- 5
INSERT INTO Author (author_name) VALUES ('Bernhard Schlink');               -- 6
INSERT INTO Author (author_name) VALUES ('Patrick Süskind');                -- 7
INSERT INTO Author (author_name) VALUES ('Daniel Kehlmann');                -- 8
INSERT INTO Author (author_name) VALUES ('Theodor Fontane');                -- 9
INSERT INTO Author (author_name) VALUES ('Bertolt Brecht');                 -- 10

-- ─── Books ────────────────────────────────────────────────────────────────────
--                                          genre_id: 1=Roman 2=Klassiker 3=Krimi 4=Sachbuch 5=Biografie
INSERT INTO Book (title, isbn, genre_id) VALUES ('Der Prozess',               '9783150082706', 2); -- 1
INSERT INTO Book (title, isbn, genre_id) VALUES ('Der Zauberberg',             '9783596294398', 1); -- 2
INSERT INTO Book (title, isbn, genre_id) VALUES ('Das Glasperlenspiel',        '9783518368558', 1); -- 3
INSERT INTO Book (title, isbn, genre_id) VALUES ('Der Steppenwolf',            '9783518368466', 1); -- 4
INSERT INTO Book (title, isbn, genre_id) VALUES ('Die Welt von Gestern',       '9783100780423', 5); -- 5
INSERT INTO Book (title, isbn, genre_id) VALUES ('Der Vorleser',               '9783257229530', 1); -- 6
INSERT INTO Book (title, isbn, genre_id) VALUES ('Das Parfum',                 '9783257228007', 1); -- 7
INSERT INTO Book (title, isbn, genre_id) VALUES ('Die Vermessung der Welt',    '9783498035389', 1); -- 8
INSERT INTO Book (title, isbn, genre_id) VALUES ('Effi Briest',                '9783150006733', 2); -- 9
INSERT INTO Book (title, isbn, genre_id) VALUES ('Faust',                      '9783150000014', 2); -- 10

-- ─── Book_Author ──────────────────────────────────────────────────────────────
INSERT INTO Book_Author (book_id, author_id) VALUES (1, 1);   -- Prozess → Kafka
INSERT INTO Book_Author (book_id, author_id) VALUES (2, 3);   -- Zauberberg → T. Mann
INSERT INTO Book_Author (book_id, author_id) VALUES (3, 4);   -- Glasperlenspiel → Hesse
INSERT INTO Book_Author (book_id, author_id) VALUES (4, 4);   -- Steppenwolf → Hesse
INSERT INTO Book_Author (book_id, author_id) VALUES (5, 5);   -- Welt von Gestern → Zweig
INSERT INTO Book_Author (book_id, author_id) VALUES (6, 6);   -- Vorleser → Schlink
INSERT INTO Book_Author (book_id, author_id) VALUES (7, 7);   -- Parfum → Süskind
INSERT INTO Book_Author (book_id, author_id) VALUES (8, 8);   -- Vermessung → Kehlmann
INSERT INTO Book_Author (book_id, author_id) VALUES (9, 9);   -- Effi Briest → Fontane
INSERT INTO Book_Author (book_id, author_id) VALUES (10, 2);  -- Faust → Goethe

-- ─── Book Copies ─────────────────────────────────────────────────────────────
-- condition_id: 1=Neu 2=Sehr gut 3=Gut 4=Akzeptabel 5=Beschädigt
INSERT INTO Book_Copy (book_id, condition_id, max_rental_days, rent_per_day, condition_description) VALUES (1, 1, 14, 0.50, NULL);              -- 1  Prozess Neu
INSERT INTO Book_Copy (book_id, condition_id, max_rental_days, rent_per_day, condition_description) VALUES (1, 3, 14, 0.30, 'Deckblatt etwas abgenutzt'); -- 2  Prozess Gut
INSERT INTO Book_Copy (book_id, condition_id, max_rental_days, rent_per_day, condition_description) VALUES (2, 1, 30, 0.60, NULL);              -- 3  Zauberberg Neu
INSERT INTO Book_Copy (book_id, condition_id, max_rental_days, rent_per_day, condition_description) VALUES (2, 2, 30, 0.50, NULL);              -- 4  Zauberberg Sehr gut
INSERT INTO Book_Copy (book_id, condition_id, max_rental_days, rent_per_day, condition_description) VALUES (3, 2, 21, 0.40, NULL);              -- 5  Glasperlenspiel Sehr gut
INSERT INTO Book_Copy (book_id, condition_id, max_rental_days, rent_per_day, condition_description) VALUES (4, 3, 21, 0.35, NULL);              -- 6  Steppenwolf Gut
INSERT INTO Book_Copy (book_id, condition_id, max_rental_days, rent_per_day, condition_description) VALUES (4, 4, 21, 0.20, 'Rücken gebrochen, Seiten vollständig'); -- 7  Steppenwolf Akzeptabel
INSERT INTO Book_Copy (book_id, condition_id, max_rental_days, rent_per_day, condition_description) VALUES (5, 2, 14, 0.40, NULL);              -- 8  Welt von Gestern
INSERT INTO Book_Copy (book_id, condition_id, max_rental_days, rent_per_day, condition_description) VALUES (6, 2, 21, 0.45, NULL);              -- 9  Vorleser Sehr gut
INSERT INTO Book_Copy (book_id, condition_id, max_rental_days, rent_per_day, condition_description) VALUES (6, 3, 14, 0.30, NULL);              -- 10 Vorleser Gut
INSERT INTO Book_Copy (book_id, condition_id, max_rental_days, rent_per_day, condition_description) VALUES (7, 1, 14, 0.50, NULL);              -- 11 Parfum Neu
INSERT INTO Book_Copy (book_id, condition_id, max_rental_days, rent_per_day, condition_description) VALUES (7, 3, 14, 0.35, NULL);              -- 12 Parfum Gut
INSERT INTO Book_Copy (book_id, condition_id, max_rental_days, rent_per_day, condition_description) VALUES (8, 2, 21, 0.45, NULL);              -- 13 Vermessung Sehr gut
INSERT INTO Book_Copy (book_id, condition_id, max_rental_days, rent_per_day, condition_description) VALUES (8, 1, 30, 0.55, NULL);              -- 14 Vermessung Neu
INSERT INTO Book_Copy (book_id, condition_id, max_rental_days, rent_per_day, condition_description) VALUES (10, 2, 14, 0.35, NULL);             -- 15 Faust Sehr gut

-- ─── Addresses ────────────────────────────────────────────────────────────────
INSERT INTO Address (zipcode, city, street) VALUES ('4600', 'Wels',          'Stadtplatz 12');         -- 1
INSERT INTO Address (zipcode, city, street) VALUES ('4020', 'Linz',          'Landstraße 45');          -- 2
INSERT INTO Address (zipcode, city, street) VALUES ('5020', 'Salzburg',      'Mozartplatz 3');          -- 3
INSERT INTO Address (zipcode, city, street) VALUES ('1010', 'Wien',          'Graben 18');              -- 4
INSERT INTO Address (zipcode, city, street) VALUES ('8010', 'Graz',          'Herrengasse 7');          -- 5
INSERT INTO Address (zipcode, city, street) VALUES ('4040', 'Linz',          'Rudolfstraße 22');        -- 6
INSERT INTO Address (zipcode, city, street) VALUES ('1070', 'Wien',          'Neubaugasse 55');         -- 7
INSERT INTO Address (zipcode, city, street) VALUES ('4601', 'Wels',          'Römerstraße 9');          -- 8

-- ─── Customers ────────────────────────────────────────────────────────────────
INSERT INTO Customer (customer_name, email, phone, address_id) VALUES ('Maria Huber',       'm.huber@mail.at',        '0664111111', 1); -- 1
INSERT INTO Customer (customer_name, email, phone, address_id) VALUES ('Thomas Gruber',     't.gruber@webmail.at',     '0664222222', 2); -- 2
INSERT INTO Customer (customer_name, email, phone, address_id) VALUES ('Anna Bauer',        'a.bauer@icloud.at',      '0664333333', 3); -- 3
INSERT INTO Customer (customer_name, email, phone, address_id) VALUES ('Klaus Wagner',      'k.wagner@gmx.at',        '0664444444', 4); -- 4
INSERT INTO Customer (customer_name, email, phone, address_id) VALUES ('Elisabeth Mayer',   'e.mayer@aon.at',         '0664555555', 5); -- 5
INSERT INTO Customer (customer_name, email, phone, address_id) VALUES ('Stefan Müller',     's.mueller@mail.at',      '0664666666', 6); -- 6
INSERT INTO Customer (customer_name, email, phone, address_id) VALUES ('Monika Schneider',  'm.schneider@hotmail.at', '0664777777', 7); -- 7
INSERT INTO Customer (customer_name, email, phone, address_id) VALUES ('Johann Hofer',      'j.hofer@gmail.at',       '0664888888', 8); -- 8

-- Employees werden mit gehashten Passwörtern über reset-db.mjs eingefügt

-- ─── Rentals ──────────────────────────────────────────────────────────────────
-- Offene Ausleihen (kein Book_Return)
INSERT INTO Rental (rental_date, required_date, customer_id, employee_id, book_copy_id)
    VALUES ('2026-04-20', '2026-05-04', 1, 1, 1);   -- rental 1: Huber, Prozess Neu,       fällig 04.05. (noch offen)
INSERT INTO Rental (rental_date, required_date, customer_id, employee_id, book_copy_id)
    VALUES ('2026-04-10', '2026-05-10', 2, 1, 3);   -- rental 2: Gruber, Zauberberg Neu,   fällig 10.05. (noch offen)
INSERT INTO Rental (rental_date, required_date, customer_id, employee_id, book_copy_id)
    VALUES ('2026-04-15', '2026-04-22', 3, 2, 7);   -- rental 3: Bauer,  Steppenwolf Akz., fällig 22.04. (ÜBERFÄLLIG 5 Tage)
INSERT INTO Rental (rental_date, required_date, customer_id, employee_id, book_copy_id)
    VALUES ('2026-03-01', '2026-03-31', 4, 2, 10);  -- rental 4: Wagner, Vorleser Gut,     fällig 31.03. (ÜBERFÄLLIG 27 Tage)
INSERT INTO Rental (rental_date, required_date, customer_id, employee_id, book_copy_id)
    VALUES ('2026-04-25', '2026-05-09', 5, 3, 15);  -- rental 5: Mayer,  Faust Sehr gut,   fällig 09.05. (noch offen)

-- Abgeschlossene Ausleihen (mit Book_Return)
INSERT INTO Rental (rental_date, required_date, customer_id, employee_id, book_copy_id)
    VALUES ('2026-03-01', '2026-03-22', 1, 1, 5);   -- rental 6: Huber,     Glasperlenspiel, pünktlich zurück
INSERT INTO Rental (rental_date, required_date, customer_id, employee_id, book_copy_id)
    VALUES ('2026-02-15', '2026-03-01', 6, 2, 4);   -- rental 7: Müller,    Zauberberg SG,   pünktlich zurück
INSERT INTO Rental (rental_date, required_date, customer_id, employee_id, book_copy_id)
    VALUES ('2026-03-10', '2026-03-24', 7, 3, 12);  -- rental 8: Schneider, Parfum Gut,      9 Tage zu spät → Stufe 2
INSERT INTO Rental (rental_date, required_date, customer_id, employee_id, book_copy_id)
    VALUES ('2026-02-01', '2026-03-03', 8, 1, 14);  -- rental 9: Hofer,     Vermessung Neu,  pünktlich zurück
INSERT INTO Rental (rental_date, required_date, customer_id, employee_id, book_copy_id)
    VALUES ('2026-01-10', '2026-01-24', 2, 2, 2);   -- rental 10: Gruber,   Prozess Gut,     8 Tage zu spät → Stufe 2

-- ─── Book Returns ─────────────────────────────────────────────────────────────
--                                                     return_date  rental  employee  rent_amount
-- rental 6: 2026-03-01 → 2026-03-14, 13 Tage × 0.40 = 5.20
INSERT INTO Book_Return (return_date, rental_id, employee_id, rent_amount) VALUES ('2026-03-14', 6, 1, 5.20);  -- br 1
-- rental 7: 2026-02-15 → 2026-02-26, 11 Tage × 0.50 = 5.50
INSERT INTO Book_Return (return_date, rental_id, employee_id, rent_amount) VALUES ('2026-02-26', 7, 2, 5.50);  -- br 2
-- rental 8: 2026-03-10 → 2026-04-02, 23 Tage × 0.35 = 8.05  (required: 2026-03-24 → 9 Tage zu spät)
INSERT INTO Book_Return (return_date, rental_id, employee_id, rent_amount) VALUES ('2026-04-02', 8, 3, 8.05);  -- br 3
-- rental 9: 2026-02-01 → 2026-02-18, 17 Tage × 0.55 = 9.35
INSERT INTO Book_Return (return_date, rental_id, employee_id, rent_amount) VALUES ('2026-02-18', 9, 1, 9.35);  -- br 4
-- rental 10: 2026-01-10 → 2026-02-01, 22 Tage × 0.30 = 6.60  (required: 2026-01-24 → 8 Tage zu spät)
INSERT INTO Book_Return (return_date, rental_id, employee_id, rent_amount) VALUES ('2026-02-01', 10, 2, 6.60); -- br 5

-- ─── Admonitions ──────────────────────────────────────────────────────────────
-- Admonition_Type IDs aus library.sql: 1=Stufe 1 (1-7 Tage), 2=Stufe 2 (8-30 Tage), 3=Stufe 3 (>30 Tage)
-- br 3 (Schneider, Parfum) → 9 Tage → Stufe 2
INSERT INTO Admonition (admonition_date, book_return_id, admonition_type_id) VALUES ('2026-04-02', 3, 2);
-- br 5 (Gruber, Prozess) → 8 Tage → Stufe 2
INSERT INTO Admonition (admonition_date, book_return_id, admonition_type_id) VALUES ('2026-02-01', 5, 2);
