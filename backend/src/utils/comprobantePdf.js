import PDFDocument from 'pdfkit';

const SEXOS = { MACHO: 'Macho', HEMBRA: 'Hembra' };
const TAMANOS = { PEQUENO: 'Pequeño', MEDIANO: 'Mediano', GRANDE: 'Grande' };

export function formatearFecha(fecha) {
  return fecha.toLocaleString('es-CL', {
    timeZone: 'America/Santiago',
    dateStyle: 'full',
    timeStyle: 'short',
  });
}

function seccion(doc, titulo) {
  doc.moveDown().font('Helvetica-Bold').fontSize(13).text(titulo).moveDown(0.3);
  doc.font('Helvetica').fontSize(11);
}

function campo(doc, etiqueta, valor) {
  doc.font('Helvetica-Bold').text(`${etiqueta}: `, { continued: true });
  doc.font('Helvetica').text(valor ?? '—');
}

// inscripcion debe venir con { jornada, especie } incluidos.
// Devuelve el PDF como Buffer para adjuntarlo sin escribir archivos en disco.
export function generarComprobantePdf(inscripcion) {
  const { jornada, especie } = inscripcion;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const partes = [];

    doc.on('data', (parte) => partes.push(parte));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);

    // Encabezado
    doc.font('Helvetica-Bold').fontSize(18).text('Comprobante de inscripción', { align: 'center' });
    doc.fontSize(12).text('Jornada de esterilización', { align: 'center' });
    doc.moveDown().fontSize(14).text(`Folio: ${inscripcion.codigoComprobante}`, { align: 'center' });

    seccion(doc, 'Datos de la jornada');
    campo(doc, 'Jornada', jornada.nombre);
    campo(doc, 'Fecha y hora', formatearFecha(jornada.fecha));
    campo(doc, 'Lugar', jornada.lugar);
    campo(doc, 'Comuna', jornada.comuna);
    if (jornada.sector) campo(doc, 'Sector', jornada.sector);

    seccion(doc, 'Datos del tutor');
    campo(doc, 'Nombre', `${inscripcion.tutorNombre} ${inscripcion.tutorApellido}`);
    campo(doc, 'RUT', inscripcion.tutorRut);
    campo(doc, 'Correo', inscripcion.tutorEmail);
    campo(doc, 'Comuna / sector', `${inscripcion.tutorComuna}, ${inscripcion.tutorSector}`);

    seccion(doc, 'Datos de la mascota');
    campo(doc, 'Especie', especie.nombre);
    campo(doc, 'Sexo', SEXOS[inscripcion.sexo]);
    campo(doc, 'Tamaño', TAMANOS[inscripcion.tamano]);
    campo(doc, 'Peso estimado', `${inscripcion.pesoEstimado} kg`);

    seccion(doc, 'Recomendaciones post esterilización');
    doc.text(jornada.indicacionesPostOperatorias, { align: 'justify' });

    doc
      .moveDown(2)
      .fontSize(9)
      .fillColor('gray')
      .text(`Emitido el ${formatearFecha(inscripcion.createdAt)}`, { align: 'center' });

    doc.end();
  });
}