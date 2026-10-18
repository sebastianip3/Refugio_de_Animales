import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// src/config → ../../.env = backend/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const HOST = process.env.HOST || 'localhost';
export const PORT = process.env.PORT || 3000;
export const DATABASE_URL = process.env.DATABASE_URL;

// Variables de Email
export const EMAIL_USER = process.env.EMAIL_USER;
export const EMAIL_PASS = process.env.EMAIL_PASS;