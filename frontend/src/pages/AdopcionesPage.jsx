import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { adopcionesApi, animalesApi } from "../services/api.js";
import { adopcionFormSchema } from "../schemas/adopcion.schema.js";
import { puedeEvaluarAdopciones } from "../utils.js";

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

const formatearEnum = (valor) =>
  valor.replaceAll("_", " ").toLowerCase();

function aPayload(formulario) {
  const textoONull = (valor) =>
    valor.trim() === "" ? null : valor.trim();

  return {
    animalId: Number(formulario.animalId),
    nombre: formulario.nombre.trim(),
    rut: formulario.rut.trim(),
    email: formulario.email.trim(),
    telefono: formulario.telefono.trim(),
    direccion: formulario.direccion.trim(),
    comuna: formulario.comuna.trim(),

    tipoVivienda: textoONull(
      formulario.tipoVivienda
    ),

    otrasMascotas: textoONull(
      formulario.otrasMascotas
    ),

    motivo: textoONull(
      formulario.motivo
    ),
  };
}

// Datos de la ficha que el encargado revisa antes de evaluar
const CAMPOS_FICHA = [
  { campo: "nombre", label: "Adoptante" },
  { campo: "rut", label: "RUT" },
  { campo: "email", label: "Correo electrónico" },
  { campo: "telefono", label: "Teléfono" },
  { campo: "direccion", label: "Dirección" },
  { campo: "comuna", label: "Comuna" },
  { campo: "tipoVivienda", label: "Tipo de vivienda" },
  { campo: "otrasMascotas", label: "Otras mascotas" },
  { campo: "motivo", label: "Motivo de la adopción" },
];

const estiloCampo = {
  backgroundColor: "#ffffff",
  border: "1px solid #ccc",
  borderRadius: "4px",
  padding: "8px",
  marginBottom: "4px",
  marginTop: "5px",
};

const estiloError = {
  color: "crimson",
  fontSize: "0.85em",
  marginTop: "2px",
  marginBottom: "10px",
};

function AdopcionesPage({ cuenta }) {
  const esEncargado = puedeEvaluarAdopciones(cuenta);

  const [adopciones, setAdopciones] = useState([]);
  const [animales, setAnimales] = useState([]);
  const [idsEnProceso, setIdsEnProceso] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorServidor, setErrorServidor] =
    useState("");
  const [mensaje, setMensaje] = useState("");
  const [fichaAbierta, setFichaAbierta] = useState(null);
  const [observaciones, setObservaciones] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm({
    resolver: zodResolver(adopcionFormSchema),
    defaultValues: FORMULARIO_VACIO,
    mode: "onChange",
  });

  const cargarDatos = async () => {
    try {
      setCargando(true);

      // La lista de solicitudes tiene datos personales: solo se pide si es el encargado
      const [listaAnimales, enProceso, listaAdopciones] =
        await Promise.all([
          animalesApi.listar(),
          adopcionesApi.animalesEnProceso(),
          esEncargado ? adopcionesApi.listar() : [],
        ]);

      setAnimales(listaAnimales);
      setIdsEnProceso(enProceso);
      setAdopciones(listaAdopciones);
      setErrorServidor("");
    } catch (err) {
      setErrorServidor(
        `No se pudieron cargar los datos: ${err.message}`
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [esEncargado]);

  const animalesEnProceso = new Set(idsEnProceso);

  const animalesDisponibles = animales.filter(
    (animal) => animal.estado !== "ADOPTADO"
  );

  const nombreAnimal = (animal) =>
    `${animal.nombre || "Sin nombre"} (#${animal.id}, ${
      animal.especie?.nombre ?? "?"
    })`;

  const onSubmit = async (datos) => {
    try {
      setMensaje("");
      setErrorServidor("");

      await adopcionesApi.crear(
        aPayload(datos)
      );

      reset(FORMULARIO_VACIO);

      setMensaje(
        "Solicitud de adopción registrada."
      );

      await cargarDatos();
    } catch (err) {
      setErrorServidor(
        `No se pudo registrar la adopción: ${err.message}`
      );
    }
  };

  const handleAbrirFicha = (adopcion) => {
    setFichaAbierta(adopcion);
    setObservaciones(adopcion.observaciones ?? "");
    setMensaje("");
    setErrorServidor("");
  };

  const handleCambiarEstado = async (
    adopcion,
    estado
  ) => {
    if (
      !window.confirm(
        `¿Cambiar la adopción #${adopcion.id} a "${formatearEnum(
          estado
        )}"?`
      )
    ) {
      return;
    }

    try {
      setMensaje("");
      setErrorServidor("");

      await adopcionesApi.actualizar(
        adopcion.id,
        {
          estado,
          observaciones:
            observaciones.trim() || null,
        }
      );

      setFichaAbierta(null);

      await cargarDatos();
    } catch (err) {
      setErrorServidor(
        `No se pudo actualizar: ${err.message}`
      );
    }
  };

  return (
    <section
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        boxSizing: "border-box",
        backgroundColor: "#47b0f7",
      }}
    >
      <h2
        style={{
          textAlign: "center",
          fontSize: "5em",
          marginBottom: "1px",
        }}
      >
        Adopciones
      </h2>

      {errorServidor && (
        <p style={{ color: "crimson" }}>
          {errorServidor}
        </p>
      )}

      {mensaje && (
        <p style={{ color: "green" }}>
          {mensaje}
        </p>
      )}

      <h3
        style={{
          marginTop: "40px",
          marginBottom: "20px",
          fontSize: "1.5em",
          color: "#030507",
        }}
      >
        Ficha de adopción
      </h3>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div>
          <label
            htmlFor="animalId"
            style={{ fontSize: "1.2em" }}
          >
            Animal
          </label>

          <br />

          <select
            id="animalId"
            style={estiloCampo}
            {...register("animalId")}
          >
            <option value="">
              Seleccione un animal
            </option>

            {animalesDisponibles.map(
              (animal) => (
                <option
                  key={animal.id}
                  value={animal.id}
                  disabled={animalesEnProceso.has(
                    animal.id
                  )}
                >
                  {nombreAnimal(animal)}
                  {animalesEnProceso.has(
                    animal.id
                  )
                    ? " — adopción en proceso"
                    : ""}
                </option>
              )
            )}
          </select>

          {errors.animalId && (
            <p style={estiloError}>
              {errors.animalId.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="nombre"
            style={{ fontSize: "1.2em" }}
          >
            Nombre completo
          </label>

          <br />

          <input
            type="text"
            id="nombre"
            style={estiloCampo}
            {...register("nombre")}
          />

          {errors.nombre && (
            <p style={estiloError}>
              {errors.nombre.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="rut"
            style={{ fontSize: "1.2em" }}
          >
            RUT
          </label>

          <br />

          <input
            type="text"
            id="rut"
            placeholder="12.345.678-5"
            style={estiloCampo}
            {...register("rut")}
          />

          {errors.rut && (
            <p style={estiloError}>
              {errors.rut.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="email"
            style={{ fontSize: "1.2em" }}
          >
            Correo electrónico
          </label>

          <br />

          <input
            type="email"
            id="email"
            placeholder="correo@ejemplo.com"
            style={estiloCampo}
            {...register("email")}
          />

          {errors.email && (
            <p style={estiloError}>
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="telefono"
            style={{ fontSize: "1.2em" }}
          >
            Teléfono
          </label>

          <br />

          <input
            type="tel"
            id="telefono"
            placeholder="912345678"
            style={estiloCampo}
            {...register("telefono")}
          />

          {errors.telefono && (
            <p style={estiloError}>
              {errors.telefono.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="direccion"
            style={{ fontSize: "1.2em" }}
          >
            Dirección
          </label>

          <br />

          <input
            type="text"
            id="direccion"
            style={estiloCampo}
            {...register("direccion")}
          />

          {errors.direccion && (
            <p style={estiloError}>
              {errors.direccion.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="comuna"
            style={{ fontSize: "1.2em" }}
          >
            Comuna
          </label>

          <br />

          <input
            type="text"
            id="comuna"
            style={estiloCampo}
            {...register("comuna")}
          />

          {errors.comuna && (
            <p style={estiloError}>
              {errors.comuna.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="tipoVivienda"
            style={{ fontSize: "1.2em" }}
          >
            Tipo de vivienda
          </label>

          <br />

          <input
            type="text"
            id="tipoVivienda"
            placeholder="Casa con patio, departamento..."
            style={estiloCampo}
            {...register("tipoVivienda")}
          />

          {errors.tipoVivienda && (
            <p style={estiloError}>
              {errors.tipoVivienda.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="otrasMascotas"
            style={{ fontSize: "1.2em" }}
          >
            Otras mascotas
          </label>

          <br />

          <textarea
            id="otrasMascotas"
            style={estiloCampo}
            {...register("otrasMascotas")}
          />

          {errors.otrasMascotas && (
            <p style={estiloError}>
              {errors.otrasMascotas.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="motivo"
            style={{ fontSize: "1.2em" }}
          >
            Motivo de la adopción
          </label>

          <br />

          <textarea
            id="motivo"
            style={estiloCampo}
            {...register("motivo")}
          />

          {errors.motivo && (
            <p style={estiloError}>
              {errors.motivo.message}
            </p>
          )}
        </div>

        <br />

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            backgroundColor: "#08385f",
            color: "#ffffff",
            border: "1px solid #333",
            padding: "10px 20px",
            cursor: isSubmitting
              ? "not-allowed"
              : "pointer",
            display: "block",
            margin: "0 auto",
          }}
        >
          {isSubmitting
            ? "Enviando..."
            : "Enviar solicitud"}
        </button>
      </form>

      {/* Solo el encargado ve y evalúa las solicitudes */}
      {esEncargado && (
        <>
          <h3
            style={{
              marginTop: "40px",
              marginBottom: "20px",
              fontSize: "2em",
              color: "#030507",
            }}
          >
            Solicitudes
          </h3>

          {cargando ? (
            <p>Cargando...</p>
          ) : adopciones.length === 0 ? (
            <p
              style={{
                color: "crimson",
                fontWeight: "bold",
                fontSize: "1.5em",
              }}
            >
              No hay solicitudes de adopción.
            </p>
          ) : (
            <table
              border="1"
              cellPadding="6"
            >
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
                {adopciones.map(
                  (adopcion) => (
                    <tr key={adopcion.id}>
                      <td>{adopcion.id}</td>

                      <td>
                        {nombreAnimal(
                          adopcion.animal
                        )}
                      </td>

                      <td>
                        {adopcion.nombre}
                      </td>

                      <td>
                        {adopcion.rut}
                      </td>

                      <td>
                        {adopcion.email}
                        <br />
                        {adopcion.telefono}
                      </td>

                      <td>
                        {adopcion.comuna}
                      </td>

                      <td>
                        {new Date(
                          adopcion.fechaSolicitud
                        ).toLocaleDateString(
                          "es-CL"
                        )}
                      </td>

                      <td>
                        {formatearEnum(
                          adopcion.estado
                        )}
                      </td>

                      <td>
                        <button
                          type="button"
                          onClick={() =>
                            handleAbrirFicha(
                              adopcion
                            )
                          }
                        >
                          {ACCIONES[adopcion.estado]
                            ? "Evaluar"
                            : "Ver ficha"}
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}

          {fichaAbierta && (
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                padding: "24px",
                marginTop: "30px",
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  fontSize: "1.5em",
                  color: "#030507",
                }}
              >
                Solicitud #{fichaAbierta.id}:{" "}
                {nombreAnimal(fichaAbierta.animal)}
              </h3>

              <p>
                Estado:{" "}
                {formatearEnum(fichaAbierta.estado)}
              </p>

              {errorServidor && (
                <p style={{ color: "crimson" }}>
                  {errorServidor}
                </p>
              )}

              <table
                border="1"
                cellPadding="6"
              >
                <tbody>
                  {CAMPOS_FICHA.map(
                    ({ campo, label }) => (
                      <tr key={campo}>
                        <th>{label}</th>
                        <td>
                          {fichaAbierta[campo] ||
                            "—"}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>

              {ACCIONES[fichaAbierta.estado] ? (
                <>
                  <div>
                    <label
                      htmlFor="observacionesEvaluacion"
                      style={{ fontSize: "1.2em" }}
                    >
                      <br />
                      Observaciones de la evaluación
                    </label>

                    <br />

                    <textarea
                      id="observacionesEvaluacion"
                      value={observaciones}
                      onChange={(e) =>
                        setObservaciones(
                          e.target.value
                        )
                      }
                      style={estiloCampo}
                    />
                  </div>

                  {ACCIONES[
                    fichaAbierta.estado
                  ].map((accion) => (
                    <button
                      key={accion.estado}
                      type="button"
                      onClick={() =>
                        handleCambiarEstado(
                          fichaAbierta,
                          accion.estado
                        )
                      }
                    >
                      {accion.label}
                    </button>
                  ))}
                </>
              ) : (
                <p>
                  Observaciones:{" "}
                  {fichaAbierta.observaciones || "—"}
                </p>
              )}

              <button
                type="button"
                onClick={() => setFichaAbierta(null)}
              >
                Cerrar
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default AdopcionesPage;