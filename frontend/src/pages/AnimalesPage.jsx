import { useEffect, useState } from "react";
import { animalesApi, especiesApi } from "../services/api.js";

const SEXOS = ["DESCONOCIDO", "MACHO", "HEMBRA"];
const ESTADOS = [
  "EN_EVALUACION",
  "CUARENTENA",
  "EN_TRATAMIENTO",
  "EN_ADOPCION",
  "ADOPTADO",
  "OTRO",
];

const FORMULARIO_VACIO = {
  nombre: "",
  especieId: "",
  sexo: "DESCONOCIDO",
  edadEstimada: "",
  peso: "",
  estado: "EN_EVALUACION",
  tieneChip: false,
  numeroChip: "",
  fotografiaUrl: "",
  estadoGeneral: "",
  observaciones: "",
};

const formatearEnum = (valor) => valor.replaceAll("_", " ").toLowerCase();

// El formulario trabaja con strings; el backend espera números y null
function aPayload(formulario) {
  const textoONull = (valor) => (valor.trim() === "" ? null : valor.trim());
  const numeroONull = (valor) => (valor === "" ? null : Number(valor));

  return {
    nombre: textoONull(formulario.nombre),
    especieId: Number(formulario.especieId),
    sexo: formulario.sexo,
    edadEstimada: numeroONull(formulario.edadEstimada),
    peso: numeroONull(formulario.peso),
    estado: formulario.estado,
    tieneChip: formulario.tieneChip,
    numeroChip: formulario.tieneChip ? textoONull(formulario.numeroChip) : null,
    fotografiaUrl: textoONull(formulario.fotografiaUrl),
    estadoGeneral: textoONull(formulario.estadoGeneral),
    observaciones: textoONull(formulario.observaciones),
  };
}

function aFormulario(animal) {
  return {
    nombre: animal.nombre ?? "",
    especieId: String(animal.especieId),
    sexo: animal.sexo,
    edadEstimada: animal.edadEstimada ?? "",
    peso: animal.peso ?? "",
    estado: animal.estado,
    tieneChip: animal.tieneChip ?? false,
    numeroChip: animal.numeroChip ?? "",
    fotografiaUrl: animal.fotografiaUrl ?? "",
    estadoGeneral: animal.estadoGeneral ?? "",
    observaciones: animal.observaciones ?? "",
  };
}

function AnimalesPage() {
  const [animales, setAnimales] = useState([]);
  const [especies, setEspecies] = useState([]);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [listaAnimales, listaEspecies] = await Promise.all([
        animalesApi.listar(),
        especiesApi.listar(),
      ]);
      setAnimales(listaAnimales);
      setEspecies(listaEspecies);
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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormulario({
      ...formulario,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const limpiarFormulario = () => {
    setFormulario(FORMULARIO_VACIO);
    setEditandoId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setGuardando(true);
      const payload = aPayload(formulario);

      if (editandoId) {
        await animalesApi.actualizar(editandoId, payload);
      } else {
        await animalesApi.crear(payload);
      }

      limpiarFormulario();
      await cargarDatos();
    } catch (err) {
      setError(`No se pudo guardar: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  };

  const handleEditar = (animal) => {
    setEditandoId(animal.id);
    setFormulario(aFormulario(animal));
    setError("");
  };

  const handleEliminar = async (animal) => {
    const nombre = animal.nombre || `#${animal.id}`;
    if (!window.confirm(`¿Eliminar a ${nombre}?`)) return;

    try {
      await animalesApi.eliminar(animal.id);
      if (editandoId === animal.id) limpiarFormulario();
      await cargarDatos();
    } catch (err) {
      setError(`No se pudo eliminar: ${err.message}`);
    }
  };

  return (
    <section>
      <h2>Animales</h2>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <h3>{editandoId ? `Editar animal #${editandoId}` : "Registrar animal"}</h3>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="nombre">Nombre</label>
          <br />
          <input
            type="text"
            id="nombre"
            name="nombre"
            value={formulario.nombre}
            onChange={handleChange}
            maxLength={100}
            placeholder="Sin nombre"
          />
        </div>

        <div>
          <label htmlFor="especieId">Especie</label>
          <br />
          <select
            id="especieId"
            name="especieId"
            value={formulario.especieId}
            onChange={handleChange}
            required
          >
            <option value="">Seleccione una especie</option>
            {especies.map((especie) => (
              <option key={especie.id} value={especie.id}>
                {especie.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="sexo">Sexo</label>
          <br />
          <select id="sexo" name="sexo" value={formulario.sexo} onChange={handleChange}>
            {SEXOS.map((sexo) => (
              <option key={sexo} value={sexo}>
                {formatearEnum(sexo)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="edadEstimada">Edad estimada (meses)</label>
          <br />
          <input
            type="number"
            id="edadEstimada"
            name="edadEstimada"
            value={formulario.edadEstimada}
            onChange={handleChange}
            min={0}
            step={1}
          />
        </div>

        <div>
          <label htmlFor="peso">Peso (kg)</label>
          <br />
          <input
            type="number"
            id="peso"
            name="peso"
            value={formulario.peso}
            onChange={handleChange}
            min={0.01}
            step={0.01}
          />
        </div>

        <div>
          <label htmlFor="estado">Estado</label>
          <br />
          <select id="estado" name="estado" value={formulario.estado} onChange={handleChange}>
            {ESTADOS.map((estado) => (
              <option key={estado} value={estado}>
                {formatearEnum(estado)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>
            <input
              type="checkbox"
              name="tieneChip"
              checked={formulario.tieneChip}
              onChange={handleChange}
            />
            Tiene chip
          </label>
        </div>

        {formulario.tieneChip && (
          <div>
            <label htmlFor="numeroChip">Número de chip</label>
            <br />
            <input
              type="text"
              id="numeroChip"
              name="numeroChip"
              value={formulario.numeroChip}
              onChange={handleChange}
              maxLength={50}
            />
          </div>
        )}

        <div>
          <label htmlFor="fotografiaUrl">URL de fotografía</label>
          <br />
          <input
            type="url"
            id="fotografiaUrl"
            name="fotografiaUrl"
            value={formulario.fotografiaUrl}
            onChange={handleChange}
            maxLength={500}
            placeholder="https://..."
          />
        </div>

        <div>
          <label htmlFor="estadoGeneral">Estado general</label>
          <br />
          <textarea
            id="estadoGeneral"
            name="estadoGeneral"
            value={formulario.estadoGeneral}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="observaciones">Observaciones</label>
          <br />
          <textarea
            id="observaciones"
            name="observaciones"
            value={formulario.observaciones}
            onChange={handleChange}
          />
        </div>

        <br />

        <button type="submit" disabled={guardando}>
          {guardando ? "Guardando..." : editandoId ? "Guardar cambios" : "Registrar"}
        </button>{" "}
        {editandoId && (
          <button type="button" onClick={limpiarFormulario}>
            Cancelar
          </button>
        )}
      </form>

      <h3>Listado</h3>

      {cargando ? (
        <p>Cargando...</p>
      ) : animales.length === 0 ? (
        <p>No hay animales registrados.</p>
      ) : (
        <table border="1" cellPadding="6">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Especie</th>
              <th>Sexo</th>
              <th>Edad (meses)</th>
              <th>Peso (kg)</th>
              <th>Estado</th>
              <th>Ingreso</th>
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
                <td>{animal.edadEstimada ?? "—"}</td>
                <td>{animal.peso ?? "—"}</td>
                <td>{formatearEnum(animal.estado)}</td>
                <td>{new Date(animal.fechaIngreso).toLocaleDateString("es-CL")}</td>
                <td>
                  <button type="button" onClick={() => handleEditar(animal)}>
                    Editar
                  </button>{" "}
                  <button type="button" onClick={() => handleEliminar(animal)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default AnimalesPage;
