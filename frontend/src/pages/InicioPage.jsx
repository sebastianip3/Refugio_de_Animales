
import { useEffect, useState } from "react";
import { animalesApi, adopcionesApi } from "../services/api.js";

function TarjetaEstadistica({ icono, titulo, valor, descripcion, color }) {
  const colores = {
    azul: "bg-blue-50 text-blue-700",
    verde: "bg-emerald-50 text-emerald-700",
    naranja: "bg-amber-50 text-amber-700",
    violeta: "bg-violet-50 text-violet-700",
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-5 flex items-start justify-between">
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${colores[color]}`}
        >
          {icono}
        </span>

        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
          Desde la BD
        </span>
      </div>

      <p className="text-sm font-medium text-slate-600">
        {titulo}
      </p>

      <p
        className="mt-1 text-4xl font-bold tracking-tight text-slate-900"
        aria-live="polite"
      >
        {valor}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {descripcion}
      </p>
    </article>
  );
}

function InicioPage({ cuenta, onNavegar }) {
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  async function cargarResumen() {
    setCargando(true);
    setError("");

    try {
      const [animales, animalesConSolicitud] = await Promise.all([
        animalesApi.listar(),
        adopcionesApi.animalesEnProceso(),
      ]);

      if (
        !Array.isArray(animales) ||
        !Array.isArray(animalesConSolicitud)
      ) {
        throw new Error(
          "El servidor devolvió un formato inesperado."
        );
      }

      setResumen({
        registrados: animales.length,

        enAdopcion: animales.filter(
          (animal) => animal.estado === "EN_ADOPCION"
        ).length,

        enProceso: new Set(animalesConSolicitud).size,

        adoptados: animales.filter(
          (animal) => animal.estado === "ADOPTADO"
        ).length,
      });
    } catch (err) {
      setResumen(null);
      setError(
        err.message || "No se pudieron cargar las estadísticas."
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarResumen();
  }, []);

  const numero = (valor) =>
    cargando || !resumen
      ? "—"
      : valor.toLocaleString("es-CL");

  const tarjetas = [
    {
      icono: "🐾",
      titulo: "Animales registrados",
      valor: numero(resumen?.registrados ?? 0),
      descripcion: "Total de animales ingresados al sistema.",
      color: "azul",
    },
    {
      icono: "💚",
      titulo: "En adopción",
      valor: numero(resumen?.enAdopcion ?? 0),
      descripcion: "Animales disponibles para adopción.",
      color: "verde",
    },
    {
      icono: "📋",
      titulo: "Adopciones en proceso",
      valor: numero(resumen?.enProceso ?? 0),
      descripcion:
        "Animales con solicitudes pendientes o en revisión.",
      color: "naranja",
    },
    {
      icono: "🏡",
      titulo: "Animales adoptados",
      valor: numero(resumen?.adoptados ?? 0),
      descripcion: "Animales que ya encontraron un hogar.",
      color: "violeta",
    },
  ];

  const fecha = new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-7 sm:px-7 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-7">

        {/* ENCABEZADO */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 px-7 py-9 text-white shadow-lg sm:px-10">

          <div className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full bg-blue-400/10 blur-2xl" />

          <div className="relative">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
              Panel de gestión · {fecha}
            </p>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              ¡Hola{cuenta?.nombre ? `, ${cuenta.nombre}` : ""}! 🐾
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Bienvenido al Refugio de Animales. Aquí puedes
              revisar las cifras más importantes y acceder
              rápidamente a las secciones del sistema.
            </p>
          </div>
        </div>

        {/* ESTADÍSTICAS */}
        <section aria-labelledby="titulo-resumen">

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2
                id="titulo-resumen"
                className="text-xl font-bold text-slate-900"
              >
                Resumen general
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Datos actuales obtenidos del refugio.
              </p>
            </div>

            <button
              type="button"
              onClick={cargarResumen}
              disabled={cargando}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60"
            >
              {cargando
                ? "Actualizando..."
                : "↻ Actualizar datos"}
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
            >
              No se pudieron obtener las estadísticas: {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {tarjetas.map((tarjeta) => (
              <TarjetaEstadistica
                key={tarjeta.titulo}
                {...tarjeta}
              />
            ))}
          </div>
        </section>

        {/* ACCESOS RÁPIDOS */}
        <section
          aria-labelledby="titulo-accesos"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2
            id="titulo-accesos"
            className="text-lg font-bold text-slate-900"
          >
            Accesos rápidos
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Ve directamente a las secciones que necesitas.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

            <button
              type="button"
              onClick={() => onNavegar("animales")}
              className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-4 py-4 text-left font-semibold text-blue-900 transition hover:bg-blue-100"
            >
              <span>🐕 Gestionar animales</span>
              <span aria-hidden="true">→</span>
            </button>

            <button
              type="button"
              onClick={() => onNavegar("adopciones")}
              className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-4 text-left font-semibold text-emerald-900 transition hover:bg-emerald-100"
            >
              <span>💚 Ver adopciones</span>
              <span aria-hidden="true">→</span>
            </button>

            <button
              type="button"
              onClick={() => onNavegar("esterilizacion")}
              className="flex items-center justify-between rounded-xl border border-violet-100 bg-violet-50 px-4 py-4 text-left font-semibold text-violet-900 transition hover:bg-violet-100"
            >
              <span>🩺 Esterilización</span>
              <span aria-hidden="true">→</span>
            </button>

          </div>
        </section>
      </div>
    </main>
  );
}

export default InicioPage;
