import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { adopcionesApi, animalesApi } from "../services/api.js";
import {
  adopcionFormSchema,
  consultaSolicitudSchema,
  COMUNAS,
  formatearRut,
  formatearTelefono,
  TIPOS_VIVIENDA,
} from "../schemas/adopcion.schema.js";
import { hoyComoTexto } from "../schemas/registroClinico.schema.js";
import { puedeEvaluarAdopciones } from "../utils.js";

// Botones de la evaluación. No hay "Cancelar": cumple la misma función que "Rechazar"
const ACCIONES = {
  PENDIENTE: [
    { estado: "EN_REVISION", label: "Pasar a revisión" },
    { estado: "APROBADA", label: "Aprobar" },
    { estado: "RECHAZADA", label: "Rechazar" },
  ],

  EN_REVISION: [
    { estado: "APROBADA", label: "Aprobar" },
    { estado: "RECHAZADA", label: "Rechazar" },
  ],
};

// Colores de cada estado (insignias, filtros y botones de evaluación)
const ESTILO_ESTADO = {
  PENDIENTE: "bg-amber-100 text-amber-800 ring-amber-200",
  EN_REVISION: "bg-sky-100 text-sky-800 ring-sky-200",
  APROBADA: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  RECHAZADA: "bg-rose-100 text-rose-800 ring-rose-200",
};

const ESTILO_ACCION = {
  EN_REVISION: "bg-sky-600 hover:bg-sky-700 text-white",
  APROBADA: "bg-emerald-600 hover:bg-emerald-700 text-white",
  RECHAZADA: "bg-rose-600 hover:bg-rose-700 text-white",
};

const FILTROS = ["TODAS", "PENDIENTE", "EN_REVISION", "APROBADA", "RECHAZADA"];

const FORMULARIO_VACIO = {
  animalId: "",
  nombre: "",
  rut: "",
  email: "",
  telefono: "",
  direccion: "",
  comuna: "",
  tipoVivienda: "",
  otrasMascotas: "",
  motivo: "",
};

const formatearEnum = (valor) =>
  valor.replaceAll("_", " ").toLowerCase();

function aPayload(formulario) {
  const textoONull = (valor) =>
    valor.trim() === "" ? null : valor.trim();

  return {
    animalId: Number(formulario.animalId),
    nombre: formulario.nombre.trim(),
    rut: formulario.rut.trim(),
    email: formulario.email.trim(),
    telefono: formulario.telefono.trim(),
    direccion: formulario.direccion.trim(),
    comuna: formulario.comuna,
    tipoVivienda: textoONull(formulario.tipoVivienda),
    otrasMascotas: textoONull(formulario.otrasMascotas),
    motivo: textoONull(formulario.motivo),
  };
}

// Datos de la ficha que el encargado revisa antes de evaluar
const CAMPOS_FICHA = [
  { campo: "nombre", label: "Adoptante" },
  { campo: "rut", label: "RUT" },
  { campo: "email", label: "Correo electrónico" },
  { campo: "telefono", label: "Teléfono" },
  { campo: "direccion", label: "Dirección" },
  { campo: "comuna", label: "Comuna" },
  { campo: "tipoVivienda", label: "Tipo de vivienda" },
  { campo: "otrasMascotas", label: "Otras mascotas" },
  { campo: "motivo", label: "Motivo de la adopción" },
];

const claseCampo =
  "mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-800 shadow-sm placeholder:text-slate-400 transition focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-100";

const claseTarjeta = "rounded-3xl bg-white/90 p-6 shadow-xl shadow-sky-900/5 ring-1 ring-slate-200 backdrop-blur sm:p-8";

function Campo({ id, label, error, opcional, className = "", children }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
        {opcional && <span className="ml-1 font-normal text-slate-400">(opcional)</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-rose-600">{error.message}</p>}
    </div>
  );
}

// Si la URL de la foto no carga, se muestra el ícono de la especie
function FotoAnimal({ animal }) {
  // Se guarda la URL que falló, para volver a intentar si cambia el animal
  const [urlFallida, setUrlFallida] = useState(null);

  if (animal.fotografiaUrl && animal.fotografiaUrl !== urlFallida) {
    return (
      <img
        src={animal.fotografiaUrl}
        alt={animal.nombre || "Mascota"}
        onError={() => setUrlFallida(animal.fotografiaUrl)}
        className="h-10 w-10 rounded-full object-cover"
      />
    );
  }
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl">
      {animal.especie?.nombre === "Gato" ? "🐱" : "🐶"}
    </span>
  );
}

function InsigniaEstado({ estado }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${ESTILO_ESTADO[estado]}`}
    >
      {formatearEnum(estado)}
    </span>
  );
}

function Aviso({ tipo, children }) {
  const estilos =
    tipo === "error"
      ? "bg-rose-50 text-rose-800 ring-rose-200"
      : "bg-emerald-50 text-emerald-800 ring-emerald-200";
  return (
    <div className={`flex items-start gap-3 rounded-2xl px-4 py-3 text-sm ring-1 ${estilos}`}>
      <span aria-hidden="true">{tipo === "error" ? "⚠️" : "✅"}</span>
      <p>{children}</p>
    </div>
  );
}

// La fecha se guarda a medianoche UTC: "AAAA-MM-DD" → "DD-MM-AAAA" sin desfase de zona horaria
const formatearFechaVisita = (fecha) => fecha.slice(0, 10).split("-").reverse().join("-");

// Días mínimos entre la adopción y la visita (igual que en el backend)
const DIAS_MINIMOS_VISITA = 15;

// Horarios fijos de visita (igual que en el backend). Son pocos porque entre una visita y otra
// hay que viajar de una comuna a otra
const HORAS_VISITA = ["10:00", "12:00", "15:00"];

// "17-12-2026" o "17-12-2026 a las 10:30" (las visitas antiguas no tienen hora)
const textoVisita = (visita) =>
  visita.hora
    ? `${formatearFechaVisita(visita.fecha)} a las ${visita.hora}`
    : formatearFechaVisita(visita.fecha);

// Cómo se encontró al animal en la visita (enum EstadoAnimalVisita del backend)
const ESTADOS_ANIMAL_VISITA = {
  BIEN: { texto: "Bien", clase: "bg-emerald-100 text-emerald-800" },
  REGULAR: { texto: "Regular", clase: "bg-amber-100 text-amber-800" },
  CON_PROBLEMAS: { texto: "Con problemas", clase: "bg-rose-100 text-rose-800" },
};

const RESULTADO_VACIO = { estadoAnimal: "", observaciones: "" };

// Hora actual como "HH:MM", para comparar con los horarios de visita
const horaActual = () => {
  const ahora = new Date();
  return `${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`;
};

// "AAAA-MM-DD" del día siguiente
const diaSiguiente = (texto) => {
  const [anio, mes, dia] = texto.split("-").map(Number);
  return aTextoFecha(new Date(anio, mes - 1, dia + 1));
};

// Date → "AAAA-MM-DD" en hora local, el formato del input type="date"
const aTextoFecha = (fecha) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;

// Al aprobar, el animal registra su egreso: esa es la fecha de la adopción
const fechaDeAdopcion = (adopcion) => new Date(adopcion.animal?.fechaEgreso ?? adopcion.updatedAt);

// Primer día en que se puede agendar la visita: 15 días después de la adopción
const fechaMinimaVisita = (adopcion) => {
  const base = fechaDeAdopcion(adopcion);
  return aTextoFecha(new Date(base.getFullYear(), base.getMonth(), base.getDate() + DIAS_MINIMOS_VISITA));
};

// Visitas post adopción: el encargado agenda una visita después de aprobar la adopción.
// Solo desde 15 días después de la adopción y una a la vez
// onCambio avisa a la página que cambiaron las visitas (para actualizar "Próximas visitas")
// visitasAgendadas: próximas visitas de todas las adopciones, para no repetir un horario ocupado
function VisitasAdopcion({ adopcion, visitasAgendadas = [], onAdopcionRechazada, onCambio }) {
  const [visitas, setVisitas] = useState([]);
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);
  // Visita a la que se le está registrando el resultado (solo una a la vez)
  const [registrandoId, setRegistrandoId] = useState(null);
  const [resultado, setResultado] = useState(RESULTADO_VACIO);

  useEffect(() => {
    let activo = true;

    adopcionesApi
      .listarVisitas(adopcion.id)
      .then((lista) => activo && setVisitas(lista))
      .catch((err) => activo && setError(`No se pudieron cargar las visitas: ${err.message}`));

    // Evita actualizar el estado si se cerró la ficha antes de que responda
    return () => {
      activo = false;
    };
  }, [adopcion.id]);

  const hoy = hoyComoTexto();
  const ahora = horaActual();

  // Si ya pasó el último horario del día, hoy no se puede agendar
  const primerDiaDisponible = ahora >= HORAS_VISITA.at(-1) ? diaSiguiente(hoy) : hoy;

  // La nueva visita debe ser al menos el día después de la última (las canceladas no cuentan)
  const ultimaVisita = visitas
    .filter((visita) => visita.estado !== "CANCELADA")
    .map((visita) => visita.fecha.slice(0, 10))
    .sort()
    .at(-1);

  // Primer día que se puede elegir: 15 días después de la adopción, desde hoy y después de la última visita
  const fechaMinima = [fechaMinimaVisita(adopcion), primerDiaDisponible, ultimaVisita ? diaSiguiente(ultimaVisita) : ""]
    .sort()
    .at(-1);

  // Si la visita es hoy, solo se pueden elegir horas posteriores a la actual
  const horaYaPaso = (dia, opcion) => dia === hoy && opcion <= ahora;

  // Un horario que ya tiene otra visita ese día (de cualquier adopción) está ocupado
  const horaOcupada = (dia, opcion) =>
    visitasAgendadas.some((visita) => visita.fecha.slice(0, 10) === dia && visita.hora === opcion);

  const horaDisponible = (opcion) => !horaYaPaso(fecha, opcion) && !horaOcupada(fecha, opcion);

  const handleCambiarFecha = (nuevaFecha) => {
    setFecha(nuevaFecha);
    // La hora elegida puede dejar de estar disponible al cambiar de día
    if (hora && (horaYaPaso(nuevaFecha, hora) || horaOcupada(nuevaFecha, hora))) setHora("");
  };

  // Una visita agendada de hoy en adelante se puede cancelar
  const esProxima = (visita) => visita.estado === "AGENDADA" && visita.fecha.slice(0, 10) >= hoyComoTexto();

  // Si ya tiene una visita próxima no se puede agendar otra (las canceladas no cuentan)
  const visitaPendiente = visitas.find(esProxima);

  // Desde la hora de la visita se puede registrar su resultado (las antiguas sin hora, desde las 00:00)
  const puedeRegistrar = (visita) =>
    visita.estado === "AGENDADA" && new Date() >= new Date(`${visita.fecha.slice(0, 10)}T${visita.hora ?? "00:00"}`);

  // La fecha ya pasó y nadie registró el resultado
  const sinRegistrar = (visita) => visita.estado === "AGENDADA" && visita.fecha.slice(0, 10) < hoyComoTexto();

  const abrirRegistro = (visita) => {
    setError("");
    setMensaje("");
    setResultado(RESULTADO_VACIO);
    setRegistrandoId(visita.id);
  };

  const handleRegistrar = async (visita) => {
    setMensaje("");
    if (!resultado.estadoAnimal) {
      setError("Seleccione cómo se encontró al animal");
      return;
    }
    if (resultado.observaciones.trim().length < 3) {
      setError("Escriba las observaciones de la visita (al menos 3 caracteres)");
      return;
    }

    try {
      setGuardando(true);
      setError("");
      const realizada = await adopcionesApi.registrarResultadoVisita(adopcion.id, visita.id, {
        estadoAnimal: resultado.estadoAnimal,
        observaciones: resultado.observaciones.trim(),
      });
      setVisitas((lista) => lista.map((item) => (item.id === realizada.id ? realizada : item)));
      onCambio?.();
      setRegistrandoId(null);
      setMensaje(`Resultado de la visita del ${textoVisita(realizada)} registrado.`);
    } catch (err) {
      setError(`No se pudo registrar el resultado: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  };

  // Después de la visita, si el hogar no reúne las condiciones, el encargado rechaza la adopción.
  // Las observaciones de la visita quedan como motivo y el animal vuelve al refugio
  const handleRechazarAdopcion = async (visita) => {
    if (
      !window.confirm(
        `¿Rechazar la adopción de ${adopcion.animal?.nombre || "este animal"} (${adopcion.nombre})? El animal volverá al refugio y se avisará al adoptante. Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    try {
      setGuardando(true);
      setError("");
      setMensaje("");
      const { correoEnviado } = await adopcionesApi.rechazarAdopcionTrasVisita(adopcion.id, visita.id);
      // La adopción ya no está aprobada: la página cierra el seguimiento y recarga
      onAdopcionRechazada?.(correoEnviado);
    } catch (err) {
      setError(`No se pudo rechazar la adopción: ${err.message}`);
      setGuardando(false);
    }
  };

  // Texto según si el correo al adoptante salió o no
  const textoCorreo = (visita) =>
    visita.correoEnviado
      ? "Se notificó al adoptante por correo."
      : `No se pudo enviar el correo al adoptante (${adopcion.email}); avísale por otro medio.`;

  const handleCancelar = async (visita) => {
    if (!window.confirm(`¿Cancelar la visita del ${textoVisita(visita)}? Se avisará al adoptante.`)) {
      return;
    }

    try {
      setError("");
      setMensaje("");
      const cancelada = await adopcionesApi.cancelarVisita(adopcion.id, visita.id);
      setVisitas((lista) => lista.map((item) => (item.id === cancelada.id ? cancelada : item)));
      onCambio?.();
      const texto = `Visita del ${textoVisita(cancelada)} cancelada. ${textoCorreo(cancelada)}`;
      cancelada.correoEnviado ? setMensaje(texto) : setError(texto);
    } catch (err) {
      setError(`No se pudo cancelar la visita: ${err.message}`);
    }
  };

  const handleAgendar = async () => {
    setMensaje("");
    if (!fecha) {
      setError("Seleccione la fecha de la visita");
      return;
    }
    if (fecha < fechaMinima) {
      setError(`La visita se puede agendar desde el ${formatearFechaVisita(fechaMinima)}`);
      return;
    }
    if (!hora) {
      setError("Seleccione la hora de la visita");
      return;
    }
    // Revisa con la hora del momento, por si la ventana estuvo abierta un rato
    if (horaOcupada(fecha, hora)) {
      setError(`El horario del ${formatearFechaVisita(fecha)} a las ${hora} ya está ocupado por otra visita, elija otra hora`);
      return;
    }
    if (fecha === hoyComoTexto() && hora <= horaActual()) {
      setError("Esa hora ya pasó, elija una hora posterior a la actual");
      return;
    }

    try {
      setGuardando(true);
      setError("");
      const nueva = await adopcionesApi.agendarVisita(adopcion.id, fecha, hora);
      setVisitas((lista) => [...lista, nueva].sort((a, b) => a.fecha.localeCompare(b.fecha)));
      onCambio?.();
      setFecha("");
      setHora("");
      const texto = `Visita agendada para el ${textoVisita(nueva)}. ${textoCorreo(nueva)}`;
      nueva.correoEnviado ? setMensaje(texto) : setError(texto);
    } catch (err) {
      setError(`No se pudo agendar la visita: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="mt-6">
      <h4 className="text-lg font-bold text-slate-900">Visitas agendadas</h4>

      {error && (
        <div className="mt-3">
          <Aviso tipo="error">{error}</Aviso>
        </div>
      )}
      {mensaje && (
        <div className="mt-3">
          <Aviso tipo="exito">{mensaje}</Aviso>
        </div>
      )}

      {visitas.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Aún no hay visitas agendadas.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {visitas.map((visita) => (
            <li key={visita.id} className="rounded-xl bg-slate-50 px-4 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={visita.estado === "CANCELADA" ? "text-slate-400 line-through" : "text-slate-800"}>
                  🏠 Visita el {textoVisita(visita)}
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  {visita.estado === "CANCELADA" && (
                    <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                      Cancelada
                    </span>
                  )}
                  {visita.estado === "REALIZADA" && (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                      Realizada
                    </span>
                  )}
                  {sinRegistrar(visita) && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                      Sin registrar
                    </span>
                  )}
                  {puedeRegistrar(visita) && registrandoId !== visita.id && (
                    <button
                      type="button"
                      onClick={() => abrirRegistro(visita)}
                      className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700"
                    >
                      Registrar resultado
                    </button>
                  )}
                  {esProxima(visita) && (
                    <button
                      type="button"
                      onClick={() => handleCancelar(visita)}
                      className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-50"
                    >
                      Cancelar visita
                    </button>
                  )}
                </div>
              </div>

              {/* Resultado ya registrado */}
              {visita.estado === "REALIZADA" && (
                <div className="mt-2 border-t border-slate-200 pt-2">
                  <p className="text-xs text-slate-500">
                    Estado del animal:{" "}
                    <span
                      className={`rounded-full px-2 py-0.5 font-semibold ${ESTADOS_ANIMAL_VISITA[visita.estadoAnimal]?.clase ?? ""}`}
                    >
                      {ESTADOS_ANIMAL_VISITA[visita.estadoAnimal]?.texto ?? "—"}
                    </span>
                  </p>
                  <p className="mt-1 whitespace-pre-line break-words text-slate-700">{visita.observaciones}</p>

                  {/* Si el hogar no reúne las condiciones, el encargado puede rechazar la adopción */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-slate-500">
                      ¿El hogar no reúne las condiciones? El animal vuelve al refugio.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleRechazarAdopcion(visita)}
                      disabled={guardando}
                      className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Rechazar adopción
                    </button>
                  </div>
                </div>
              )}

              {/* Formulario para registrar el resultado */}
              {registrandoId === visita.id && (
                <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
                  <div>
                    <label htmlFor={`estadoAnimal-${visita.id}`} className="text-sm font-medium text-slate-700">
                      ¿Cómo se encontró al animal?
                    </label>
                    <select
                      id={`estadoAnimal-${visita.id}`}
                      value={resultado.estadoAnimal}
                      onChange={(e) => setResultado((r) => ({ ...r, estadoAnimal: e.target.value }))}
                      className={claseCampo}
                    >
                      <option value="">Seleccione</option>
                      {Object.entries(ESTADOS_ANIMAL_VISITA).map(([valor, { texto }]) => (
                        <option key={valor} value={valor}>
                          {texto}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`observaciones-${visita.id}`} className="text-sm font-medium text-slate-700">
                      Observaciones de la visita
                    </label>
                    <textarea
                      id={`observaciones-${visita.id}`}
                      rows={3}
                      placeholder="Cómo se adaptó, alimentación, salud, condiciones del hogar..."
                      maxLength={300}
                      value={resultado.observaciones}
                      onChange={(e) => setResultado((r) => ({ ...r, observaciones: e.target.value }))}
                      className={claseCampo}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setRegistrandoId(null)}
                      className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50"
                    >
                      Volver
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRegistrar(visita)}
                      disabled={guardando}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {guardando ? "Guardando..." : "Guardar resultado"}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs text-slate-500">
        Adoptado el {aTextoFecha(fechaDeAdopcion(adopcion)).split("-").reverse().join("-")}. La primera visita es
        desde {DIAS_MINIMOS_VISITA} días después de la adopción y cada nueva visita debe ser después de la anterior.
        Próxima fecha disponible: {formatearFechaVisita(fechaMinima)}.
      </p>

      {visitaPendiente ? (
        <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          Este adoptante ya tiene una visita agendada para el {textoVisita(visitaPendiente)}. Podrás
          agendar otra cuando pase esa fecha.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="fechaVisita" className="text-sm font-medium text-slate-700">
              Fecha de la visita
            </label>
            <input
              id="fechaVisita"
              type="date"
              min={fechaMinima}
              value={fecha}
              onChange={(e) => handleCambiarFecha(e.target.value)}
              className={claseCampo}
            />
          </div>
          <div>
            <label htmlFor="horaVisita" className="text-sm font-medium text-slate-700">
              Hora
            </label>
            <select id="horaVisita" value={hora} onChange={(e) => setHora(e.target.value)} className={claseCampo}>
              <option value="">Seleccione</option>
              {/* Las horas que ya pasaron (si es hoy) o que ya tienen otra visita aparecen deshabilitadas */}
              {HORAS_VISITA.map((opcion) => (
                <option key={opcion} value={opcion} disabled={!horaDisponible(opcion)}>
                  {opcion}
                  {horaOcupada(fecha, opcion) ? " (ocupada)" : ""}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleAgendar}
            disabled={guardando}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardando ? "Agendando..." : "Agendar visita"}
          </button>
        </div>
      )}
    </section>
  );
}

// Próximas visitas de todas las adopciones aprobadas, de la más cercana a la más lejana
function ProximasVisitas({ visitas, onAbrirSeguimiento }) {
  const hoy = hoyComoTexto();

  return (
    <div className={claseTarjeta}>
      <div className="flex flex-col gap-1 border-b border-slate-100 pb-5">
        <h3 className="text-2xl font-bold text-slate-900">Próximas visitas</h3>
        <p className="text-sm text-slate-500">Visitas de seguimiento agendadas, de la más cercana a la más lejana.</p>
      </div>

      {visitas.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-4xl">📅</p>
          <p className="mt-2 font-medium text-slate-600">No hay visitas agendadas.</p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-slate-500">
                <th className="px-3 py-3 font-semibold">Fecha</th>
                <th className="px-3 py-3 font-semibold">Hora</th>
                <th className="px-3 py-3 font-semibold">Animal</th>
                <th className="px-3 py-3 font-semibold">Adoptante</th>
                <th className="px-3 py-3 font-semibold">Dirección</th>
                <th className="px-3 py-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visitas.map((visita) => {
                const esHoy = visita.fecha.slice(0, 10) === hoy;
                return (
                  <tr key={visita.id} className={`transition hover:bg-emerald-50/60 ${esHoy ? "bg-amber-50/60" : ""}`}>
                    <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-800">
                      {formatearFechaVisita(visita.fecha)}
                      {esHoy && (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          Hoy
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-600">{visita.hora ?? "—"}</td>
                    <td className="px-3 py-3 text-slate-800">
                      {visita.adopcion.animal?.nombre || "Sin nombre"}
                      <p className="text-xs text-slate-500">{visita.adopcion.animal?.especie?.nombre}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-slate-800">{visita.adopcion.nombre}</p>
                      <p className="text-xs text-slate-500">{visita.adopcion.telefono}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {visita.adopcion.direccion}, {COMUNAS[visita.adopcion.comuna] ?? visita.adopcion.comuna}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onAbrirSeguimiento(visita.adopcion.id)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                      >
                        Seguimiento
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Texto para el adoptante según el estado de su solicitud
const DESCRIPCION_ESTADO = {
  PENDIENTE: "Recibimos tu solicitud. Pronto nuestro equipo comenzará a revisarla.",
  EN_REVISION: "Nuestro equipo está revisando tu solicitud.",
  APROBADA: "¡Tu solicitud fue aprobada! Nos pondremos en contacto contigo.",
  RECHAZADA: "Tu solicitud no fue aprobada.",
};

// Consulta pública: el adoptante ingresa su RUT y su correo y ve sus solicitudes
function ConsultaSolicitud() {
  const [solicitudes, setSolicitudes] = useState(null);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(consultaSolicitudSchema),
    defaultValues: { rut: "", email: "" },
  });

  const campoRut = register("rut");

  const onConsultar = async ({ rut, email }) => {
    try {
      setError("");
      setSolicitudes(await adopcionesApi.consultarSolicitudes(rut, email));
    } catch (err) {
      setSolicitudes(null);
      setError(`No se pudo consultar la solicitud: ${err.message}`);
    }
  };

  return (
    <div className={claseTarjeta}>
      <div className="border-b border-slate-100 pb-5">
        <h3 className="text-2xl font-bold text-slate-900">Consulta tu solicitud</h3>
        <p className="text-sm text-slate-500">
          Ingresa el RUT y el correo con que enviaste la solicitud para ver en qué estado está.
        </p>
      </div>

      <form onSubmit={handleSubmit(onConsultar)} noValidate className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-start">
        <Campo id="consultaRut" label="RUT" error={errors.rut}>
          <input
            type="text"
            id="consultaRut"
            placeholder="12.345.678-5"
            maxLength={12}
            className={claseCampo}
            {...campoRut}
            onChange={(e) => {
              e.target.value = formatearRut(e.target.value);
              campoRut.onChange(e);
            }}
          />
        </Campo>

        <Campo id="consultaEmail" label="Correo electrónico" error={errors.email}>
          <input
            type="email"
            id="consultaEmail"
            placeholder="correo@ejemplo.com"
            maxLength={254}
            className={claseCampo}
            {...register("email")}
          />
        </Campo>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-sky-600 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-wait disabled:opacity-60 md:mt-6"
        >
          {isSubmitting ? "Consultando..." : "Consultar"}
        </button>
      </form>

      {error && (
        <div className="mt-4">
          <Aviso tipo="error">{error}</Aviso>
        </div>
      )}

      {solicitudes?.length === 0 && (
        <p className="mt-5 rounded-2xl bg-slate-50 p-5 text-center text-slate-600">
          No encontramos solicitudes con ese RUT y correo. Revisa que sean los mismos que usaste en el formulario.
        </p>
      )}

      {solicitudes?.length > 0 && (
        <ul className="mt-5 space-y-3">
          {solicitudes.map((solicitud) => (
            <li
              key={`${solicitud.fechaSolicitud}-${solicitud.animal?.nombre}`}
              className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <FotoAnimal animal={solicitud.animal} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800">
                      {solicitud.animal?.nombre || "Sin nombre"}
                    </p>
                    <p className="text-sm capitalize text-slate-500">
                      {solicitud.animal?.especie?.nombre} · Solicitada el{" "}
                      {new Date(solicitud.fechaSolicitud).toLocaleDateString("es-CL")}
                    </p>
                  </div>
                </div>
                <InsigniaEstado estado={solicitud.estado} />
              </div>

              <p className="mt-3 text-sm text-slate-700">{DESCRIPCION_ESTADO[solicitud.estado]}</p>

              {solicitud.motivoRechazo && (
                <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-700">
                  <span className="font-semibold">Motivo:</span> {solicitud.motivoRechazo}
                </p>
              )}

              {solicitud.proximaVisita && (
                <p className="mt-1 text-sm text-slate-700">
                  <span className="font-semibold">Próxima visita de seguimiento:</span>{" "}
                  {textoVisita(solicitud.proximaVisita)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AdopcionesPage({ cuenta }) {
  const esEncargado = puedeEvaluarAdopciones(cuenta);

  const [adopciones, setAdopciones] = useState([]);
  const [animales, setAnimales] = useState([]);
  const [idsEnProceso, setIdsEnProceso] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorServidor, setErrorServidor] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [fichaAbierta, setFichaAbierta] = useState(null);
  const [seguimientoAbierto, setSeguimientoAbierto] = useState(null);
  const [proximasVisitas, setProximasVisitas] = useState([]);
  const [observaciones, setObservaciones] = useState("");
  const [filtro, setFiltro] = useState("TODAS");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(adopcionFormSchema),
    defaultValues: FORMULARIO_VACIO,
    mode: "onChange",
  });

  const campoRut = register("rut");
  const campoTelefono = register("telefono");

  const cargarDatos = async () => {
    try {
      setCargando(true);

      // La lista de solicitudes tiene datos personales: solo se pide si es el encargado
      const [listaAnimales, enProceso, listaAdopciones, visitas] = await Promise.all([
        animalesApi.listar(),
        adopcionesApi.animalesEnProceso(),
        esEncargado ? adopcionesApi.listar() : [],
        esEncargado ? adopcionesApi.proximasVisitas() : [],
      ]);

      setAnimales(listaAnimales);
      setIdsEnProceso(enProceso);
      setAdopciones(listaAdopciones);
      setProximasVisitas(visitas);
      setErrorServidor("");
    } catch (err) {
      setErrorServidor(`No se pudieron cargar los datos: ${err.message}`);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [esEncargado]);

  const animalesEnProceso = new Set(idsEnProceso);

  const animalesDisponibles = animales.filter((animal) => animal.estado !== "ADOPTADO");

  const animalElegido = animales.find((animal) => String(animal.id) === watch("animalId"));

  const nombreAnimal = (animal) =>
    `${animal.nombre || "Sin nombre"} (${animal.especie?.nombre ?? "?"})`;

  const conteo = (estado) => adopciones.filter((adopcion) => adopcion.estado === estado).length;

  const adopcionesFiltradas =
    filtro === "TODAS" ? adopciones : adopciones.filter((adopcion) => adopcion.estado === filtro);

  // Tras rechazar la adopción en una visita: se cierra el seguimiento y se recarga la tabla
  // Cuando cambian las visitas en el seguimiento, solo se recarga la tabla de próximas visitas
  const recargarProximasVisitas = async () => {
    try {
      setProximasVisitas(await adopcionesApi.proximasVisitas());
    } catch (err) {
      console.error("No se pudieron actualizar las próximas visitas:", err.message);
    }
  };

  const handleAbrirSeguimiento = (adopcionId) => {
    const adopcion = adopciones.find((item) => item.id === adopcionId);
    if (adopcion) setSeguimientoAbierto(adopcion);
  };

  const handleAdopcionRechazada = async (correoEnviado) => {
    const adopcion = seguimientoAbierto;
    setSeguimientoAbierto(null);

    // Recargar limpia los avisos, por eso se muestran después
    await cargarDatos();

    const texto = `Adopción de ${adopcion.animal?.nombre || "el animal"} (${adopcion.nombre}) rechazada. El animal vuelve al refugio y queda disponible para adopción.`;
    if (correoEnviado) {
      setMensaje(`${texto} Se notificó al adoptante por correo.`);
    } else {
      setErrorServidor(`${texto} No se pudo enviar el correo al adoptante (${adopcion.email}).`);
    }
  };

  const onSubmit = async (datos) => {
    try {
      setMensaje("");
      setErrorServidor("");

      const creada = await adopcionesApi.crear(aPayload(datos));

      reset(FORMULARIO_VACIO);

      // Recargar limpia los avisos, por eso se muestran después
      await cargarDatos();

      if (creada?.correoEnviado === false) {
        setMensaje(
          "Solicitud de adopción registrada. No pudimos enviarte el correo de confirmación, pero puedes consultar el estado de tu solicitud más abajo."
        );
      } else {
        setMensaje(
          `Solicitud de adopción registrada. Te enviamos un correo de confirmación a ${creada?.email ?? "tu correo"}.`
        );
      }
    } catch (err) {
      setErrorServidor(`No se pudo registrar la adopción: ${err.message}`);
    }
  };

  const handleAbrirFicha = (adopcion) => {
    setFichaAbierta(adopcion);
    setObservaciones(adopcion.observaciones ?? "");
    setMensaje("");
    setErrorServidor("");
  };

  const handleCambiarEstado = async (adopcion, estado) => {
    if(estado === "RECHAZADA" && !observaciones.trim()) {
        setErrorServidor("Debe escribir el motivo del rechazo");
        return;
      }
    // Igual que en el backend: el motivo del rechazo tiene al menos 4 caracteres
    if (estado === "RECHAZADA" && observaciones.trim().length < 4) {
      setErrorServidor("El motivo del rechazo debe tener al menos 4 caracteres");
      return;
    }
    if (!window.confirm(`¿Cambiar la solicitud de ${adopcion.nombre} a "${formatearEnum(estado)}"?`)) {
      return;
    }

    try {
      setMensaje("");
      setErrorServidor("");

      const actualizada = await adopcionesApi.actualizar(adopcion.id, {
        estado,
        observaciones: observaciones.trim() || null,
      });

      setFichaAbierta(null);

      // Recargar limpia los avisos, por eso se muestran después
      await cargarDatos();

      // correoEnviado solo viene al aprobar o rechazar
      if (actualizada?.correoEnviado === true) {
        setMensaje(`Solicitud de ${adopcion.nombre} ${formatearEnum(estado)}. Se notificó al adoptante por correo.`);
      } else if (actualizada?.correoEnviado === false) {
        setErrorServidor(
          `Solicitud de ${adopcion.nombre} ${formatearEnum(estado)}, pero no se pudo enviar el correo al adoptante (${adopcion.email}).`
        );
      }
    } catch (err) {
      setErrorServidor(`No se pudo actualizar: ${err.message}`);
    }
  };

  return (
    <section className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-100 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-4 py-1 text-sm font-medium text-sky-700">
            🐾 Dale un hogar a quien lo necesita
          </span>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Adopciones
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            Completa la ficha con tus datos para solicitar la adopción de una mascota del refugio.
            Nuestro equipo revisará tu solicitud y te contactará.
          </p>
        </header>

        {/* Los errores de la evaluación se muestran dentro de la ficha abierta */}
        {errorServidor && !fichaAbierta && <Aviso tipo="error">{errorServidor}</Aviso>}
        {mensaje && <Aviso tipo="exito">{mensaje}</Aviso>}

        {/* Próximas visitas de seguimiento, solo para el encargado */}
        {esEncargado && !cargando && (
          <ProximasVisitas visitas={proximasVisitas} onAbrirSeguimiento={handleAbrirSeguimiento} />
        )}

        {/* Solo el encargado ve y evalúa las solicitudes */}
        {esEncargado && (
          <div className={claseTarjeta}>
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Solicitudes</h3>
                <p className="text-sm text-slate-500">
                  {conteo("PENDIENTE") + conteo("EN_REVISION")} por evaluar de {adopciones.length} en total
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {FILTROS.map((estado) => {
                  const activo = filtro === estado;
                  const cantidad = estado === "TODAS" ? adopciones.length : conteo(estado);
                  return (
                    <button
                      key={estado}
                      type="button"
                      onClick={() => setFiltro(estado)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${
                        activo
                          ? "bg-slate-900 text-white shadow"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {estado === "TODAS" ? "Todas" : formatearEnum(estado)} · {cantidad}
                    </button>
                  );
                })}
              </div>
            </div>

            {cargando ? (
              <div className="flex items-center justify-center gap-3 py-12 text-slate-500">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-sky-600" />
                Cargando...
              </div>
            ) : adopcionesFiltradas.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-4xl">📭</p>
                <p className="mt-2 font-medium text-slate-600">
                  {adopciones.length === 0
                    ? "No hay solicitudes de adopción."
                    : "No hay solicitudes con este estado."}
                </p>
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wider text-slate-500">
                      <th className="px-3 py-3 font-semibold">Animal</th>
                      <th className="px-3 py-3 font-semibold">Adoptante</th>
                      <th className="px-3 py-3 font-semibold">Contacto</th>
                      <th className="px-3 py-3 font-semibold">Comuna</th>
                      <th className="px-3 py-3 font-semibold">Fecha</th>
                      <th className="px-3 py-3 font-semibold">Estado</th>
                      <th className="px-3 py-3 font-semibold text-right">Acciones</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {adopcionesFiltradas.map((adopcion) => (
                      <tr key={adopcion.id} className="transition hover:bg-sky-50/60">
                        <td className="px-3 py-3 font-medium text-slate-800">
                          {nombreAnimal(adopcion.animal)}
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-medium text-slate-800">{adopcion.nombre}</p>
                          <p className="text-xs text-slate-500">{adopcion.rut}</p>
                        </td>
                        <td className="px-3 py-3 text-slate-600">
                          <p>{adopcion.email}</p>
                          <p className="text-xs text-slate-500">{adopcion.telefono}</p>
                        </td>
                        <td className="px-3 py-3 text-slate-600">{COMUNAS[adopcion.comuna] ?? adopcion.comuna}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                          {new Date(adopcion.fechaSolicitud).toLocaleDateString("es-CL")}
                        </td>
                        <td className="px-3 py-3">
                          <InsigniaEstado estado={adopcion.estado} />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex justify-end whitespace-nowrap">
                            {/* Las adopciones aprobadas solo tienen el botón de seguimiento */}
                            {adopcion.estado === "APROBADA" ? (
                              <button
                                type="button"
                                onClick={() => setSeguimientoAbierto(adopcion)}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                              >
                                Seguimiento
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAbrirFicha(adopcion)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                  ACCIONES[adopcion.estado]
                                    ? "bg-sky-600 text-white hover:bg-sky-700"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                }`}
                              >
                                {ACCIONES[adopcion.estado] ? "Evaluar" : "Ver ficha"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className={claseTarjeta}>
          <div className="flex flex-col gap-1 border-b border-slate-100 pb-5">
            <h3 className="text-2xl font-bold text-slate-900">Ficha de adopción</h3>
            <p className="text-sm text-slate-500">
              Los animales que ya tienen una adopción en proceso aparecen bloqueados.
            </p>
          </div>

          <fieldset className="mt-6">
            <legend className="text-xs font-semibold uppercase tracking-wider text-sky-700">
              1 · Mascota
            </legend>

            <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end">
              <Campo id="animalId" label="Animal" error={errors.animalId} className="flex-1">
                <select id="animalId" className={claseCampo} {...register("animalId")}>
                  <option value="">Seleccione un animal</option>

                  {animalesDisponibles.map((animal) => (
                    <option
                      key={animal.id}
                      value={animal.id}
                      disabled={animalesEnProceso.has(animal.id)}
                    >
                      {nombreAnimal(animal)}
                      {animalesEnProceso.has(animal.id) ? " — adopción en proceso" : ""}
                    </option>
                  ))}
                </select>
              </Campo>

              {animalElegido && (
                <div className="flex items-center gap-3 rounded-2xl bg-sky-50 px-4 py-2.5 ring-1 ring-sky-100">
                  <FotoAnimal animal={animalElegido} />
                  <div className="text-sm">
                    <p className="font-semibold text-slate-800">
                      {animalElegido.nombre || "Sin nombre"}
                    </p>
                    <p className="capitalize text-slate-500">
                      {animalElegido.especie?.nombre} · {formatearEnum(animalElegido.sexo)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </fieldset>

          <fieldset className="mt-8">
            <legend className="text-xs font-semibold uppercase tracking-wider text-sky-700">
              2 · Tus datos
            </legend>

            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <Campo id="nombre" label="Nombre completo" error={errors.nombre}>
                <input type="text" id="nombre" maxLength={57} className={claseCampo} {...register("nombre")} />
              </Campo>

              <Campo id="rut" label="RUT" error={errors.rut}>
                <input
                  type="text"
                  id="rut"
                  placeholder="12.345.678-5"
                  maxLength={12}
                  className={claseCampo}
                  {...campoRut}
                  // Pone los puntos y el guion mientras el usuario escribe
                  onChange={(e) => {
                    e.target.value = formatearRut(e.target.value);
                    campoRut.onChange(e);
                  }}
                />
              </Campo>

              <Campo id="email" label="Correo electrónico" error={errors.email}>
                <input
                  type="email"
                  id="email"
                  placeholder="correo@ejemplo.com"
                  maxLength={254}
                  className={claseCampo}
                  {...register("email")}
                />
              </Campo>

              <Campo id="telefono" label="Teléfono" error={errors.telefono}>
                <input
                  type="tel"
                  id="telefono"
                  placeholder="9 1234 5678"
                  maxLength={11}
                  inputMode="numeric"
                  className={claseCampo}
                  {...campoTelefono}
                  // Solo celulares: empieza con 9 y se agrupa como "9 1234 5678"
                  onChange={(e) => {
                    e.target.value = formatearTelefono(e.target.value);
                    campoTelefono.onChange(e);
                  }}
                />
              </Campo>
            </div>
          </fieldset>

          <fieldset className="mt-8">
            <legend className="text-xs font-semibold uppercase tracking-wider text-sky-700">
              3 · Tu hogar
            </legend>

            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <Campo id="direccion" label="Dirección" error={errors.direccion}>
                <input type="text" id="direccion" maxLength={100} className={claseCampo} {...register("direccion")} />
              </Campo>

              <Campo id="comuna" label="Comuna" error={errors.comuna}>
                <select id="comuna" className={claseCampo} {...register("comuna")}>
                  <option value="">Seleccione una comuna</option>

                  {Object.entries(COMUNAS).map(([valor, texto]) => (
                    <option key={valor} value={valor}>
                      {texto}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo
                id="tipoVivienda"
                label="Tipo de vivienda"
                opcional
                error={errors.tipoVivienda}
                className="md:col-span-2"
              >
                <select id="tipoVivienda" className={claseCampo} {...register("tipoVivienda")}>
                  <option value="">Seleccione un tipo de vivienda</option>

                  {Object.entries(TIPOS_VIVIENDA).map(([valor, texto]) => (
                    <option key={valor} value={valor}>
                      {texto}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo id="otrasMascotas" label="Otras mascotas" opcional error={errors.otrasMascotas}>
                <textarea id="otrasMascotas" rows={3} maxLength={200} className={claseCampo} {...register("otrasMascotas")} />
              </Campo>

              <Campo id="motivo" label="Motivo de la adopción" opcional error={errors.motivo}>
                <textarea id="motivo" rows={3} maxLength={300} className={claseCampo} {...register("motivo")} />
              </Campo>
            </div>
          </fieldset>

          <div className="mt-8 flex justify-end border-t border-slate-100 pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-6 py-3 font-semibold text-white shadow-lg shadow-sky-600/25 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {isSubmitting ? "Enviando..." : "Enviar solicitud"}
              {!isSubmitting && <span aria-hidden="true">→</span>}
            </button>
          </div>
        </form>

        {/* El adoptante consulta el estado de sus solicitudes (el encargado ya las ve en la tabla) */}
        {!esEncargado && <ConsultaSolicitud />}
      </div>

      {esEncargado && fichaAbierta && (
        <div
          className="fixed inset-0 z-[1300] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={() => setFichaAbierta(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-ficha"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Solicitud de {fichaAbierta.nombre}</p>
                <h3 id="titulo-ficha" className="mt-1 text-xl font-bold text-slate-900">
                  {nombreAnimal(fichaAbierta.animal)}
                </h3>
                <div className="mt-2">
                  <InsigniaEstado estado={fichaAbierta.estado} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFichaAbierta(null)}
                aria-label="Cerrar"
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {errorServidor && (
              <div className="mt-4">
                <Aviso tipo="error">{errorServidor}</Aviso>
              </div>
            )}

            <dl className="mt-6 grid gap-x-6 gap-y-4 rounded-2xl bg-slate-50 p-5 sm:grid-cols-2">
              {CAMPOS_FICHA.map(({ campo, label }) => (
                <div
                  key={campo}
                  className={["otrasMascotas", "motivo"].includes(campo) ? "min-w-0 sm:col-span-2" : "min-w-0"}
                >
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
                  <dd className="mt-0.5 whitespace-pre-line break-words text-slate-800">
                    {campo === "tipoVivienda"
                      ? TIPOS_VIVIENDA[fichaAbierta.tipoVivienda] || "—"
                      : campo === "comuna"
                        ? COMUNAS[fichaAbierta.comuna] || "—"
                        : fichaAbierta[campo] || "—"}
                  </dd>
                </div>
              ))}
            </dl>

            {ACCIONES[fichaAbierta.estado] ? (
              <>
                <div className="mt-6">
                  <label htmlFor="observacionesEvaluacion" className="text-sm font-medium text-slate-700">
                    Observaciones de la evaluación
                  </label>
                  <textarea
                    id="observacionesEvaluacion"
                    rows={3}
                    maxLength={300}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className={claseCampo}
                  />
                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-2">
                  {ACCIONES[fichaAbierta.estado].map((accion) => (
                    <button
                      key={accion.estado}
                      type="button"
                      onClick={() => handleCambiarEstado(fichaAbierta, accion.estado)}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition ${ESTILO_ACCION[accion.estado]}`}
                    >
                      {accion.label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-6 rounded-2xl bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Observaciones</p>
                <p className="mt-0.5 whitespace-pre-line break-words text-slate-800">{fichaAbierta.observaciones || "—"}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Seguimiento post adopción: solo para adopciones aprobadas */}
      {esEncargado && seguimientoAbierto && (
        <div
          className="fixed inset-0 z-[1300] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={() => setSeguimientoAbierto(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-seguimiento"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Seguimiento de la adopción</p>
                <h3 id="titulo-seguimiento" className="mt-1 text-xl font-bold text-slate-900">
                  {nombreAnimal(seguimientoAbierto.animal)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSeguimientoAbierto(null)}
                aria-label="Cerrar"
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <dl className="mt-5 grid gap-x-6 gap-y-3 rounded-2xl bg-slate-50 p-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Adoptante</dt>
                <dd className="mt-0.5 text-slate-800">{seguimientoAbierto.nombre}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Teléfono</dt>
                <dd className="mt-0.5 text-slate-800">{seguimientoAbierto.telefono}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Dirección</dt>
                <dd className="mt-0.5 text-slate-800">
                  {seguimientoAbierto.direccion}, {COMUNAS[seguimientoAbierto.comuna] ?? seguimientoAbierto.comuna}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Correo</dt>
                <dd className="mt-0.5 break-all text-slate-800">{seguimientoAbierto.email}</dd>
              </div>
            </dl>

            <VisitasAdopcion
              adopcion={seguimientoAbierto}
              onAdopcionRechazada={handleAdopcionRechazada}
              visitasAgendadas={proximasVisitas}
              onCambio={recargarProximasVisitas}
            />
          </div>
        </div>
      )}
    </section>
  );
}

export default AdopcionesPage;
