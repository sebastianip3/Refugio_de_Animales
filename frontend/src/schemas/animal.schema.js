import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { animalesApi, especiesApi } from "../services/api.js";
import {
  animalFormSchema,
  SEXOS,
  ESTADOS_ANIMAL,
} from "../schemas/animal.schema.js";

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

const formatearEnum = (valor) =>
  valor.replaceAll("_", " ").toLowerCase();

function aPayload(formulario) {
  const textoONull = (valor) =>
    valor.trim() === "" ? null : valor.trim();

  const numeroONull = (valor) =>
    valor === "" ? null : Number(valor);

  return {
    nombre: textoONull(formulario.nombre),
    especieId: Number(formulario.especieId),
    sexo: formulario.sexo,
    edadEstimada: numeroONull(formulario.edadEstimada),
    peso: numeroONull(formulario.peso),
    estado: formulario.estado,
    tieneChip: formulario.tieneChip,
    numeroChip: formulario.tieneChip
      ? textoONull(formulario.numeroChip)
      : null,
    fotografiaUrl: textoONull(formulario.fotografiaUrl),
    estadoGeneral: textoONull(formulario.estadoGeneral),
    observaciones: textoONull(formulario.observaciones),
  };
}

function aFormulario(animal) {
  return {
    nombre: animal.nombre ?? "",
    especieId: String(animal.especieId),
    sexo: animal.sexo ?? "DESCONOCIDO",
    edadEstimada:
      animal.edadEstimada != null
        ? String(animal.edadEstimada)
        : "",
    peso:
      animal.peso != null
        ? String(animal.peso)
        : "",
    estado: animal.estado ?? "EN_EVALUACION",
    tieneChip: animal.tieneChip ?? false,
    numeroChip: animal.numeroChip ?? "",
    fotografiaUrl: animal.fotografiaUrl ?? "",
    estadoGeneral: animal.estadoGeneral ?? "",
    observaciones: animal.observaciones ?? "",
  };
}

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

function AnimalesPage() {
  const [animales, setAnimales] = useState([]);
  const [especies, setEspecies] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorServidor, setErrorServidor] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm({
    resolver: zodResolver(animalFormSchema),
    defaultValues: FORMULARIO_VACIO,
    mode: "onChange",
  });

  const tieneChip = watch("tieneChip");

  const cargarDatos = async () => {
    try {
      setCargando(true);

      const [listaAnimales, listaEspecies] =
        await Promise.all([
          animalesApi.listar(),
          especiesApi.listar(),
        ]);

      setAnimales(listaAnimales);
      setEspecies(listaEspecies);
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
  }, []);

  const limpiarFormulario = () => {
    reset(FORMULARIO_VACIO);
    setEditandoId(null);
    setErrorServidor("");
  };

  const onSubmit = async (datos) => {
    try {
      setErrorServidor("");

      const payload = aPayload(datos);

      if (editandoId) {
        await animalesApi.actualizar(
          editandoId,
          payload
        );
      } else {
        await animalesApi.crear(payload);
      }

      limpiarFormulario();
      await cargarDatos();
    } catch (err) {
      setErrorServidor(
        `No se pudo guardar: ${err.message}`
      );
    }
  };

  const handleEditar = (animal) => {
    setEditandoId(animal.id);
    reset(aFormulario(animal));
    setErrorServidor("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleEliminar = async (animal) => {
    const nombre =
      animal.nombre || `#${animal.id}`;

    if (
      !window.confirm(
        `¿Eliminar a ${nombre}?`
      )
    ) {
      return;
    }

    try {
      await animalesApi.eliminar(animal.id);

      if (editandoId === animal.id) {
        limpiarFormulario();
      }

      await cargarDatos();
    } catch (err) {
      setErrorServidor(
        `No se pudo eliminar: ${err.message}`
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
        padding: "24px",
        boxSizing: "border-box",
        backgroundColor: "#b5f391",
      }}
    >
      <h2
        style={{
          marginBottom: "1px",
          fontSize: "5em",
          color: "#030507",
        }}
      >
        Animales
      </h2>

      {errorServidor && (
        <p style={{ color: "crimson" }}>
          {errorServidor}
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
        {editandoId
          ? `Editar animal #${editandoId}`
          : "Registrar animal"}
      </h3>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div>
          <label
            htmlFor="nombre"
            style={{ fontSize: "1.2em" }}
          >
            Nombre
          </label>

          <br />

          <input
            type="text"
            id="nombre"
            placeholder="Sin nombre"
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
            htmlFor="especieId"
            style={{ fontSize: "1.2em" }}
          >
            Especie
          </label>

          <br />

          <select
            id="especieId"
            style={estiloCampo}
            {...register("especieId")}
          >
            <option value="">
              Seleccione una especie
            </option>

            {especies.map((especie) => (
              <option
                key={especie.id}
                value={especie.id}
              >
                {especie.nombre}
              </option>
            ))}
          </select>

          {errors.especieId && (
            <p style={estiloError}>
              {errors.especieId.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="sexo"
            style={{ fontSize: "1.2em" }}
          >
            Sexo
          </label>

          <br />

          <select
            id="sexo"
            style={estiloCampo}
            {...register("sexo")}
          >
            {SEXOS.map((sexo) => (
              <option key={sexo} value={sexo}>
                {formatearEnum(sexo)}
              </option>
            ))}
          </select>

          {errors.sexo && (
            <p style={estiloError}>
              {errors.sexo.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="edadEstimada"
            style={{ fontSize: "1.2em" }}
          >
            Edad estimada (meses)
          </label>

          <br />

          <input
            type="number"
            id="edadEstimada"
            min="0"
            step="1"
            style={estiloCampo}
            {...register("edadEstimada")}
          />

          {errors.edadEstimada && (
            <p style={estiloError}>
              {errors.edadEstimada.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="peso"
            style={{ fontSize: "1.2em" }}
          >
            Peso (kg)
          </label>

          <br />

          <input
            type="number"
            id="peso"
            min="0.01"
            step="0.01"
            style={estiloCampo}
            {...register("peso")}
          />

          {errors.peso && (
            <p style={estiloError}>
              {errors.peso.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="estado"
            style={{ fontSize: "1.2em" }}
          >
            Estado
          </label>

          <br />

          <select
            id="estado"
            style={estiloCampo}
            {...register("estado")}
          >
            {ESTADOS_ANIMAL.map((estado) => (
              <option
                key={estado}
                value={estado}
              >
                {formatearEnum(estado)}
              </option>
            ))}
          </select>

          {errors.estado && (
            <p style={estiloError}>
              {errors.estado.message}
            </p>
          )}
        </div>

        <div>
          <label
            style={{
              display: "block",
              textAlign: "center",
              fontSize: "1.2em",
            }}
          >
            <input
              type="checkbox"
              {...register("tieneChip")}
            />

            {" "}Tiene chip
          </label>
        </div>

        {tieneChip && (
          <div>
            <label
              htmlFor="numeroChip"
              style={{ fontSize: "1.2em" }}
            >
              Número de chip
            </label>

            <br />

            <input
              type="text"
              id="numeroChip"
              style={estiloCampo}
              {...register("numeroChip")}
            />

            {errors.numeroChip && (
              <p style={estiloError}>
                {errors.numeroChip.message}
              </p>
            )}
          </div>
        )}

        <div>
          <label
            htmlFor="fotografiaUrl"
            style={{ fontSize: "1.2em" }}
          >
            URL de fotografía
          </label>

          <br />

          <input
            type="text"
            id="fotografiaUrl"
            placeholder="https://..."
            style={estiloCampo}
            {...register("fotografiaUrl")}
          />

          {errors.fotografiaUrl && (
            <p style={estiloError}>
              {errors.fotografiaUrl.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="estadoGeneral"
            style={{ fontSize: "1.2em" }}
          >
            Estado general
          </label>

          <br />

          <textarea
            id="estadoGeneral"
            style={estiloCampo}
            {...register("estadoGeneral")}
          />

          {errors.estadoGeneral && (
            <p style={estiloError}>
              {errors.estadoGeneral.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="observaciones"
            style={{ fontSize: "1.2em" }}
          >
            Observaciones
          </label>

          <br />

          <textarea
            id="observaciones"
            style={estiloCampo}
            {...register("observaciones")}
          />

          {errors.observaciones && (
            <p style={estiloError}>
              {errors.observaciones.message}
            </p>
          )}
        </div>

        <br />

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            backgroundColor: "#435f0f",
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
            ? "Guardando..."
            : editandoId
              ? "Guardar cambios"
              : "Registrar"}
        </button>

        {editandoId && (
          <button
            type="button"
            onClick={limpiarFormulario}
          >
            Cancelar
          </button>
        )}
      </form>

      <h3
        style={{
          marginTop: "40px",
          marginBottom: "20px",
          fontSize: "2em",
          color: "#030507",
        }}
      >
        Listado
      </h3>

      {cargando ? (
        <p>Cargando...</p>
      ) : animales.length === 0 ? (
        <p
          style={{
            color: "crimson",
            fontWeight: "bold",
            fontSize: "1.5em",
          }}
        >
          No hay animales registrados.
        </p>
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
                <td>
                  {formatearEnum(animal.sexo)}
                </td>
                <td>
                  {animal.edadEstimada ?? "—"}
                </td>
                <td>{animal.peso ?? "—"}</td>
                <td>
                  {formatearEnum(animal.estado)}
                </td>
                <td>
                  {new Date(
                    animal.fechaIngreso
                  ).toLocaleDateString("es-CL")}
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() =>
                      handleEditar(animal)
                    }
                  >
                    Editar
                  </button>{" "}

                  <button
                    type="button"
                    onClick={() =>
                      handleEliminar(animal)
                    }
                  >
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