import nodemailer from 'nodemailer';
import { EMAIL_USER, EMAIL_PASS } from './configEnv.js';

// necesita las credenciales
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

// Gmail solo permite enviar como la cuenta autenticada
export const REMITENTE = `"Refugio de Animales" <${EMAIL_USER}>`;

export default transporter;
