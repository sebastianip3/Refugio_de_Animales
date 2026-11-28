// Página informativa para personas que todavía no han iniciado sesión.
// Reemplazar estos textos con información oficial proporcionada por el refugio.
const INFORMACION_REFUGIO = {
  historia: "Próximamente compartiremos aquí la historia del refugio: cómo nació, quiénes lo impulsaron y los hitos de su trabajo con los animales.",
  direccion: "", // Ejemplo: "Calle y número" (solo cuando esté confirmada)
  comuna: "", // Ejemplo: "Nombre de la comuna"
  horario: "", // Solo si el refugio confirma un horario de atención
};

const actividades = [
  {
    icono: "🏡",
    titulo: "Adopción responsable",
    descripcion: "Promovemos que los animales puedan encontrar hogares comprometidos con su bienestar.",
  },
  {
    icono: "🩺",
    titulo: "Jornadas de esterilización",
    descripcion: "Compartimos información sobre jornadas y sus inscripciones cuando están disponibles.",
  },
  {
    icono: "🐾",
    titulo: "Cuidado animal",
    descripcion: "El sistema apoya la organización de cuidados y el seguimiento de los animales del refugio.",
  },
];

export default function InicioPublicoPage({ onIniciarSesion, onIrARegistro }) {
  const tieneUbicacion = Boolean(
    INFORMACION_REFUGIO.direccion.trim() || INFORMACION_REFUGIO.comuna.trim()
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-7 sm:px-7 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 px-7 py-10 text-white shadow-lg sm:px-10 sm:py-14">
          <div className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full bg-blue-400/10 blur-2xl" />
          <div className="relative max-w-3xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
              Bienvenidos a nuestro refugio
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
              Un espacio para cuidar y proteger a los animales 🐾
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200">
              Conoce las actividades del refugio, infórmate sobre jornadas de
              esterilización y adopción, y descubre cómo participar.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="/eventos"
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                📅 Ver eventos
              </a>
              <button
                type="button"
                onClick={onIniciarSesion}
                className="rounded-xl border border-slate-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Iniciar sesión (personal)
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-2" aria-label="Sobre el refugio">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">📖 Nuestra historia</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {INFORMACION_REFUGIO.historia}
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">💙 Nuestra misión</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Promover el bienestar animal, la adopción responsable y la
              participación de la comunidad a través de actividades de cuidado
              y prevención.
            </p>
          </article>
        </section>

        <section aria-labelledby="que-hacemos">
          <h2 id="que-hacemos" className="mb-4 text-xl font-bold text-slate-900">
            ¿Qué hacemos?
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {actividades.map((actividad) => (
              <article
                key={actividad.titulo}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <span className="text-3xl" aria-hidden="true">{actividad.icono}</span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  {actividad.titulo}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {actividad.descripcion}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">📍 ¿Dónde estamos?</h2>
          {tieneUbicacion ? (
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {[INFORMACION_REFUGIO.direccion, INFORMACION_REFUGIO.comuna]
                .filter(Boolean)
                .join(", ")}
            </p>
          ) : (
            <p className="mt-3 text-sm leading-7 text-slate-600">
              La ubicación y los datos de contacto están pendientes de
              confirmación por parte del refugio.
            </p>
          )}
          {INFORMACION_REFUGIO.horario && (
            <p className="mt-2 text-sm text-slate-600">
              <strong>Horario de atención:</strong> {INFORMACION_REFUGIO.horario}
            </p>
          )}
        </section>

        <footer className="rounded-2xl border border-blue-100 bg-blue-50 p-6 text-center">
          <h2 className="text-lg font-bold text-slate-900">¿Quieres conocer nuestras actividades?</h2>
          <p className="mt-2 text-sm text-slate-600">
            Puedes consultar los eventos sin iniciar sesión.
          </p>
          <a href="/eventos" className="mt-4 inline-block rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">
            Explorar próximos eventos
          </a>
          {onIrARegistro && (
            <div className="mt-4">
              <button type="button" onClick={onIrARegistro} className="text-sm text-slate-600 underline hover:text-blue-700">
                Formulario de registro (en desarrollo)
              </button>
            </div>
          )}
        </footer>
      </div>
    </main>
  );
}
