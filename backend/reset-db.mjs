import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import bcrypt from 'bcrypt';

const db = new Database('./library.db');
db.pragma('foreign_keys = ON');

db.exec(readFileSync('./library.sql', 'utf8'));
console.log('Schema erstellt');

const employees = [
  { name: 'Gertrude Wimmer', username: 'gwimmer',  password: 'sicher01' },
  { name: 'Markus Fischer',  username: 'mfischer', password: 'sicher02' },
  { name: 'Sabine Koch',     username: 'skoch',    password: 'sicher03' },
];

const stmt = db.prepare('INSERT INTO Employee (employee_name, employee_username, employee_password) VALUES (?, ?, ?)');
for (const { name, username, password } of employees) {
  stmt.run(name, username, bcrypt.hashSync(password, 10));
}
console.log('Mitarbeiter mit gehashten Passwörtern eingefügt');

db.exec(readFileSync('./seed.sql', 'utf8'));
console.log('Seed-Daten eingefügt');

db.close();
console.log('Fertig!');
