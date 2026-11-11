import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { esterilizacionApi } from "../services/api.js";
import { jornadaFormSchema } from "../schemas/esterilizacion.schema.js";

const estiloInput =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none";
const estiloBoton =
  "cursor-pointer rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300";
const estiloBotonChico =
  "cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-100";

const formatearFecha = (fecha) =>
  new Date(fecha).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });

// El input datetime-local necesita "2026-12-01T10:00" en hora local
const aFechaLocal = (fecha) => {
  const d = new Date(fecha);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

function Campo({ id, etiqueta, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {etiqueta}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-red-600">{error.message}</p>}
    </div>
  );
}

// Formulario para crear o editar una jornada
function FormularioJornada({ jornada, onGuardar, onCancelar }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(jornadaFormSchema),
    mode: "onTouched",
    defaultValues: jornada
      ? { ...jornada, fecha: aFechaLocal(jornada.fecha), sector: jornada.sector ?? "" }
      : { sector: "" },
  });

  return (
    <form
      onSubmit={handleSubmit(onGuardar)}
      noValidate
      className="mt-4 grid gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2"
    >
      <h2 className="text-xl font-semibold text-slate-800 sm:col-span-2">
        {jornada ? "Editar jornada" : "Nueva jornada"}
      </h2>

      <Campo id="nombre" etiqueta="Nombre" error={errors.nombre}>
        <input id="nombre" {...register("nombre")} className={estiloInput} />
      </Campo>

      <Campo id="fecha" etiqueta="Fecha y hora" error={errors.fecha}>
        <input id="fecha" type="datetime-local" {...register("fecha")} className={estiloInput} />
      </Campo>

      <Campo id="lugar" etiqueta="Lugar" error={errors.lugar}>
        <input id="lugar" {...register("lugar")} className={estiloInput} />
      </Campo>

      <Campo id="comuna" etiqueta="Comuna" error={errors.comuna}>
        <input id="comuna" {...register("comuna")} className={estiloInput} />
      </Campo>

      <Campo id="sector" etiqueta="Sector" error={errors.sector}>
        <input id="sector" {...register("sector")} className={estiloInput} />
      </Campo>

      <Campo id="cuposTotales" etiqueta="Cupos totales" error={errors.cuposTotales}>
        <input id="cuposTotales" type="number" step="1" min="1"
        onKeyDown={(e) => ["-", "+", "e", "E", ".", ","].includes(e.key) && e.preventDefault()} {...register("cuposTotales")} className={estiloInput} />
      </Campo>

      <div className="sm:col-span-2">
        <Campo
          id="indicacionesPostOperatorias"
          etiqueta="Indicaciones post-operatorias (van en el correo)"
          error={errors.indicacionesPostOperatorias}
        >
          <textarea
            id="indicacionesPostOperatorias"
            rows={4}
            {...register("indicacionesPostOperatorias")}
            className={estiloInput}
          />
        </Campo>
      </div>

      <div className="flex gap-3 sm:col-span-2">
        <button type="submit" disabled={isSubmitting} className={estiloBoton}>
          {isSubmitting ? "Guardando..." : "Guardar"}
        </button>
        <button type="button" onClick={onCancelar} className={estiloBotonChico}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

// Tabla de inscritos de una jornada
function ListaInscritos({ jornada, onCerrar }) {
  const [inscritos, setInscritos] = useState([]);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cargarInscritos = () => {
    esterilizacionApi
      .listarInscripciones(jornada.id)
      .then(setInscritos)
      .catch((err) => setError(err.message));
  };

  useEffect(cargarInscritos, [jornada.id]);

  // Marca asistencia o cancela, una vez cambiada ya no vuelve a CONFIRMADA
  const cambiarEstado = async (id, estado) => {
    setError("");
    setMensaje("");
    try {
      await esterilizacionApi.actualizarInscripcion(id, { estado });
      setMensaje("Estado actualizado");
      cargarInscritos();
    } catch (err) {
      setError(err.message);
    }
  };

  const reenviar = async (id) => {
    setError("");
    setMensaje("");
    try {
      await esterilizacionApi.reenviarComprobante(id);
      setMensaje("Comprobante reenviado");
      cargarInscritos();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Inscritos en {jornada.nombre}</h2>
        <button type="button" onClick={onCerrar} className={estiloBotonChico}>
          Cerrar
        </button>
      </div>

      {mensaje && <p className="mt-3 rounded-lg bg-green-50 p-3 text-green-700">{mensaje}</p>}
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-red-700">
          {error}
        </p>
      )}

      {inscritos.length === 0 ? (
        <p className="mt-4 text-slate-500">Todavía no hay inscritos.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-2 pr-4">Folio</th>
                <th className="py-2 pr-4">Tutor</th>
                <th className="py-2 pr-4">Mascota</th>
                <th className="py-2 pr-4">Estado</th>
                <th className="py-2 pr-4">Correo</th>
              </tr>
            </thead>
            <tbody>
              {inscritos.map((inscrito) => (
                <tr key={inscrito.id} className="border-b border-slate-100 align-top">
                  <td className="py-2 pr-4 font-mono">{inscrito.codigoComprobante}</td>
                  <td className="py-2 pr-4">
                    {inscrito.tutorNombre} {inscrito.tutorApellido}
                    <br />
                    <span className="text-slate-500">
                      {inscrito.tutorRut} · {inscrito.tutorEmail}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    {inscrito.especie?.nombre} · {inscrito.sexo.toLowerCase()} · {inscrito.tamano.toLowerCase()}
                    <br />
                    <span className="text-slate-500">{inscrito.pesoEstimado} kg</span>
                  </td>
                  <td className="py-2 pr-4">
                    {inscrito.estado === "CONFIRMADA" ? (
                      <select
                        aria-label={`Estado de ${inscrito.codigoComprobante}`}
                        defaultValue=""
                        onChange={(e) => cambiarEstado(inscrito.id, e.target.value)}
                        className="rounded-md border border-slate-300 px-2 py-1"
                      >
                        <option value="" disabled>
                          Confirmada
                        </option>
                        <option value="ASISTIO">Asistió</option>
                        <option value="NO_ASISTIO">No asistió</option>
                        <option value="CANCELADA">Cancelar</option>
                      </select>
                    ) : (
                      inscrito.estado.replace("_", " ").toLowerCase()
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {inscrito.estadoCorreo.toLowerCase()}
                    {inscrito.estadoCorreo !== "ENVIADO" && inscrito.estado !== "CANCELADA" && (
                      <button
                        type="button"
                        onClick={() => reenviar(inscrito.id)}
                        className={`ml-2 ${estiloBotonChico}`}
                      >
                        Reenviar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// Panel principal de jornadas
function PanelJornadas() {
  const [jornadas, setJornadas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [jornadaEditando, setJornadaEditando] = useState(null);
  const [jornadaInscritos, setJornadaInscritos] = useState(null);

  const cargarJornadas = () => {
    setCargando(true);
    esterilizacionApi
      .listarJornadas()
      .then(setJornadas)
      .catch((err) => setError(`No se pudieron cargar las jornadas: ${err.message}`))
      .finally(() => setCargando(false));
  };

  useEffect(cargarJornadas, []);

  // Ejecuta una acción contra el backend, muestra el resultado y recarga la lista
  const ejecutar = async (accion, textoExito) => {
    setError("");
    setMensaje("");
    try {
      await accion();
      setMensaje(textoExito);
      cargarJornadas();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const abrirNueva = () => {
    setJornadaEditando(null);
    setMostrarFormulario(true);
  };

  const abrirEdicion = (jornada) => {
    setJornadaEditando(jornada);
    setMostrarFormulario(true);
  };

  const cerrarFormularioJornada = () => {
    setMostrarFormulario(false);
    setJornadaEditando(null);
  };

  const guardarJornada = async (datos) => {
    const ok = jornadaEditando
      ? await ejecutar(() => esterilizacionApi.actualizarJornada(jornadaEditando.id, datos), "Jornada actualizada")
      : await ejecutar(() => esterilizacionApi.crearJornada(datos), "Jornada creada (formulario cerrado)");
    if (ok) cerrarFormularioJornada();
  };

  const eliminar = (jornada) => {
    if (!window.confirm(`¿Eliminar la jornada "${jornada.nombre}"?`)) return;
    ejecutar(() => esterilizacionApi.eliminarJornada(jornada.id), "Jornada eliminada");
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Jornadas de esterilización</h1>
        {!mostrarFormulario && (
          <button type="button" onClick={abrirNueva} className={estiloBoton}>
            + Nueva jornada
          </button>
        )}
      </div>

      <p className="mt-2 text-slate-600">
        Link público de inscripción:{" "}
        <a href="/inscripcion-esterilizacion" target="_blank" className="text-blue-600 hover:underline">
          /inscripcion-esterilizacion
        </a>
      </p>

      {mensaje && <p className="mt-4 rounded-lg bg-green-50 p-3 text-green-700">{mensaje}</p>}
      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-red-700">
          {error}
        </p>
      )}

      {mostrarFormulario && (
        <FormularioJornada
          key={jornadaEditando?.id ?? "nueva"}
          jornada={jornadaEditando}
          onGuardar={guardarJornada}
          onCancelar={cerrarFormularioJornada}
        />
      )}

      {cargando && <p className="mt-6 text-slate-500">Cargando jornadas...</p>}

      {!cargando && jornadas.length === 0 && (
        <p className="mt-6 text-slate-500">Aún no hay jornadas creadas.</p>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {jornadas.map((jornada) => {
          const pasada = new Date(jornada.fecha) <= new Date();
          const ocupados = jornada.cuposTotales - jornada.cuposDisponibles;

          return (
            <article key={jornada.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-800">{jornada.nombre}</h2>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    jornada.activa ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {jornada.activa ? "Formulario abierto" : "Formulario cerrado"}
                </span>
              </div>

              <p className="mt-2 text-slate-600">📅 {formatearFecha(jornada.fecha)}</p>
              <p className="mt-1 text-slate-600">
                📍 {jornada.lugar}, {jornada.comuna}
                {jornada.sector ? ` (${jornada.sector})` : ""}
              </p>
              <p className="mt-1 font-medium text-slate-700">
                Cupos: {ocupados} / {jornada.cuposTotales} ocupados
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {jornada.activa ? (
                  <button
                    type="button"
                    onClick={() => ejecutar(() => esterilizacionApi.cerrarFormulario(jornada.id), "Formulario cerrado")}
                    className={estiloBotonChico}
                  >
                    Cerrar formulario
                  </button>
                ) : (
                  !pasada && (
                    <button
                      type="button"
                      onClick={() => ejecutar(() => esterilizacionApi.abrirFormulario(jornada.id), "Formulario abierto")}
                      className={estiloBotonChico}
                    >
                      Abrir formulario
                    </button>
                  )
                )}
                <button type="button" onClick={() => setJornadaInscritos(jornada)} className={estiloBotonChico}>
                  Ver inscritos
                </button>
                {!pasada && (
                  <button type="button" onClick={() => abrirEdicion(jornada)} className={estiloBotonChico}>
                    Editar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => eliminar(jornada)}
                  className="cursor-pointer rounded-md border border-red-200 bg-white px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                >
                  Eliminar
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {jornadaInscritos && (
        <ListaInscritos
          key={jornadaInscritos.id}
          jornada={jornadaInscritos}
          onCerrar={() => {
            setJornadaInscritos(null);
            cargarJornadas();
          }}
        />
      )}
    </div>
  );
}

// la administradora gestiona las jornadas
function EsterilizacionPage({ cuenta }) {
  if (cuenta?.tipo !== "ADMINISTRADOR") {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-slate-800">Jornadas de esterilización</h1>
        <p className="mt-4 rounded-lg bg-amber-50 p-4 text-amber-800">
          Solo la administradora puede gestionar las jornadas. Inicia sesión con una cuenta de administrador.
        </p>
      </div>
    );
  }

  return <PanelJornadas />;
}

export default EsterilizacionPage;