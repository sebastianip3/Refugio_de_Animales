import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { animalesApi, registrosClinicosApi } from "../services/api.js";
import {
  registroClinicoFormSchema,
  TIPOS_REGISTRO_CLINICO,
  hoyComoTexto,
} from "../schemas/registroClinico.schema.js";
import { puedeEditarHistorial } from "../utils.js";

const formatearEnum = (valor) => valor.replaceAll("_", " ").toLowerCase();
// La fecha se guarda a medianoche UTC; sin timeZone se mostraría el día anterior en Chile
const formatearFecha = (fecha) =>
  new Date(fecha).toLocaleDateString("es-CL", { timeZone: "UTC" });

const nombreAnimal = (animal) =>
  `${animal.nombre || "Sin nombre"} (#${animal.id}, ${animal.especie?.nombre ?? "?"})`;

const estiloBoton = {
  backgroundColor: "#8a1c3b",
  color: "#ffffff",
  border: "1px solid #333",
  padding: "6px 12px",
  cursor: "pointer",
};

const estiloCampo = {
  width: "100%",
  backgroundColor: "#ffffff",
  border: "1px solid #ccc",
  borderRadius: "4px",
  padding: "8px",
  marginTop: "5px",
  boxSizing: "border-box",
};

const estiloError = {
  color: "crimson",
  fontSize: "0.85em",
  marginTop: "2px",
};

const formularioVacio = (cuenta) => ({
  fecha: hoyComoTexto(),
  tipo: "",
  descripcion: "",
  diagnostico: "",
  tratamiento: "",
  // Por defecto el veterinario con sesión iniciada; se puede cambiar
  veterinario: cuenta ? `${cuenta.nombre} ${cuenta.apellido}` : "",
  observaciones: "",
});

const aFormulario = (registro) => ({
  fecha: registro.fecha.slice(0, 10),
  tipo: registro.tipo,
  descripcion: registro.descripcion,
  diagnostico: registro.diagnostico ?? "",
  tratamiento: registro.tratamiento ?? "",
  veterinario: registro.veterinario ?? "",
  observaciones: registro.observaciones ?? "",
});

// Campos opcionales del formulario (los que se llenan "cuando corresponde")
const CAMPOS_TEXTO = [
  { nombre: "diagnostico", etiqueta: "Diagnóstico" },
  { nombre: "tratamiento", etiqueta: "Tratamiento" },
  { nombre: "observaciones", etiqueta: "Observaciones adicionales" },
];

// Los adoptantes solo consultan el historial. El veterinario (o un administrador)
// además puede registrar nuevos antecedentes y actualizar los existentes
function HistorialPage({ cuenta }) {
  const esVeterinario = puedeEditarHistorial(cuenta);

  const [animales, setAnimales] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [error, setError] = useState("");
  // null: formulario cerrado, "nuevo": agregando, número: id del registro que se edita
  const [editando, setEditando] = useState(null);
  const [mensaje, setMensaje] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registroClinicoFormSchema),
    defaultValues: formularioVacio(cuenta),
  });

  useEffect(() => {
    const cargarAnimales = async () => {
      try {
        const lista = await animalesApi.listar();
        // El veterinario también necesita ver a los animales ya adoptados
        setAnimales(esVeterinario ? lista : lista.filter((animal) => animal.estado !== "ADOPTADO"));
        setError("");
      } catch (err) {
        setError(`No se pudieron cargar los animales: ${err.message}`);
      } finally {
        setCargando(false);
      }
    };

    cargarAnimales();
  }, [esVeterinario]);

  const cargarHistorial = async (animalId) => {
    try {
      setCargandoHistorial(true);
      setError("");
      setSeleccionado(await animalesApi.historial(animalId));
    } catch (err) {
      setError(`No se pudo cargar el historial clínico: ${err.message}`);
    } finally {
      setCargandoHistorial(false);
    }
  };

  const cerrarFormulario = () => {
    setEditando(null);
    reset(formularioVacio(cuenta));
  };

  const handleVerHistorial = (animal) => {
    cerrarFormulario();
    setMensaje("");
    cargarHistorial(animal.id);
  };

  const handleCerrarHistorial = () => {
    cerrarFormulario();
    setMensaje("");
    setSeleccionado(null);
  };

  const handleAgregar = () => {
    setMensaje("");
    setError("");
    reset(formularioVacio(cuenta));
    setEditando("nuevo");
  };

  const handleEditar = (registro) => {
    setMensaje("");
    setError("");
    reset(aFormulario(registro));
    setEditando(registro.id);
  };

  const onSubmit = async (datos) => {
    try {
      setError("");
      if (editando === "nuevo") {
        await registrosClinicosApi.crear(seleccionado.id, datos);
        setMensaje("Registro clínico agregado.");
      } else {
        await registrosClinicosApi.actualizar(seleccionado.id, editando, datos);
        setMensaje("Registro clínico actualizado.");
      }
      cerrarFormulario();
      // Se vuelve a pedir al backend para mostrar lo que quedó guardado
      await cargarHistorial(seleccionado.id);
    } catch (err) {
      setError(`No se pudo guardar el registro clínico: ${err.message}`);
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
                    {esVeterinario ? "Historial clínico" : "Ver historial clínico"}
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
            <em>
              {esVeterinario
                ? "Puedes agregar nuevos registros o actualizar los existentes."
                : "Información de solo lectura registrada por el equipo veterinario del refugio."}
            </em>
          </p>

          {mensaje && <p style={{ color: "#166534", fontWeight: "bold" }}>{mensaje}</p>}

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
                  {esVeterinario && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {seleccionado.registrosClinicos.map((registro) => (
                  <tr
                    key={registro.id}
                    style={editando === registro.id ? { backgroundColor: "#fde68a" } : undefined}
                  >
                    <td>{formatearFecha(registro.fecha)}</td>
                    <td>{formatearEnum(registro.tipo)}</td>
                    <td>{registro.descripcion}</td>
                    <td>{registro.diagnostico || "—"}</td>
                    <td>{registro.tratamiento || "—"}</td>
                    <td>{registro.veterinario || "—"}</td>
                    <td>{registro.observaciones || "—"}</td>
                    {esVeterinario && (
                      <td>
                        <button type="button" onClick={() => handleEditar(registro)}>
                          Editar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {esVeterinario && editando === null && (
            <>
              <br />
              <button type="button" onClick={handleAgregar} style={estiloBoton}>
                Agregar registro
              </button>
            </>
          )}

          {esVeterinario && editando !== null && (
            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              style={{
                width: "100%",
                maxWidth: "520px",
                marginTop: "24px",
                padding: "20px",
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                boxSizing: "border-box",
              }}
            >
              <h4 style={{ marginTop: 0, fontSize: "1.3em" }}>
                {editando === "nuevo" ? "Nuevo registro clínico" : "Actualizar registro clínico"}
              </h4>

              <div style={{ marginBottom: "12px" }}>
                <label htmlFor="fecha">Fecha</label>
                <input
                  id="fecha"
                  type="date"
                  max={hoyComoTexto()}
                  style={estiloCampo}
                  {...register("fecha")}
                />
                {errors.fecha && <p style={estiloError}>{errors.fecha.message}</p>}
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label htmlFor="tipo">Tipo de registro</label>
                <select id="tipo" style={estiloCampo} {...register("tipo")}>
                  <option value="">Seleccione un tipo</option>
                  {TIPOS_REGISTRO_CLINICO.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {formatearEnum(tipo)}
                    </option>
                  ))}
                </select>
                {errors.tipo && <p style={estiloError}>{errors.tipo.message}</p>}
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label htmlFor="descripcion">Descripción</label>
                <textarea id="descripcion" rows={3} style={estiloCampo} {...register("descripcion")} />
                {errors.descripcion && <p style={estiloError}>{errors.descripcion.message}</p>}
              </div>

              {CAMPOS_TEXTO.map(({ nombre, etiqueta }) => (
                <div key={nombre} style={{ marginBottom: "12px" }}>
                  <label htmlFor={nombre}>{etiqueta} (opcional)</label>
                  <textarea id={nombre} rows={2} style={estiloCampo} {...register(nombre)} />
                  {errors[nombre] && <p style={estiloError}>{errors[nombre].message}</p>}
                </div>
              ))}

              <div style={{ marginBottom: "16px" }}>
                <label htmlFor="veterinario">Veterinario responsable (opcional)</label>
                <input id="veterinario" type="text" style={estiloCampo} {...register("veterinario")} />
                {errors.veterinario && <p style={estiloError}>{errors.veterinario.message}</p>}
              </div>

              <button type="submit" disabled={isSubmitting} style={estiloBoton}>
                {isSubmitting
                  ? "Guardando..."
                  : editando === "nuevo"
                    ? "Guardar registro"
                    : "Guardar cambios"}
              </button>{" "}
              <button type="button" onClick={cerrarFormulario} disabled={isSubmitting}>
                Cancelar
              </button>
            </form>
          )}

          <br />
          <button type="button" onClick={handleCerrarHistorial} style={estiloBoton}>
            Cerrar
          </button>
        </div>
      )}
    </section>
  );
}

export default HistorialPage;
