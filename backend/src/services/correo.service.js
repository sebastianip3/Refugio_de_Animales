import transporter, { REMITENTE } from '../config/mailer.js';
import { generarComprobantePdf, formatearFecha } from '../utils/comprobantePdf.js';

// Mecanismo de seguridad: forzar que tales argumentos recibidos se conviertan en string
function escaparHtml(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// inscripcion debe venir con { jornada, especie } incluidos
export async function enviarComprobanteInscripcion(inscripcion) {
  const { jornada } = inscripcion;
  const pdf = await generarComprobantePdf(inscripcion);
  const indicaciones = escaparHtml(jornada.indicacionesPostOperatorias).replace(/\n/g, '<br>');

  return transporter.sendMail({
    from: REMITENTE,
    to: inscripcion.tutorEmail,
    subject: `Inscripción confirmada: ${jornada.nombre}`,
    text: [
      `Hola ${inscripcion.tutorNombre}, tu inscripción a la jornada de esterilización fue confirmada.`,
      `Folio: ${inscripcion.codigoComprobante}`,
      `Fecha: ${formatearFecha(jornada.fecha)}`,
      `Lugar: ${jornada.lugar}, ${jornada.comuna}`,
      '',
      'Recomendaciones post esterilización:',
      jornada.indicacionesPostOperatorias,
      '',
      'Adjuntamos tu comprobante en PDF.',
    ].join('\n'),
    html: `
      <p>Hola <strong>${escaparHtml(inscripcion.tutorNombre)}</strong>, tu inscripción a la jornada de esterilización fue confirmada.</p>
      <ul>
        <li><strong>Folio:</strong> ${inscripcion.codigoComprobante}</li>
        <li><strong>Fecha:</strong> ${formatearFecha(jornada.fecha)}</li>
        <li><strong>Lugar:</strong> ${escaparHtml(jornada.lugar)}, ${escaparHtml(jornada.comuna)}</li>
      </ul>
      <h3>Recomendaciones post esterilización</h3>
      <p>${indicaciones}</p>
      <p>Adjuntamos tu comprobante en PDF. Preséntalo el día de la jornada.</p>
    `,
    attachments: [
      {
        filename: `comprobante-${inscripcion.codigoComprobante}.pdf`,
        content: pdf,
        contentType: 'application/pdf',
      },
    ],
  });
}