import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { animalesApi, registrosClinicosApi } from "../services/api.js";
import {
  registroClinicoFormSchema,
  TIPOS_REGISTRO_CLINICO,
  hoyComoTexto,
} from "../schemas/registroClinico.schema.js";
import { puedeEditarHistorial } from "../utils.js";

const formatearEnum = (valor) => valor.replaceAll("_", " ").toLowerCase();
// La fecha se guarda a medianoche UTC; sin timeZone se mostraría el día anterior en Chile
const formatearFecha = (fecha) =>
  new Date(fecha).toLocaleDateString("es-CL", { timeZone: "UTC" });

const nombreAnimal = (animal) =>
  `${animal.nombre || "Sin nombre"} (#${animal.id}, ${animal.especie?.nombre ?? "?"})`;

const iconoAnimal = (animal) => (animal.especie?.nombre === "Gato" ? "🐱" : "🐶");

// Ícono y colores de cada tipo de registro
const ESTILO_TIPO = {
  CONSULTA: { icono: "🩺", clase: "bg-sky-100 text-sky-800 ring-sky-200" },
  VACUNA: { icono: "💉", clase: "bg-emerald-100 text-emerald-800 ring-emerald-200" },
  DESPARASITACION: { icono: "🪱", clase: "bg-lime-100 text-lime-800 ring-lime-200" },
  CIRUGIA: { icono: "🏥", clase: "bg-rose-100 text-rose-800 ring-rose-200" },
  ESTERILIZACION: { icono: "✂️", clase: "bg-violet-100 text-violet-800 ring-violet-200" },
  TRATAMIENTO: { icono: "💊", clase: "bg-amber-100 text-amber-800 ring-amber-200" },
  EXAMEN: { icono: "🔬", clase: "bg-indigo-100 text-indigo-800 ring-indigo-200" },
  OTRO: { icono: "📋", clase: "bg-slate-100 text-slate-700 ring-slate-200" },
};

const claseCampo =
  "mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-800 shadow-sm placeholder:text-slate-400 transition focus:border-rose-400 focus:outline-none focus:ring-4 focus:ring-rose-100";

const claseTarjeta = "rounded-3xl bg-white/90 p-6 shadow-xl shadow-rose-900/5 ring-1 ring-slate-200 backdrop-blur sm:p-8";

const claseBotonPrincipal =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-600/25 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";

const formularioVacio = (cuenta) => ({
  fecha: hoyComoTexto(),
  tipo: "",
  descripcion: "",
  diagnostico: "",
  tratamiento: "",
  // Por defecto el veterinario con sesión iniciada; se puede cambiar
  veterinario: cuenta ? `${cuenta.nombre} ${cuenta.apellido}` : "",
  observaciones: "",
});

const aFormulario = (registro) => ({
  fecha: registro.fecha.slice(0, 10),
  tipo: registro.tipo,
  descripcion: registro.descripcion,
  diagnostico: registro.diagnostico ?? "",
  tratamiento: registro.tratamiento ?? "",
  veterinario: registro.veterinario ?? "",
  observaciones: registro.observaciones ?? "",
});

// Campos opcionales del formulario (los que se llenan "cuando corresponde")
const CAMPOS_TEXTO = [
  { nombre: "diagnostico", etiqueta: "Diagnóstico" },
  { nombre: "tratamiento", etiqueta: "Tratamiento" },
  { nombre: "observaciones", etiqueta: "Observaciones adicionales" },
];

// Detalles de un registro que se muestran solo si tienen valor
const DETALLES_REGISTRO = [
  { campo: "diagnostico", etiqueta: "Diagnóstico" },
  { campo: "tratamiento", etiqueta: "Tratamiento" },
  { campo: "observaciones", etiqueta: "Observaciones" },
];

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
function FotoAnimal({ animal, className }) {
  // Se guarda la URL que falló, para volver a intentar si cambia el animal
  const [urlFallida, setUrlFallida] = useState(null);

  if (animal.fotografiaUrl && animal.fotografiaUrl !== urlFallida) {
    return (
      <img
        src={animal.fotografiaUrl}
        alt={animal.nombre || "Mascota"}
        onError={() => setUrlFallida(animal.fotografiaUrl)}
        className={`${className} object-cover`}
      />
    );
  }
  return (
    <span className={`${className} flex items-center justify-center bg-rose-100 text-2xl`}>
      {iconoAnimal(animal)}
    </span>
  );
}

function InsigniaTipo({ tipo }) {
  const { icono, clase } = ESTILO_TIPO[tipo] ?? ESTILO_TIPO.OTRO;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${clase}`}
    >
      <span aria-hidden="true">{icono}</span>
      {formatearEnum(tipo)}
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

// Los adoptantes solo consultan el historial. El veterinario (o un administrador)
// además puede registrar nuevos antecedentes y actualizar los existentes
function HistorialPage({ cuenta }) {
  const esVeterinario = puedeEditarHistorial(cuenta);

  const [animales, setAnimales] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [error, setError] = useState("");
  // null: formulario cerrado, "nuevo": agregando, número: id del registro que se edita
  const [editando, setEditando] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const panelHistorial = useRef(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registroClinicoFormSchema),
    defaultValues: formularioVacio(cuenta),
  });

  useEffect(() => {
    const cargarAnimales = async () => {
      try {
        const lista = await animalesApi.listar();
        // El veterinario también necesita ver a los animales ya adoptados
        setAnimales(esVeterinario ? lista : lista.filter((animal) => animal.estado !== "ADOPTADO"));
        setError("");
      } catch (err) {
        setError(`No se pudieron cargar los animales: ${err.message}`);
      } finally {
        setCargando(false);
      }
    };

    cargarAnimales();
  }, [esVeterinario]);

  // Al abrir el historial de otro animal se baja hasta el panel
  useEffect(() => {
    panelHistorial.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [seleccionado?.id]);

  const cargarHistorial = async (animalId) => {
    try {
      setCargandoHistorial(true);
      setError("");
      setSeleccionado(await animalesApi.historial(animalId));
    } catch (err) {
      setError(`No se pudo cargar el historial clínico: ${err.message}`);
    } finally {
      setCargandoHistorial(false);
    }
  };

  const cerrarFormulario = () => {
    setEditando(null);
    reset(formularioVacio(cuenta));
  };

  const handleVerHistorial = (animal) => {
    cerrarFormulario();
    setMensaje("");
    cargarHistorial(animal.id);
  };

  const handleCerrarHistorial = () => {
    cerrarFormulario();
    setMensaje("");
    setSeleccionado(null);
  };

  const handleAgregar = () => {
    setMensaje("");
    setError("");
    reset(formularioVacio(cuenta));
    setEditando("nuevo");
  };

  const handleEditar = (registro) => {
    setMensaje("");
    setError("");
    reset(aFormulario(registro));
    setEditando(registro.id);
  };

  const onSubmit = async (datos) => {
    try {
      setError("");
      if (editando === "nuevo") {
        await registrosClinicosApi.crear(seleccionado.id, datos);
        setMensaje("Registro clínico agregado.");
      } else {
        await registrosClinicosApi.actualizar(seleccionado.id, editando, datos);
        setMensaje("Registro clínico actualizado.");
      }
      cerrarFormulario();
      // Se vuelve a pedir al backend para mostrar lo que quedó guardado
      await cargarHistorial(seleccionado.id);
    } catch (err) {
      setError(`No se pudo guardar el registro clínico: ${err.message}`);
    }
  };

  const texto = busqueda.trim().toLowerCase();
  const animalesFiltrados = animales.filter((animal) =>
    `${animal.nombre ?? ""} ${animal.especie?.nombre ?? ""} ${animal.id}`.toLowerCase().includes(texto)
  );

  return (
    <section className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-100 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-4 py-1 text-sm font-medium text-rose-700">
            🩺 Salud de nuestras mascotas
          </span>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Historial clínico
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            {esVeterinario
              ? "Selecciona un animal para registrar nuevos antecedentes veterinarios o actualizar los existentes."
              : "Conoce los antecedentes veterinarios de cada mascota: vacunas, consultas, tratamientos y más."}
          </p>
        </header>

        {/* Los errores del formulario se muestran dentro de la ventana del formulario */}
        {error && editando === null && <Aviso tipo="error">{error}</Aviso>}

        <div className={claseTarjeta}>
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Mascotas</h3>
              <p className="text-sm text-slate-500">
                {animales.length} {animales.length === 1 ? "mascota" : "mascotas"}
                {esVeterinario ? " (incluye adoptadas)" : " disponibles"}
              </p>
            </div>
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, especie o ID..."
              aria-label="Buscar mascota"
              className={`${claseCampo} sm:max-w-xs`}
            />
          </div>

          {cargando ? (
            <div className="flex items-center justify-center gap-3 py-12 text-slate-500">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-rose-600" />
              Cargando...
            </div>
          ) : animalesFiltrados.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-4xl">🐾</p>
              <p className="mt-2 font-medium text-slate-600">
                {animales.length === 0 ? "No hay mascotas disponibles." : "Ninguna mascota coincide con la búsqueda."}
              </p>
            </div>
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {animalesFiltrados.map((animal) => {
                const activo = seleccionado?.id === animal.id;
                return (
                  <li
                    key={animal.id}
                    className={`flex flex-col rounded-2xl p-4 ring-1 transition ${
                      activo
                        ? "bg-rose-50 ring-2 ring-rose-400"
                        : "bg-white ring-slate-200 hover:-translate-y-0.5 hover:shadow-lg"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FotoAnimal animal={animal} className="h-12 w-12 shrink-0 rounded-full" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">
                          {animal.nombre || "Sin nombre"}
                          <span className="ml-1.5 font-mono text-xs font-normal text-slate-400">#{animal.id}</span>
                        </p>
                        <p className="text-sm capitalize text-slate-500">
                          {animal.especie?.nombre} · {formatearEnum(animal.sexo)}
                        </p>
                      </div>
                    </div>

                    <span className="mt-3 inline-flex w-fit rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-600">
                      {formatearEnum(animal.estado)}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleVerHistorial(animal)}
                      disabled={cargandoHistorial}
                      className={`mt-4 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60 ${
                        activo
                          ? "bg-rose-600 text-white hover:bg-rose-700"
                          : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                      }`}
                    >
                      {esVeterinario ? "Historial clínico" : "Ver historial clínico"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {seleccionado && (
          <div ref={panelHistorial} className={`${claseTarjeta} scroll-mt-6`}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-4">
                <FotoAnimal animal={seleccionado} className="h-14 w-14 shrink-0 rounded-2xl" />
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    Historial clínico de {nombreAnimal(seleccionado)}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {esVeterinario
                      ? "Puedes agregar nuevos registros o actualizar los existentes."
                      : "Información de solo lectura registrada por el equipo veterinario del refugio."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCerrarHistorial}
                aria-label="Cerrar"
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {mensaje && (
              <div className="mt-5">
                <Aviso tipo="exito">{mensaje}</Aviso>
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-600">
                {seleccionado.registrosClinicos.length}{" "}
                {seleccionado.registrosClinicos.length === 1 ? "registro" : "registros"}
              </p>
              {esVeterinario && (
                <button type="button" onClick={handleAgregar} className={claseBotonPrincipal}>
                  <span aria-hidden="true">＋</span>
                  Agregar registro
                </button>
              )}
            </div>

            {seleccionado.registrosClinicos.length === 0 ? (
              <div className="mt-4 rounded-2xl border-2 border-dashed border-slate-200 py-12 text-center">
                <p className="text-4xl">📄</p>
                <p className="mt-2 font-medium text-slate-600">
                  Esta mascota no tiene antecedentes veterinarios registrados.
                </p>
              </div>
            ) : (
              <ol className="relative mt-6 space-y-6 border-l-2 border-rose-100 pl-6 sm:ml-2">
                {seleccionado.registrosClinicos.map((registro) => {
                  const detalles = DETALLES_REGISTRO.filter(({ campo }) => registro[campo]);
                  return (
                    <li key={registro.id} className="relative">
                      <span className="absolute -left-[33px] top-5 h-4 w-4 rounded-full border-4 border-white bg-rose-400 shadow" />
                      <article
                        className={`rounded-2xl p-5 ring-1 transition ${
                          editando === registro.id ? "bg-amber-50 ring-2 ring-amber-300" : "bg-white ring-slate-200"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <time className="text-sm font-semibold text-slate-900">
                              {formatearFecha(registro.fecha)}
                            </time>
                            <InsigniaTipo tipo={registro.tipo} />
                          </div>
                          {esVeterinario && (
                            <button
                              type="button"
                              onClick={() => handleEditar(registro)}
                              className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                            >
                              Editar
                            </button>
                          )}
                        </div>

                        <p className="mt-3 whitespace-pre-line text-slate-800">{registro.descripcion}</p>

                        {detalles.length > 0 && (
                          <dl className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
                            {detalles.map(({ campo, etiqueta }) => (
                              <div key={campo}>
                                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                  {etiqueta}
                                </dt>
                                <dd className="mt-0.5 whitespace-pre-line text-sm text-slate-800">{registro[campo]}</dd>
                              </div>
                            ))}
                          </dl>
                        )}

                        <p className="mt-3 text-xs text-slate-500">
                          👩‍⚕️ {registro.veterinario || "Veterinario no indicado"}
                        </p>
                      </article>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        )}
      </div>

      {esVeterinario && seleccionado && editando !== null && (
        <div
          className="fixed inset-0 z-[1300] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={() => !isSubmitting && cerrarFormulario()}
        >
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-formulario"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">{nombreAnimal(seleccionado)}</p>
                <h4 id="titulo-formulario" className="mt-1 text-xl font-bold text-slate-900">
                  {editando === "nuevo" ? "Nuevo registro clínico" : "Actualizar registro clínico"}
                </h4>
              </div>
              <button
                type="button"
                onClick={cerrarFormulario}
                disabled={isSubmitting}
                aria-label="Cerrar formulario"
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mt-4">
                <Aviso tipo="error">{error}</Aviso>
              </div>
            )}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Campo id="fecha" label="Fecha" error={errors.fecha}>
                <input id="fecha" type="date" max={hoyComoTexto()} className={claseCampo} {...register("fecha")} />
              </Campo>

              <Campo id="tipo" label="Tipo de registro" error={errors.tipo}>
                <select id="tipo" className={claseCampo} {...register("tipo")}>
                  <option value="">Seleccione un tipo</option>
                  {TIPOS_REGISTRO_CLINICO.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {ESTILO_TIPO[tipo].icono} {formatearEnum(tipo)}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo id="descripcion" label="Descripción" error={errors.descripcion} className="sm:col-span-2">
                <textarea id="descripcion" rows={3} className={claseCampo} {...register("descripcion")} />
              </Campo>

              {CAMPOS_TEXTO.map(({ nombre, etiqueta }) => (
                <Campo
                  key={nombre}
                  id={nombre}
                  label={etiqueta}
                  opcional
                  error={errors[nombre]}
                  className={nombre === "observaciones" ? "sm:col-span-2" : ""}
                >
                  <textarea id={nombre} rows={2} className={claseCampo} {...register(nombre)} />
                </Campo>
              ))}

              <Campo
                id="veterinario"
                label="Veterinario responsable"
                opcional
                error={errors.veterinario}
                className="sm:col-span-2"
              >
                <input id="veterinario" type="text" className={claseCampo} {...register("veterinario")} />
              </Campo>
            </div>

            <div className="mt-8 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-6">
              <button
                type="button"
                onClick={cerrarFormulario}
                disabled={isSubmitting}
                className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button type="submit" disabled={isSubmitting} className={claseBotonPrincipal}>
                {isSubmitting
                  ? "Guardando..."
                  : editando === "nuevo"
                    ? "Guardar registro"
                    : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

export default HistorialPage;
