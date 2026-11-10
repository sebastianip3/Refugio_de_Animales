import { Fragment, useEffect, useState } from "react";
import { cuidadosApi } from "../services/api.js";

function horarioInicial(horasAdelante) {
  const fecha = new Date();
  fecha.setMinutes(0, 0, 0);
  fecha.setHours(fecha.getHours() + horasAdelante);
  const desplazamiento = fecha.getTimezoneOffset() * 60_000;
  return new Date(fecha.getTime() - desplazamiento).toISOString().slice(0, 16);
}

function CuidadosPage() {
  const [animales, setAnimales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [animalAbiertoId, setAnimalAbiertoId] = useState(null);
  const [fechaInicio, setFechaInicio] = useState(() => horarioInicial(1));
  const [fechaFin, setFechaFin] = useState(() => horarioInicial(2));
  const [personasDisponibles, setPersonasDisponibles] = useState([]);
  const [asignacionesAnimal, setAsignacionesAnimal] = useState([]);
  const [personaSeleccionadaId, setPersonaSeleccionadaId] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [errorDisponibilidad, setErrorDisponibilidad] = useState("");

  useEffect(() => {
    cuidadosApi.listarAnimales()
      .then(setAnimales)
      .catch((err) => setError(`No se pudieron cargar los cuidados: ${err.message}`))
      .finally(() => setCargando(false));
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
  };

  return (
    <main>
      <h1>Cuidados</h1>

      {error && <p role="alert">{error}</p>}

      {cargando ? (
        <p role="status">Cargando animales...</p>
      ) : animales.length === 0 ? (
        <p>No hay animales registrados.</p>
      ) : (
        <table border="1" cellPadding="6">
          <thead>
            <tr>
              <th>ID del animal</th>
              <th>Nombre del animal</th>
              <th>Ayudante encargado</th>
              <th>ID del ayudante</th>
            </tr>
          </thead>
          <tbody>
            {animales.map((animal) => (
              <Fragment key={animal.id}>
              <tr>
                <td>{animal.id}</td>
                <td>{animal.nombre || "Sin nombre"}</td>
                <td>{animal.cuidador
                  ? `${animal.cuidador.nombre} ${animal.cuidador.apellido}`
                  : animalAbiertoId === animal.id
                    ? (
                      <button type="button" onClick={() => alternarAsignacion(animal.id)}>
                        Cerrar
                      </button>
                    )
                    : (
                      <button type="button" onClick={() => alternarAsignacion(animal.id)}>
                        Asignar
                      </button>
                    )}
                </td>
                <td>{animal.cuidador?.id ?? "—"}</td>
              </tr>
              {animalAbiertoId === animal.id && !animal.cuidador && (
                <tr>
                  <td colSpan="4">
                    <fieldset>
                      <legend>Seleccionar voluntario y horario</legend>
                      <label>
                        Desde{" "}
                        <input
                          type="datetime-local"
                          value={fechaInicio}
                          onChange={(event) => setFechaInicio(event.target.value)}
                        />
                      </label>{" "}
                      <label>
                        Hasta{" "}
                        <input
                          type="datetime-local"
                          value={fechaFin}
                          onChange={(event) => setFechaFin(event.target.value)}
                        />
                      </label>

                      {errorDisponibilidad && <p role="alert">{errorDisponibilidad}</p>}
                      {consultando ? (
                        <p role="status">Buscando voluntarios disponibles...</p>
                      ) : asignacionesAnimal.length > 0 ? (
                        <p>Este animal ya tiene un cuidado asignado en ese horario.</p>
                      ) : (
                        <label>
                          Voluntario{" "}
                          <select
                            value={personaSeleccionadaId}
                            onChange={(event) => setPersonaSeleccionadaId(event.target.value)}
                            disabled={personasDisponibles.length === 0}
                          >
                            <option value="">Selecciona un voluntario</option>
                            {personasDisponibles.map((persona) => (
                              <option key={persona.id} value={persona.id}>
                                {persona.nombre} {persona.apellido} (ID: {persona.id})
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      {!consultando
                        && !errorDisponibilidad
                        && asignacionesAnimal.length === 0
                        && personasDisponibles.length === 0 && (
                          <p>No hay voluntarios disponibles para ese horario.</p>
                      )}
                      <p>La asignación todavía no se guarda desde esta página.</p>
                    </fieldset>
                  </td>
                </tr>
              )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

export default CuidadosPage;
