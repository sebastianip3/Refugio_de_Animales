import { useEffect, useState } from "react";
import { cuidadosApi } from "../services/api.js";

function CuidadosPage() {
  const [voluntarios, setVoluntarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    cuidadosApi.listarVoluntariosDisponibles()
      .then(setVoluntarios)
      .catch((err) => setError(`No se pudieron cargar los voluntarios: ${err.message}`))
      .finally(() => setCargando(false));
  }, []);

  return (
    <main>
      <h1>Cuidados</h1>
      <p>Voluntarios disponibles para el cuidado de animales.</p>

      {error && <p role="alert">{error}</p>}

      {cargando ? (
        <p role="status">Cargando voluntarios...</p>
      ) : voluntarios.length === 0 ? (
        <p>No hay voluntarios disponibles para el cuidado.</p>
      ) : (
        <table border="1" cellPadding="6">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Horario informado</th>
            </tr>
          </thead>
          <tbody>
            {voluntarios.map((voluntario) => (
              <tr key={voluntario.id}>
                <td>{voluntario.nombre}</td>
                <td>{voluntario.apellido}</td>
                <td>{voluntario.horario || "No informado"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

export default CuidadosPage;
