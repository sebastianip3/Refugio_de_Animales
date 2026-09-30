import { useEffect, useState } from "react";
import { adopcionesApi, animalesApi } from "../services/api.js";

const ESTADOS_EN_PROCESO = ["PENDIENTE", "EN_REVISION"];

// Acciones disponibles según el estado actual de la adopción
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

const formatearEnum = (valor) => valor.replaceAll("_", " ").toLowerCase();

function aPayload(formulario) {
  const textoONull = (valor) => (valor.trim() === "" ? null : valor.trim());

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

function AdopcionesPage() {
  const [adopciones, setAdopciones] = useState([]);
  const [animales, setAnimales] = useState([]);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [listaAdopciones, listaAnimales] = await Promise.all([
        adopcionesApi.listar(),
        animalesApi.listar(),
      ]);
      setAdopciones(listaAdopciones);
      setAnimales(listaAnimales);
      setError("");
    } catch (err) {
      setError(`No se pudieron cargar los datos: ${err.message}`);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Animales que ya tienen una adopción en proceso: no se pueden elegir en la ficha
  const animalesEnProceso = new Set(
    adopciones.filter((a) => ESTADOS_EN_PROCESO.includes(a.estado)).map((a) => a.animalId)
  );
  const animalesDisponibles = animales.filter((animal) => animal.estado !== "ADOPTADO");

  const nombreAnimal = (animal) =>
    `${animal.nombre || "Sin nombre"} (#${animal.id}, ${animal.especie?.nombre ?? "?"})`;

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormulario({
      ...formulario,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setGuardando(true);
      setMensaje("");
      await adopcionesApi.crear(aPayload(formulario));
      setFormulario(FORMULARIO_VACIO);
      setMensaje("Solicitud de adopción registrada.");
      await cargarDatos();
    } catch (err) {
      setError(`No se pudo registrar la adopción: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  };

  const handleCambiarEstado = async (adopcion, estado) => {
    if (!window.confirm(`¿Cambiar la adopción #${adopcion.id} a "${formatearEnum(estado)}"?`)) return;

    try {
      setMensaje("");
      await adopcionesApi.actualizar(adopcion.id, { estado });
      await cargarDatos();
    } catch (err) {
      setError(`No se pudo actualizar: ${err.message}`);
    }
  };

  return (
    <section>
      <h2>Adopciones</h2>

      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {mensaje && <p style={{ color: "green" }}>{mensaje}</p>}

      <h3>Ficha de adopción</h3>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="animalId">Animal</label>
          <br />
          <select
            id="animalId"
            name="animalId"
            value={formulario.animalId}
            onChange={handleChange}
            required
          >
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
        </div>

        <div>
          <label htmlFor="nombre">Nombre completo</label>
          <br />
          <input
            type="text"
            id="nombre"
            name="nombre"
            value={formulario.nombre}
            onChange={handleChange}
            minLength={2}
            maxLength={100}
            required
          />
        </div>

        <div>
          <label htmlFor="rut">RUT</label>
          <br />
          <input
            type="text"
            id="rut"
            name="rut"
            value={formulario.rut}
            onChange={handleChange}
            placeholder="12.345.678-5"
            required
          />
        </div>

        <div>
          <label htmlFor="email">Correo electrónico</label>
          <br />
          <input
            type="email"
            id="email"
            name="email"
            value={formulario.email}
            onChange={handleChange}
            placeholder="correo@ejemplo.com"
            required
          />
        </div>

        <div>
          <label htmlFor="telefono">Teléfono</label>
          <br />
          <input
            type="tel"
            id="telefono"
            name="telefono"
            value={formulario.telefono}
            onChange={handleChange}
            minLength={8}
            maxLength={15}
            placeholder="912345678"
            required
          />
        </div>

        <div>
          <label htmlFor="direccion">Dirección</label>
          <br />
          <input
            type="text"
            id="direccion"
            name="direccion"
            value={formulario.direccion}
            onChange={handleChange}
            minLength={3}
            maxLength={255}
            required
          />
        </div>

        <div>
          <label htmlFor="comuna">Comuna</label>
          <br />
          <input
            type="text"
            id="comuna"
            name="comuna"
            value={formulario.comuna}
            onChange={handleChange}
            minLength={2}
            maxLength={100}
            required
          />
        </div>

        <div>
          <label htmlFor="tipoVivienda">Tipo de vivienda</label>
          <br />
          <input
            type="text"
            id="tipoVivienda"
            name="tipoVivienda"
            value={formulario.tipoVivienda}
            onChange={handleChange}
            maxLength={100}
            placeholder="Casa con patio, departamento..."
          />
        </div>

        <div>
          <label htmlFor="otrasMascotas">Otras mascotas</label>
          <br />
          <textarea
            id="otrasMascotas"
            name="otrasMascotas"
            value={formulario.otrasMascotas}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="motivo">Motivo de la adopción</label>
          <br />
          <textarea
            id="motivo"
            name="motivo"
            value={formulario.motivo}
            onChange={handleChange}
          />
        </div>

        <br />

        <button type="submit" disabled={guardando}>
          {guardando ? "Enviando..." : "Enviar solicitud"}
        </button>
      </form>

      <h3>Solicitudes</h3>

      {cargando ? (
        <p>Cargando...</p>
      ) : adopciones.length === 0 ? (
        <p>No hay solicitudes de adopción.</p>
      ) : (
        <table border="1" cellPadding="6">
          <thead>
            <tr>
              <th>ID</th>
              <th>Animal</th>
              <th>Adoptante</th>
              <th>RUT</th>
              <th>Contacto</th>
              <th>Comuna</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {adopciones.map((adopcion) => (
              <tr key={adopcion.id}>
                <td>{adopcion.id}</td>
                <td>{nombreAnimal(adopcion.animal)}</td>
                <td>{adopcion.nombre}</td>
                <td>{adopcion.rut}</td>
                <td>
                  {adopcion.email}
                  <br />
                  {adopcion.telefono}
                </td>
                <td>{adopcion.comuna}</td>
                <td>{new Date(adopcion.fechaSolicitud).toLocaleDateString("es-CL")}</td>
                <td>{formatearEnum(adopcion.estado)}</td>
                <td>
                  {(ACCIONES[adopcion.estado] ?? []).map((accion) => (
                    <button
                      key={accion.estado}
                      type="button"
                      onClick={() => handleCambiarEstado(adopcion, accion.estado)}
                    >
                      {accion.label}
                    </button>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default AdopcionesPage;
