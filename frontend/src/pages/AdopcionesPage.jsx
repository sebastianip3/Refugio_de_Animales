import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { adopcionesApi, animalesApi } from "../services/api.js";
import { adopcionFormSchema } from "../schemas/adopcion.schema.js";
import { puedeEvaluarAdopciones } from "../utils.js";

const ACCIONES = {
  PENDIENTE: [
    { estado: "EN_REVISION", label: "Pasar a revisión" },
    { estado: "APROBADA", label: "Aprobar" },
    { estado: "RECHAZADA", label: "Rechazar" },
    { estado: "CANCELADA", label: "Cancelar" },
  ],

  EN_REVISION: [
    { estado: "APROBADA", label: "Aprobar" },
    { estado: "RECHAZADA", label: "Rechazar" },
    { estado: "CANCELADA", label: "Cancelar" },
  ],
};

// Colores de cada estado (insignias, filtros y botones de evaluación)
const ESTILO_ESTADO = {
  PENDIENTE: "bg-amber-100 text-amber-800 ring-amber-200",
  EN_REVISION: "bg-sky-100 text-sky-800 ring-sky-200",
  APROBADA: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  RECHAZADA: "bg-rose-100 text-rose-800 ring-rose-200",
  CANCELADA: "bg-slate-100 text-slate-700 ring-slate-200",
};

const ESTILO_ACCION = {
  EN_REVISION: "bg-sky-600 hover:bg-sky-700 text-white",
  APROBADA: "bg-emerald-600 hover:bg-emerald-700 text-white",
  RECHAZADA: "bg-rose-600 hover:bg-rose-700 text-white",
  CANCELADA: "bg-white hover:bg-slate-50 text-slate-700 ring-1 ring-slate-300",
};

const FILTROS = ["TODAS", "PENDIENTE", "EN_REVISION", "APROBADA", "RECHAZADA", "CANCELADA"];

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
    comuna: formulario.comuna.trim(),
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

function AdopcionesPage({ cuenta }) {
  const esEncargado = puedeEvaluarAdopciones(cuenta);

  const [adopciones, setAdopciones] = useState([]);
  const [animales, setAnimales] = useState([]);
  const [idsEnProceso, setIdsEnProceso] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorServidor, setErrorServidor] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [fichaAbierta, setFichaAbierta] = useState(null);
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

  const cargarDatos = async () => {
    try {
      setCargando(true);

      // La lista de solicitudes tiene datos personales: solo se pide si es el encargado
      const [listaAnimales, enProceso, listaAdopciones] = await Promise.all([
        animalesApi.listar(),
        adopcionesApi.animalesEnProceso(),
        esEncargado ? adopcionesApi.listar() : [],
      ]);

      setAnimales(listaAnimales);
      setIdsEnProceso(enProceso);
      setAdopciones(listaAdopciones);
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
    `${animal.nombre || "Sin nombre"} (#${animal.id}, ${animal.especie?.nombre ?? "?"})`;

  const conteo = (estado) => adopciones.filter((adopcion) => adopcion.estado === estado).length;

  const adopcionesFiltradas =
    filtro === "TODAS" ? adopciones : adopciones.filter((adopcion) => adopcion.estado === filtro);

  const onSubmit = async (datos) => {
    try {
      setMensaje("");
      setErrorServidor("");

      await adopcionesApi.crear(aPayload(datos));

      reset(FORMULARIO_VACIO);
      setMensaje("Solicitud de adopción registrada.");

      await cargarDatos();
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
    if (!window.confirm(`¿Cambiar la adopción #${adopcion.id} a "${formatearEnum(estado)}"?`)) {
      return;
    }

    try {
      setMensaje("");
      setErrorServidor("");

      await adopcionesApi.actualizar(adopcion.id, {
        estado,
        observaciones: observaciones.trim() || null,
      });

      setFichaAbierta(null);

      await cargarDatos();
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
                <input type="text" id="nombre" className={claseCampo} {...register("nombre")} />
              </Campo>

              <Campo id="rut" label="RUT" error={errors.rut}>
                <input
                  type="text"
                  id="rut"
                  placeholder="12.345.678-5"
                  maxLength={12}
                  className={claseCampo}
                  {...register("rut")}
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
                  placeholder="+56 9 1234 5678"
                  maxLength={17}
                  inputMode="tel"
                  className={claseCampo}
                  {...register("telefono")}
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
                <input type="text" id="direccion" className={claseCampo} {...register("direccion")} />
              </Campo>

              <Campo id="comuna" label="Comuna" error={errors.comuna}>
                <input type="text" id="comuna" className={claseCampo} {...register("comuna")} />
              </Campo>

              <Campo
                id="tipoVivienda"
                label="Tipo de vivienda"
                opcional
                error={errors.tipoVivienda}
                className="md:col-span-2"
              >
                <input
                  type="text"
                  id="tipoVivienda"
                  placeholder="Casa con patio, departamento..."
                  className={claseCampo}
                  {...register("tipoVivienda")}
                />
              </Campo>

              <Campo id="otrasMascotas" label="Otras mascotas" opcional error={errors.otrasMascotas}>
                <textarea id="otrasMascotas" rows={3} className={claseCampo} {...register("otrasMascotas")} />
              </Campo>

              <Campo id="motivo" label="Motivo de la adopción" opcional error={errors.motivo}>
                <textarea id="motivo" rows={3} className={claseCampo} {...register("motivo")} />
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
                      <th className="px-3 py-3 font-semibold">ID</th>
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
                        <td className="px-3 py-3 font-mono text-slate-400">#{adopcion.id}</td>
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
                        <td className="px-3 py-3 text-slate-600">{adopcion.comuna}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                          {new Date(adopcion.fechaSolicitud).toLocaleDateString("es-CL")}
                        </td>
                        <td className="px-3 py-3">
                          <InsigniaEstado estado={adopcion.estado} />
                        </td>
                        <td className="px-3 py-3 text-right">
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
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
                <p className="text-sm font-medium text-slate-500">Solicitud #{fichaAbierta.id}</p>
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
                  className={["otrasMascotas", "motivo"].includes(campo) ? "sm:col-span-2" : ""}
                >
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
                  <dd className="mt-0.5 whitespace-pre-line text-slate-800">{fichaAbierta[campo] || "—"}</dd>
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
                <p className="mt-0.5 whitespace-pre-line text-slate-800">{fichaAbierta.observaciones || "—"}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default AdopcionesPage;
