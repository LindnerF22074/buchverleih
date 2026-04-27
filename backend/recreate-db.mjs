import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
const db = new Database('./library.db');
const sql = readFileSync('./library.sql', 'utf8');
db.exec(sql);
console.log('DB recreated OK');
db.close();
