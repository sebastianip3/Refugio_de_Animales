import { Fragment, useEffect, useState } from "react";
import { cuidadosApi } from "../services/api.js";

function horarioInicial(horasAdelante) {
  const fecha = new Date();
  fecha.setMinutes(0, 0, 0);
  fecha.setHours(fecha.getHours() + horasAdelante);
  const desplazamiento = fecha.getTimezoneOffset() * 60_000;
  return new Date(fecha.getTime() - desplazamiento).toISOString().slice(0, 16);
}

function CuidadosPage({ cuenta, onIniciarSesion }) {
  const [animales, setAnimales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [animalAbiertoId, setAnimalAbiertoId] = useState(null);
  const [fechaInicio, setFechaInicio] = useState(() => horarioInicial(1));
  const [fechaFin, setFechaFin] = useState(() => horarioInicial(2));
  const [personasDisponibles, setPersonasDisponibles] = useState([]);
  const [asignacionesAnimal, setAsignacionesAnimal] = useState([]);
  const [personaSeleccionadaId, setPersonaSeleccionadaId] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [errorDisponibilidad, setErrorDisponibilidad] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargarAnimales = async () => {
    try {
      setAnimales(await cuidadosApi.listarAnimales());
      setError("");
    } catch (err) {
      setError(`No se pudieron cargar los cuidados: ${err.message}`);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarAnimales();
  }, []);

  useEffect(() => {
    if (animalAbiertoId === null) return undefined;

    if (new Date(fechaInicio) >= new Date(fechaFin)) {
      setPersonasDisponibles([]);
      setAsignacionesAnimal([]);
      setConsultando(false);
      setErrorDisponibilidad("La fecha de inicio debe ser anterior a la fecha de término.");
      return undefined;
    }

    let vigente = true;
    setConsultando(true);
    setErrorDisponibilidad("");
    setPersonaSeleccionadaId("");

    cuidadosApi.consultarDisponibilidad(animalAbiertoId, fechaInicio, fechaFin)
      .then((resultado) => {
        if (!vigente) return;
        setPersonasDisponibles(resultado.personasDisponibles);
        setAsignacionesAnimal(resultado.asignacionesAnimal);
      })
      .catch((err) => {
        if (!vigente) return;
        setPersonasDisponibles([]);
        setAsignacionesAnimal([]);
        setErrorDisponibilidad(`No se pudo consultar la disponibilidad: ${err.message}`);
      })
      .finally(() => {
        if (vigente) setConsultando(false);
      });

    return () => {
      vigente = false;
    };
  }, [animalAbiertoId, fechaInicio, fechaFin]);

  const alternarAsignacion = (animalId) => {
    setAnimalAbiertoId((actual) => actual === animalId ? null : animalId);
    setErrorDisponibilidad("");
    setPersonaSeleccionadaId("");
    setMensaje("");
  };

  const guardarAsignacion = async (event, animalId) => {
    event.preventDefault();
    setErrorDisponibilidad("");
    setMensaje("");

    if (!personaSeleccionadaId) {
      setErrorDisponibilidad("Selecciona un voluntario.");
      return;
    }
    if (new Date(fechaInicio) >= new Date(fechaFin)) {
      setErrorDisponibilidad("La fecha de inicio debe ser anterior a la fecha de término.");
      return;
    }

    try {
      setGuardando(true);
      await cuidadosApi.asignar({
        animalId,
        cuentaId: Number(personaSeleccionadaId),
        fechaInicio: new Date(fechaInicio).toISOString(),
        fechaFin: new Date(fechaFin).toISOString(),
      });
      setMensaje("El cuidado se asignó correctamente.");
      setAnimalAbiertoId(null);
      await cargarAnimales();
    } catch (err) {
      setErrorDisponibilidad(`No se pudo asignar el cuidado: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  };

  const esAdministrador = cuenta?.tipo === "ADMINISTRADOR";

  return (
    <section className="min-h-screen bg-emerald-50 p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800">🤝 Cuidados</h1>
          <p className="mt-1 text-slate-600">
            Consulta y prepara la asignación de cuidadores para los animales del refugio.
          </p>
        </header>

        {error && (
          <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
            {error}
          </p>
        )}
        {mensaje && (
          <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-700">
            {mensaje}
          </p>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-slate-800">
            Animales {!cargando && (
              <span className="text-base font-normal text-slate-500">({animales.length})</span>
            )}
          </h2>

          {cargando ? (
            <p role="status" className="text-slate-500">Cargando animales...</p>
          ) : animales.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-6 text-center text-slate-500">
              No hay animales registrados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-3">ID del animal</th>
                    <th className="px-3 py-3">Nombre del animal</th>
                    <th className="px-3 py-3">Ayudante encargado</th>
                    <th className="px-3 py-3">ID del ayudante</th>
                  </tr>
                </thead>
                <tbody>
                  {animales.map((animal) => (
                    <Fragment key={animal.id}>
                      <tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-3 text-slate-500">{animal.id}</td>
                        <td className="px-3 py-3 font-medium text-slate-800">
                          {animal.nombre || "Sin nombre"}
                        </td>
                        <td className="px-3 py-3">
                          {animal.cuidador ? (
                            <span className="text-slate-800">
                              {animal.cuidador.nombre} {animal.cuidador.apellido}
                            </span>
                          ) : esAdministrador ? (
                            <button
                              type="button"
                              onClick={() => alternarAsignacion(animal.id)}
                              className="cursor-pointer rounded-md border border-emerald-200 px-3 py-1 font-medium text-emerald-700 hover:bg-emerald-50"
                            >
                              {animalAbiertoId === animal.id ? "Cerrar" : "Asignar"}
                            </button>
                          ) : cuenta ? (
                            <span className="text-slate-500">Solo administradores</span>
                          ) : (
                            <button
                              type="button"
                              onClick={onIniciarSesion}
                              className="cursor-pointer rounded-md border border-slate-300 px-3 py-1 font-medium text-slate-700 hover:bg-slate-100"
                            >
                              Iniciar sesión
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-3 text-slate-500">
                          {animal.cuidador?.id ?? "—"}
                        </td>
                      </tr>
                      {animalAbiertoId === animal.id && !animal.cuidador && (
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <td colSpan="4" className="px-3 py-4">
                            <form onSubmit={(event) => guardarAsignacion(event, animal.id)}>
                              <fieldset className="rounded-lg border border-slate-200 bg-white p-4" disabled={guardando}>
                                <legend className="px-2 font-medium text-slate-700">
                                  Seleccionar voluntario y horario
                                </legend>
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                  <label className="block text-sm font-medium text-slate-700">
                                    Desde
                                    <input
                                      type="datetime-local"
                                      value={fechaInicio}
                                      onChange={(event) => setFechaInicio(event.target.value)}
                                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                                    />
                                  </label>
                                  <label className="block text-sm font-medium text-slate-700">
                                    Hasta
                                    <input
                                      type="datetime-local"
                                      value={fechaFin}
                                      onChange={(event) => setFechaFin(event.target.value)}
                                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                                    />
                                  </label>
                                  <label className="block text-sm font-medium text-slate-700">
                                    Voluntario
                                    <select
                                      value={personaSeleccionadaId}
                                      onChange={(event) => setPersonaSeleccionadaId(event.target.value)}
                                      disabled={consultando || personasDisponibles.length === 0}
                                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-slate-100"
                                    >
                                      <option value="">Selecciona un voluntario</option>
                                      {personasDisponibles.map((persona) => (
                                        <option key={persona.id} value={persona.id}>
                                          {persona.nombre} {persona.apellido} (ID: {persona.id})
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                </div>

                                {errorDisponibilidad && (
                                  <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
                                    {errorDisponibilidad}
                                  </p>
                                )}
                                {consultando && (
                                  <p role="status" className="mt-3 text-slate-500">
                                    Buscando voluntarios disponibles...
                                  </p>
                                )}
                                {!consultando && !errorDisponibilidad && asignacionesAnimal.length > 0 && (
                                  <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">
                                    Este animal ya tiene un cuidado asignado en ese horario.
                                  </p>
                                )}
                                {!consultando
                                  && !errorDisponibilidad
                                  && asignacionesAnimal.length === 0
                                  && personasDisponibles.length === 0 && (
                                    <p className="mt-3 text-slate-500">
                                      No hay voluntarios disponibles para ese horario.
                                    </p>
                                )}
                                <button
                                  type="submit"
                                  disabled={guardando || consultando || asignacionesAnimal.length > 0 || !personaSeleccionadaId}
                                  className="mt-4 cursor-pointer rounded-lg bg-emerald-600 px-5 py-2 font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                                >
                                  {guardando ? "Guardando..." : "Guardar asignación"}
                                </button>
                              </fieldset>
                            </form>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default CuidadosPage;
