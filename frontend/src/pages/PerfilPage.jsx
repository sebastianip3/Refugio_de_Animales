import { useEffect, useState } from "react";
import { adopcionesApi } from "../services/api.js";
import { puedeEvaluarAdopciones } from "../utils.js";

const ESTADOS = ["PENDIENTE", "EN_REVISION", "APROBADA", "RECHAZADA", "CANCELADA"];

const formatearEnum = (valor) => valor.replaceAll("_", " ").toLowerCase();

const estiloBoton = {
  backgroundColor: "#7c4a03",
  color: "#ffffff",
  border: "1px solid #333",
  padding: "10px 20px",
  cursor: "pointer",
  marginTop: "16px",
};

// Perfil del personal con sesión iniciada. Al encargado de adopciones
// le muestra además cuántas solicitudes hay en cada estado.
function PerfilPage({ cuenta, onNavegar }) {
  const esEncargado = puedeEvaluarAdopciones(cuenta);
  const [conteo, setConteo] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!esEncargado) return;

    adopcionesApi
      .listar()
      .then((adopciones) => {
        const porEstado = Object.fromEntries(ESTADOS.map((estado) => [estado, 0]));
        for (const adopcion of adopciones) porEstado[adopcion.estado] += 1;
        setConteo(porEstado);
      })
      .catch((err) => setError(`No se pudieron cargar las solicitudes: ${err.message}`));
  }, [esEncargado]);

  if (!cuenta) return <p>Debes iniciar sesión para ver tu perfil.</p>;

  const pendientesDeEvaluar = conteo ? conteo.PENDIENTE + conteo.EN_REVISION : 0;

  return (
    <section
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "24px",
        boxSizing: "border-box",
        backgroundColor: "#fde68a",
      }}
    >
      <h2 style={{ marginBottom: "1px", fontSize: "5em", color: "#030507" }}>Mi perfil</h2>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <h3 style={{ marginTop: "40px", marginBottom: "20px", fontSize: "1.5em", color: "#030507" }}>
        Datos de la cuenta
      </h3>

      <table border="1" cellPadding="6">
        <tbody>
          <tr>
            <th>Nombre</th>
            <td>
              {cuenta.nombre} {cuenta.apellido}
            </td>
          </tr>
          <tr>
            <th>Correo electrónico</th>
            <td>{cuenta.correo}</td>
          </tr>
          <tr>
            <th>Rol</th>
            <td>{formatearEnum(cuenta.tipo)}</td>
          </tr>
          <tr>
            <th>Horario</th>
            <td>{cuenta.horario || "—"}</td>
          </tr>
        </tbody>
      </table>

      {esEncargado && (
        <>
          <h3 style={{ marginTop: "40px", marginBottom: "20px", fontSize: "1.5em", color: "#030507" }}>
            Solicitudes de adopción
          </h3>

          {!conteo ? (
            !error && <p>Cargando...</p>
          ) : (
            <>
              <table border="1" cellPadding="6">
                <thead>
                  <tr>
                    {ESTADOS.map((estado) => (
                      <th key={estado}>{formatearEnum(estado)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {ESTADOS.map((estado) => (
                      <td key={estado} style={{ textAlign: "center" }}>
                        {conteo[estado]}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>

              <p style={{ fontWeight: "bold" }}>
                {pendientesDeEvaluar === 0
                  ? "No hay solicitudes por evaluar."
                  : `Tienes ${pendientesDeEvaluar} solicitud(es) por evaluar.`}
              </p>
            </>
          )}

          <button type="button" onClick={() => onNavegar("adopciones")} style={estiloBoton}>
            Ir a evaluar solicitudes
          </button>
        </>
      )}
    </section>
  );
}

export default PerfilPage;
