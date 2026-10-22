import transporter from '../config/mailer.js';
import { enviarComprobanteInscripcion } from '../services/correo.service.js';

// Datos falsos 
const inscripcion = {
  id: 1,
  codigoComprobante: 'EST-0001-PRUEBA',
  createdAt: new Date(),

  tutorNombre: 'Jose',
  tutorApellido: 'Prueba',
  tutorRut: '11111111-1',
  tutorEmail: 'sebemabj@gmail.com', 
  tutorComuna: 'Hualqui',
  tutorSector: 'Oeste',

  sexo: 'HEMBRA',
  tamano: 'MEDIANO',
  pesoEstimado: 12,

  jornada: {
    nombre: 'Jornada de esterilización',
    fecha: new Date('2026-11-15T10:00:00'),
    lugar: 'Sede x',
    comuna: 'Concepción',
    sector: 'Centro',
    indicacionesPostOperatorias:
      'Mantener reposo por 7 días.\nNo bañar hasta retirar los puntos.',
  },

  especie: { nombre: 'Perro' },
};

try {
  // comprueba las credenciales de Gmail sin enviar nada
  await transporter.verify();
  console.log('✔ Conexión con Gmail correcta');

  // envía el correo real con el PDF adjunto
  const info = await enviarComprobanteInscripcion(inscripcion);
  console.log('  Correo enviado');
  console.log('  messageId:', info.messageId);
  console.log('  aceptado por:', info.accepted);
  console.log('  rechazado por:', info.rejected);
} catch (error) {
  console.error('  Falló el envío:', error.code, '-', error.message);
}