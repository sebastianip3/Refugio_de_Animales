import { useEffect, useState } from "react";
import { animalesApi } from "../services/api.js";

const formatearEnum = (valor) => valor.replaceAll("_", " ").toLowerCase();
const formatearFecha = (fecha) => new Date(fecha).toLocaleDateString("es-CL");

const nombreAnimal = (animal) =>
  `${animal.nombre || "Sin nombre"} (#${animal.id}, ${animal.especie?.nombre ?? "?"})`;

const estiloBoton = {
  backgroundColor: "#8a1c3b",
  color: "#ffffff",
  border: "1px solid #333",
  padding: "6px 12px",
  cursor: "pointer",
};

// Vista de consulta para adoptantes: muestra los antecedentes veterinarios
// sin ningún control de edición
function HistorialPage() {
  const [animales, setAnimales] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargarAnimales = async () => {
      try {
        const lista = await animalesApi.listar();
        setAnimales(lista.filter((animal) => animal.estado !== "ADOPTADO"));
        setError("");
      } catch (err) {
        setError(`No se pudieron cargar los animales: ${err.message}`);
      } finally {
        setCargando(false);
      }
    };

    cargarAnimales();
  }, []);

  const handleVerHistorial = async (animal) => {
    try {
      setCargandoHistorial(true);
      setError("");
      setSeleccionado(await animalesApi.historial(animal.id));
    } catch (err) {
      setError(`No se pudo cargar el historial clínico: ${err.message}`);
    } finally {
      setCargandoHistorial(false);
    }
  };

  return (
    <section
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "24px",
        boxSizing: "border-box",
        backgroundColor: "#f7c8d0",
      }}
    >
      <h2 style={{ marginBottom: "1px", fontSize: "5em", color: "#030507" }}>
        Historial clínico
      </h2>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <h3 style={{ marginTop: "40px", marginBottom: "20px", fontSize: "2em", color: "#030507" }}>
        Mascotas
      </h3>

      {cargando ? (
        <p>Cargando...</p>
      ) : animales.length === 0 ? (
        <p style={{ color: "crimson", fontWeight: "bold", fontSize: "1.5em" }}>
          No hay mascotas disponibles.
        </p>
      ) : (
        <table border="1" cellPadding="6">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Especie</th>
              <th>Sexo</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {animales.map((animal) => (
              <tr key={animal.id}>
                <td>{animal.id}</td>
                <td>{animal.nombre || "—"}</td>
                <td>{animal.especie?.nombre}</td>
                <td>{formatearEnum(animal.sexo)}</td>
                <td>{formatearEnum(animal.estado)}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => handleVerHistorial(animal)}
                    disabled={cargandoHistorial}
                    style={estiloBoton}
                  >
                    Ver historial clínico
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {seleccionado && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <h3 style={{ marginTop: "40px", marginBottom: "5px", fontSize: "1.5em", color: "#030507" }}>
            Historial clínico de {nombreAnimal(seleccionado)}
          </h3>
          <p>
            <em>Información de solo lectura registrada por el equipo veterinario del refugio.</em>
          </p>

          {seleccionado.registrosClinicos.length === 0 ? (
            <p style={{ fontWeight: "bold" }}>
              Esta mascota no tiene antecedentes veterinarios registrados.
            </p>
          ) : (
            <table border="1" cellPadding="6">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Descripción</th>
                  <th>Diagnóstico</th>
                  <th>Tratamiento</th>
                  <th>Veterinario</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {seleccionado.registrosClinicos.map((registro) => (
                  <tr key={registro.id}>
                    <td>{formatearFecha(registro.fecha)}</td>
                    <td>{formatearEnum(registro.tipo)}</td>
                    <td>{registro.descripcion}</td>
                    <td>{registro.diagnostico || "—"}</td>
                    <td>{registro.tratamiento || "—"}</td>
                    <td>{registro.veterinario || "—"}</td>
                    <td>{registro.observaciones || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <br />
          <button type="button" onClick={() => setSeleccionado(null)} style={estiloBoton}>
            Cerrar
          </button>
        </div>
      )}
    </section>
  );
}

export default HistorialPage;
