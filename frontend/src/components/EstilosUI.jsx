
export const estilosUI = {
  pagina:
    "min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8",

  contenedor:
    "mx-auto max-w-7xl space-y-6",

  encabezado:
    "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm",

  titulo:
    "text-3xl font-bold tracking-tight text-slate-900",

  subtitulo:
    "mt-2 text-sm text-slate-600",

  tarjeta:
    "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm",

  tituloSeccion:
    "text-xl font-semibold text-slate-900",

  etiqueta:
    "mb-1 block text-sm font-medium text-slate-700",

  campo:
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100",

  botonPrincipal:
    "rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50",

  botonSecundario:
    "rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-100",

  botonPeligro:
    "rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-700 disabled:opacity-50",

  error:
    "rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700",

  exito:
    "rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700",
};

export function ContenedorPagina({ children }) {
  return (
    <main className={estilosUI.pagina}>
      <div className={estilosUI.contenedor}>
        {children}
      </div>
    </main>
  );
}

export function EncabezadoPagina({
  titulo,
  descripcion,
  acciones,
}) {
  return (
    <header className={estilosUI.encabezado}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className={estilosUI.titulo}>
            {titulo}
          </h1>

          {descripcion && (
            <p className={estilosUI.subtitulo}>
              {descripcion}
            </p>
          )}
        </div>

        {acciones}
      </div>
    </header>
  );
}

export function Tarjeta({ children, className = "" }) {
  return (
    <section className={`${estilosUI.tarjeta} ${className}`}>
      {children}
    </section>
  );
}
