
import { useEffect, useState } from "react";
import { esterilizacionApi } from "../services/api.js";
import EsterilizacionPage from "./EsterilizacionPage.jsx";
import EventosAdopcion from "../components/EventosAdopcion.jsx";

function EventosPage({ cuenta }) {
  const esAdministrador = cuenta?.tipo === "ADMINISTRADOR";

  const [jornadas, setJornadas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // Para usuarios que no son administradores
  useEffect(() => {
    if (esAdministrador) return;

    let activo = true;

    // Si todavía no se integró la consulta pública ampliada,
    // usamos la lista de jornadas con inscripciones abiertas.
    const listarPublicas =
      esterilizacionApi.listarJornadasPublicas ??
      esterilizacionApi.listarJornadasDisponibles;

    listarPublicas()
      .then((datos) => {
        if (activo) {
          setJornadas(Array.isArray(datos) ? datos : []);
        }
      })
      .catch((err) => {
        if (activo) setError(err.message);
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [esAdministrador]);

  const formatearFecha = (fecha) =>
    new Date(fecha).toLocaleString("es-CL", {
      dateStyle: "long",
      timeStyle: "short",
    });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">

        {/* ENCABEZADO GENERAL */}
        <header className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-800">
            📅 Eventos del refugio
          </h1>

          <p className="mt-2 text-slate-600">
            Consulta y gestiona las jornadas de esterilización,
            adopción y otras actividades del refugio.
          </p>
        </header>

        {/* JORNADAS DE ESTERILIZACIÓN */}
        <section className="mb-10">
          {esAdministrador ? (
            // Reutilizamos el módulo original completo
            <EsterilizacionPage cuenta={cuenta} />
          ) : (
            <>
              <h2 className="mb-4 text-2xl font-bold text-slate-800">
                🩺 Jornadas de esterilización
              </h2>

              {cargando && (
                <p className="text-slate-500">
                  Cargando jornadas...
                </p>
              )}

              {error && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-50 p-4 text-red-700"
                >
                  {error}
                </p>
              )}

              {!cargando && !error && jornadas.length === 0 && (
                <p className="rounded-xl bg-white p-5 text-slate-500">
                  No hay jornadas disponibles por ahora.
                </p>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                {jornadas.map((jornada) => {
                  const puedeInscribirse =
                    jornada.activa && Number(jornada.cuposDisponibles) > 0;

                  return (
                    <article
                      key={jornada.id}
                      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-semibold text-slate-800">
                            {jornada.nombre}
                          </h3>
                          <p className="mt-2 text-slate-600">
                            📅 {formatearFecha(jornada.fecha)}
                          </p>
                          <p className="mt-1 text-slate-600">
                            📍 {jornada.lugar}, {jornada.comuna}
                            {jornada.sector ? ` (${jornada.sector})` : ""}
                          </p>
                        </div>

                        <img
                          src="/refugioAnimales.jpg"
                          alt="Logo del Refugio de Animales"
                          className="w-24 shrink-0 rounded-lg object-contain"
                        />
                      </div>

                      {jornada.descripcion?.trim() && (
                        <p className="mt-3 whitespace-pre-line text-slate-600">
                          {jornada.descripcion}
                        </p>
                      )}

                      <p className="mt-3 font-medium text-slate-700">
                        Cupos disponibles: {jornada.cuposDisponibles}
                      </p>

                      {puedeInscribirse ? (
                        <a
                          href={`/inscripcion-esterilizacion?jornada=${encodeURIComponent(jornada.id)}`}
                          className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                        >
                          Inscribirme
                        </a>
                      ) : (
                        <p className="mt-4 text-sm font-semibold text-amber-700">
                          {jornada.activa ? "Sin cupos disponibles" : "Inscripciones cerradas"}
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {/* JORNADAS DE ADOPCIÓN */}
        <EventosAdopcion
          esAdministrador={esAdministrador}
        />

      </div>
    </main>
  );
}

export default EventosPage;
