import transporter, { REMITENTE } from '../config/mailer.js';
import { generarComprobantePdf, formatearFecha, RUTA_FOTO_REFUGIO } from '../utils/comprobantePdf.js';

const FOTO_REFUGIO = {
  filename: 'refugioAnimales.jpg',
  path: RUTA_FOTO_REFUGIO,
  cid: 'fotoRefugio',
};

//foto pequeña y centrada
const FOTO_CORREO = 
   `<p style="text-align:center; margin-top:24px;">
    <img src="cid:fotoRefugio" alt="Refugio de Animales" width="120" style="border-radius:8px;"><br>
    <small style="color:gray;">Refugio de Animales</small>
    </p>`;

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
      ${FOTO_CORREO}
    `,
    attachments: [
      FOTO_REFUGIO,
      {
        filename: `comprobante-${inscripcion.codigoComprobante}.pdf`,
        content: pdf,
        contentType: 'application/pdf',
      },
    ],
  });
}

// Confirma al adoptante que su solicitud de adopción fue recibida.
// adopcion debe venir con { animal } incluido
export function enviarSolicitudRecibida(adopcion) {
  const nombreAnimal = adopcion.animal?.nombre || 'la mascota';

  return transporter.sendMail({
    from: REMITENTE,
    to: adopcion.email,
    subject: `Recibimos tu solicitud para adoptar a ${nombreAnimal}`,
    text: [
      `Hola ${adopcion.nombre}, recibimos tu solicitud para adoptar a ${nombreAnimal}.`,
      'Nuestro equipo la revisará y te avisaremos por correo cuando sea aprobada o rechazada.',
      '',
      'Mientras tanto, puedes consultar el estado de tu solicitud en la página de Adopciones con tu RUT y este correo.',
      '',
      'Gracias por querer darle un hogar a un animal.',
      'Refugio de Animales',
    ].join('\n'),
    html: `
      <p>Hola <strong>${escaparHtml(adopcion.nombre)}</strong>, recibimos tu solicitud para adoptar a <strong>${escaparHtml(nombreAnimal)}</strong>.</p>
      <p>Nuestro equipo la revisará y te avisaremos por correo cuando sea <strong>aprobada o rechazada</strong>.</p>
      <p>Mientras tanto, puedes consultar el estado de tu solicitud en la página de <strong>Adopciones</strong> con tu RUT y este correo.</p>
      <p>Gracias por querer darle un hogar a un animal.</p>
      ${FOTO_CORREO}
    `,
    attachments: [FOTO_REFUGIO],
  });
}

// Avisa al adoptante si su solicitud fue aprobada o rechazada.
// adopcion debe venir con { animal } incluido
export async function enviarResultadoAdopcion(adopcion) {
  const nombreAnimal = adopcion.animal?.nombre || `el animal #${adopcion.animalId}`;
  const aprobada = adopcion.estado === 'APROBADA';

  const asunto = aprobada
    ? `¡Tu solicitud para adoptar a ${nombreAnimal} fue aprobada!`
    : `Resultado de tu solicitud para adoptar a ${nombreAnimal}`;

  const lineas = aprobada
    ? [
        `Hola ${adopcion.nombre}, ¡tenemos buenas noticias!`,
        `Tu solicitud para adoptar a ${nombreAnimal} fue aprobada.`,
        'Pronto nos pondremos en contacto contigo para coordinar la entrega.',
      ]
    : [
        `Hola ${adopcion.nombre}, revisamos tu solicitud para adoptar a ${nombreAnimal}.`,
        'Lamentablemente, esta vez no fue aprobada.',
        '',
        'Motivo del rechazo:',
        adopcion.observaciones,
      ];

  const cuerpoHtml = aprobada
    ? `
      <p>Hola <strong>${escaparHtml(adopcion.nombre)}</strong>, ¡tenemos buenas noticias!</p>
      <p>Tu solicitud para adoptar a <strong>${escaparHtml(nombreAnimal)}</strong> fue <strong>aprobada</strong>.</p>
      <p>Pronto nos pondremos en contacto contigo para coordinar la entrega.</p>
    `
    : `
      <p>Hola <strong>${escaparHtml(adopcion.nombre)}</strong>, revisamos tu solicitud para adoptar a <strong>${escaparHtml(nombreAnimal)}</strong>.</p>
      <p>Lamentablemente, esta vez <strong>no fue aprobada</strong>.</p>
      <h3>Motivo del rechazo</h3>
      <p>${escaparHtml(adopcion.observaciones).replace(/\n/g, '<br>')}</p>
    `;

  return transporter.sendMail({
    from: REMITENTE,
    to: adopcion.email,
    subject: asunto,
    text: [...lineas, '', 'Gracias por querer darle un hogar a un animal.', 'Refugio de Animales'].join('\n'),
    // El logo va al final y ya incluye la firma "Refugio de Animales"
    html: `${cuerpoHtml}<p>Gracias por querer darle un hogar a un animal.</p>${FOTO_CORREO}`,
    attachments: [FOTO_REFUGIO],
  });
}

// "AAAA-MM-DD..." → "DD-MM-AAAA". Las visitas se guardan a medianoche UTC, así no se desfasa el día
const formatearDiaVisita = (fecha) => fecha.toISOString().slice(0, 10).split('-').reverse().join('-');

// Avisa al adoptante que se agendó o se canceló una visita de seguimiento.
// adopcion debe venir con { nombre, email, animal }
export function enviarAvisoVisita(adopcion, visita) {
  const nombreAnimal = adopcion.animal?.nombre || 'tu mascota';
  // Las visitas antiguas no tienen hora
  const fecha = visita.hora
    ? `${formatearDiaVisita(visita.fecha)} a las ${visita.hora}`
    : formatearDiaVisita(visita.fecha);
  const cancelada = visita.estado === 'CANCELADA';

  const asunto = cancelada
    ? `Visita de seguimiento del ${fecha} cancelada`
    : `Visita de seguimiento agendada para el ${fecha}`;

  const texto = cancelada
    ? [
        `Hola ${adopcion.nombre}, te informamos que la visita de seguimiento de ${nombreAnimal} agendada para el ${fecha} fue cancelada.`,
        'Si corresponde, te avisaremos cuando agendemos una nueva fecha.',
      ]
    : [
        `Hola ${adopcion.nombre}, agendamos una visita de seguimiento para ver cómo está ${nombreAnimal} en su nuevo hogar.`,
        `Fecha y hora de la visita: ${fecha}`,
        'Si no puedes recibirnos ese día, responde este correo para coordinar otra fecha.',
      ];

  const html = cancelada
    ? `
      <p>Hola <strong>${escaparHtml(adopcion.nombre)}</strong>, te informamos que la visita de seguimiento de <strong>${escaparHtml(nombreAnimal)}</strong> agendada para el <strong>${fecha}</strong> fue <strong>cancelada</strong>.</p>
      <p>Si corresponde, te avisaremos cuando agendemos una nueva fecha.</p>
      ${FOTO_CORREO}
    `
    : `
      <p>Hola <strong>${escaparHtml(adopcion.nombre)}</strong>, agendamos una visita de seguimiento para ver cómo está <strong>${escaparHtml(nombreAnimal)}</strong> en su nuevo hogar.</p>
      <p><strong>Fecha y hora de la visita:</strong> ${fecha}</p>
      <p>Si no puedes recibirnos ese día, responde este correo para coordinar otra fecha.</p>
      ${FOTO_CORREO}
    `;

  return transporter.sendMail({
    from: REMITENTE,
    to: adopcion.email,
    subject: asunto,
    text: [...texto, '', 'Refugio de Animales'].join('\n'),
    html,
    attachments: [FOTO_REFUGIO],
  });
}

// Avisa al adoptante que, después de la visita de seguimiento, la adopción fue rechazada
// y el animal vuelve al refugio. adopcion debe venir con { nombre, email, animal, observaciones }
export function enviarAdopcionRechazadaTrasVisita(adopcion, visita) {
  const nombreAnimal = adopcion.animal?.nombre || 'el animal';
  const fecha = formatearDiaVisita(visita.fecha);

  return transporter.sendMail({
    from: REMITENTE,
    to: adopcion.email,
    subject: `Resultado de la visita de seguimiento de ${nombreAnimal}`,
    text: [
      `Hola ${adopcion.nombre}, después de la visita de seguimiento del ${fecha} revisamos las condiciones en que se encuentra ${nombreAnimal}.`,
      'Lamentablemente, decidimos dejar sin efecto la adopción y el animal volverá al refugio.',
      '',
      'Motivo:',
      adopcion.observaciones,
      '',
      'Nos pondremos en contacto contigo para coordinar el retiro.',
      '',
      'Refugio de Animales',
    ].join('\n'),
    html: `
      <p>Hola <strong>${escaparHtml(adopcion.nombre)}</strong>, después de la visita de seguimiento del <strong>${fecha}</strong> revisamos las condiciones en que se encuentra <strong>${escaparHtml(nombreAnimal)}</strong>.</p>
      <p>Lamentablemente, decidimos <strong>dejar sin efecto la adopción</strong> y el animal volverá al refugio.</p>
      <h3>Motivo</h3>
      <p>${escaparHtml(adopcion.observaciones).replace(/\n/g, '<br>')}</p>
      <p>Nos pondremos en contacto contigo para coordinar el retiro.</p>
      ${FOTO_CORREO}
    `,
    attachments: [FOTO_REFUGIO],
  });
}

export async function enviarCambiosJornada(inscripcion, jornada, cambios) {
  const pdf = await generarComprobantePdf({ ...inscripcion, jornada});

  return transporter.sendMail({
    from: REMITENTE,
    to: inscripcion.tutorEmail,
    subject: `Cambios en la jornada: ${jornada.nombre}`,
    text: [
      `Hola ${inscripcion.tutorNombre}, la jornada de esterilización en las que estas incrito tuvo cambios: `, 
      ...cambios,
      '',
      `tu folio ${inscripcion.codigoComprobante} sigue siendo válido. Adjuntamos tu comprobante actualizado. `,
    ].join('\n'),
    html: `
      <p>Hola <strong>${escaparHtml(inscripcion.tutorNombre)}</strong>, la jornada
      <strong>${escaparHtml(jornada.nombre)}</strong> tuvo cambios:</p>
      <ul>${cambios.map((c) => `<li>${escaparHtml(c)}</li>`).join('')}</ul>
      <p>Tu folio <strong>${inscripcion.codigoComprobante}</strong> sigue siendo válido.
      Adjuntamos tu comprobante actualizado.</p>
      ${FOTO_CORREO}
      `,
      attachments: [
        FOTO_REFUGIO,
        {
          filename: `comprobante-${inscripcion.codigoComprobante}.pdf`,
          content: pdf,
          contentType: 'application/pdf',
        },
      ],
  });
}

export async function enviarCancelacionInscripcion(inscripcion) {
  const { jornada } = inscripcion;
  const motivo = inscripcion.observaciones
  ? `<p><strong>Motivo:</strong> ${escaparHtml(inscripcion.observaciones)}</p>`
  : '';

  return transporter.sendMail({
    from: REMITENTE,
    to: inscripcion.tutorEmail,
    subject: `Inscripción cancelada: ${jornada.nombre}`,
    text: [
      `Hola ${inscripcion.tutorNombre}, tu inscripción (folio ${inscripcion.codigoComprobante})`,
      `a la jornada "${jornada.nombre}" del ${formatearFecha(jornada.fecha)} fue cancelada`,
      inscripcion.observaciones ? `Motivo: ${inscripcion.observaciones}` : '',
      '',
      'Sí crees que es un error, contacta al refugio indicando tu folio.',
    ].join('\n'),
    html:`
    <p>Hola <strong>${escaparHtml(inscripcion.tutorNombre)}</strong>, tu inscripción
    (folio <strong>${inscripcion.codigoComprobante}</strong>) a la jornada
    <strong>${escaparHtml(jornada.nombre)}</strong> del ${formatearFecha(jornada.fecha)} fue <strong>cancelada</strong>.</p>
    ${motivo}
    <p>Si crees que es un error, contacta al refugio indicando tu folio.</p>
    ${FOTO_CORREO}
    `,
    attachments: [FOTO_REFUGIO],
   });
}
