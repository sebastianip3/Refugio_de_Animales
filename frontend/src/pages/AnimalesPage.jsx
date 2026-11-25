import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { animalesApi, especiesApi } from "../services/api.js";
import { estilosUI } from "../components/EstilosUI.jsx";
import {
  animalFormSchema,
  SEXOS,
  ESTADOS,
  ESTADOS_INICIALES,
  EDAD_MAXIMA,
  PESO_MAXIMO,
  fechaMinimaNacimiento,
} from "../schemas/animal.schema.js";

const FORMULARIO_VACIO = {
  nombre: "",
  especieId: "",
  sexo: "DESCONOCIDO",
  fechaNacimiento: "",
  peso: null,
  estado: "EN_EVALUACION",
  tieneChip: false,
  numeroChip: "",
  fotografiaUrl: "",
  estadoGeneral: "",
  observaciones: "",
};

const MAX_CAMBIO_SEXO = 2;

const formatearEnum = (valor) => valor.replaceAll("_", " ").toLowerCase();

const hoy = new Date().toLocaleDateString("en-CA");

const formatearFecha = (fecha) => (fecha ? fecha.slice(0, 10).split("-").reverse().join("-") : "-");

// Convierte un animal de la BD a los valores del formulario
function aFormulario(animal) {
  return {
    nombre: animal.nombre ?? "",
    especieId: String(animal.especieId),
    sexo: animal.sexo,
    fechaNacimiento: animal.fechaNacimiento ? animal.fechaNacimiento.slice(0, 10) : "",
    peso: animal.peso ?? null,
    estado: animal.estado,
    tieneChip: animal.tieneChip ?? false,
    numeroChip: animal.numeroChip ?? "",
    fotografiaUrl: animal.fotografiaUrl ?? "",
    estadoGeneral: animal.estadoGeneral ?? "",
    observaciones: animal.observaciones ?? "",
  };
}

// ---------- Estilos con Tailwind (se reutilizan en toda la página) ----------
const estiloEtiqueta = estilosUI.etiqueta;
const estiloCampo = estilosUI.campo;
const estiloBotonPrincipal = estilosUI.botonPrincipal;
const estiloBotonSecundario = estilosUI.botonSecundario;
const estiloBloqueado = `${estiloCampo} bg-slate-100 text-slate-500`;

// Color de la etiqueta según el estado del animal
const COLOR_ESTADO = {
  EN_EVALUACION: "bg-amber-100 text-amber-800",
  CUARENTENA: "bg-orange-100 text-orange-800",
  EN_TRATAMIENTO: "bg-red-100 text-red-700",
  EN_ADOPCION: "bg-sky-100 text-sky-800",
  ADOPTADO: "bg-emerald-100 text-emerald-800",
  OTRO: "bg-slate-100 text-slate-700",
};

// Etiqueta + campo + mensaje de error
function Campo({ id, etiqueta, error, children }) {
  return (
    <div>
      <label htmlFor={id} className={estiloEtiqueta}>{etiqueta}</label>
      {children}
      {error && <p className="mt-1 text-sm text-red-600">{error.message}</p>}
    </div>
  );
}

function AnimalesPage() {
  const [animales, setAnimales] = useState([]);
  const [especies, setEspecies] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    // el schema depende de la especie elegida
    resolver: (valores, contexto, opciones) => {
      const especie = especies.find((e) => String(e.id) === String(valores.especieId));
      return zodResolver(animalFormSchema(especie?.nombre))(valores, contexto, opciones);
    },
    mode: "onTouched",
    defaultValues: FORMULARIO_VACIO,
  });

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

  const limpiarFormulario = () => {
    reset(FORMULARIO_VACIO);
    setEditandoId(null);
  };

  // solo se ejecuta si el schema aprobó los datos
  const guardar = async (datos) => {
    try {
      if (editandoId) {
        await animalesApi.actualizar(editandoId, datos);
      } else {
        await animalesApi.crear(datos);
      }
      limpiarFormulario();
      await cargarDatos();
    } catch (err) {
      setError(`No se pudo guardar: ${err.message}`);
    }
  };

  const handleEditar = (animal) => {
    setEditandoId(animal.id);
    reset(aFormulario(animal));
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" }); // sube al formulario
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

  const especieElegida = especies.find((especie) => String(especie.id) === String(watch("especieId")));
  const minNacimiento = fechaMinimaNacimiento(especieElegida?.nombre);
  const maxPeso = PESO_MAXIMO[especieElegida?.nombre] ?? 200;
  const tieneChip = watch("tieneChip");

  const animalEditando = animales.find((animal) => animal.id === editandoId);
  const sexoDefinido = animalEditando && animalEditando.sexo !== "DESCONOCIDO";
  const sexoBloqueado = sexoDefinido && animalEditando.cambioSexo >= MAX_CAMBIO_SEXO;
  const opcionesSexo = sexoDefinido ? SEXOS.filter((sexo) => sexo !== "DESCONOCIDO") : SEXOS;

  return (
    <section className={estilosUI.pagina}>
      <div className="mx-auto max-w-7xl space-y-6">
       {/*encabezado*/}
        <header className={estilosUI.encabezado}>
          <h1 className={estilosUI.titulo}>🐾 Animales</h1>
          <p className={estilosUI.subtitulo}>
            Registra y administra los animales del refugio.
          </p>
        </header>

        {error && (
          <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
            {error}
          </p>
        )}
       {/*formulario*/}
        <form
          onSubmit={handleSubmit(guardar)}
          noValidate
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-xl font-semibold text-slate-800">
            {editandoId ? `Editar animal #${editandoId}` : "Registrar animal"}
          </h2>

          {/* 1 columna en celular, 2 en tablet, 3 en pantalla grande */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Campo id="nombre" etiqueta="Nombre" error={errors.nombre}>
              <input id="nombre" {...register("nombre")} maxLength={30} placeholder="Sin nombre" className={estiloCampo} />
            </Campo>

            <Campo id="especieId" etiqueta="Especie" error={errors.especieId}>
              {editandoId ? (
                // al editar se muestra: la especie no se puede cambiar
                <input id="especieId" value={especieElegida?.nombre ?? ""} disabled className={estiloBloqueado} />
              ) : (
                <select id="especieId" {...register("especieId")} className={estiloCampo}>
                  <option value="">Seleccione una especie</option>
                  {especies.map((especie) => (
                    <option key={especie.id} value={especie.id}>{especie.nombre}</option>
                  ))}
                </select>
              )}
            </Campo>

            <Campo id="sexo" etiqueta="Sexo" error={errors.sexo}>
              {sexoBloqueado ? (
                <input id="sexo" value={formatearEnum(animalEditando.sexo)} disabled className={`${estiloBloqueado} capitalize`} />
              ) : (
                <select id="sexo" {...register("sexo")} className={`${estiloCampo} capitalize`}>
                  {opcionesSexo.map((sexo) => (
                    <option key={sexo} value={sexo}>{formatearEnum(sexo)}</option>
                  ))}
                </select>
              )}
              {animalEditando && (
                <p className="mt-1 text-xs text-slate-500">
                  {sexoBloqueado
                    ? "Ya se corrigió 2 veces, no se puede modificar"
                    : `Te quedan ${MAX_CAMBIO_SEXO - animalEditando.cambioSexo} de ${MAX_CAMBIO_SEXO} correcciones de sexo`}
                  {!sexoDefinido && " (definirlo por primera vez no gasta intentos)"}
                </p>
              )}
            </Campo>

            <Campo id="fechaNacimiento" etiqueta="Fecha nacimiento (estimada)" error={errors.fechaNacimiento}>
              <input
                id="fechaNacimiento"
                type="date"
                {...register("fechaNacimiento")}
                min={minNacimiento}
                max={hoy}
                title={especieElegida ? `Un ${especieElegida.nombre.toLowerCase()} no puede superar los ${EDAD_MAXIMA[especieElegida.nombre]} años` : undefined}
                className={estiloCampo}
              />
            </Campo>

            <Campo id="peso" etiqueta="Peso (kg)" error={errors.peso}>
              <input
                id="peso"
                type="number"
                {...register("peso", { setValueAs: (valor) => (valor === "" || valor === null ? null : Number(valor)) })}
                min={0}
                max={maxPeso}
                step="any"
                onKeyDown={(e) => ["-", "+", "e", "E", ","].includes(e.key) && e.preventDefault()}
                className={estiloCampo}
              />
            </Campo>

            <Campo id="estado" etiqueta="Estado" error={errors.estado}>
              <select id="estado" {...register("estado")} className={`${estiloCampo} capitalize`}>
                {(editandoId ? ESTADOS : ESTADOS_INICIALES).map((estado) => (
                  <option key={estado} value={estado}>{formatearEnum(estado)}</option>
                ))}
              </select>
            </Campo>

            <Campo id="fotografiaUrl" etiqueta="URL de fotografía" error={errors.fotografiaUrl}>
              <input id="fotografiaUrl" type="url" {...register("fotografiaUrl")} placeholder="https://..." className={estiloCampo} />
            </Campo>

            {/*  el número solo aparece si se marca la casilla (chip) */}
            <div className="flex items-end gap-4">
              <label className="flex cursor-pointer items-center gap-2 py-2 text-slate-700">
                <input type="checkbox" {...register("tieneChip")} className="h-5 w-5 accent-emerald-600" />
                Tiene chip
              </label>
            </div>

            {tieneChip && (
              <Campo id="numeroChip" etiqueta="Número de chip" error={errors.numeroChip}>
                <input
                  id="numeroChip"
                  {...register("numeroChip")}
                  inputMode="numeric"
                  maxLength={15}
                  placeholder="15 dígitos"
                  className={estiloCampo}
                />
              </Campo>
            )}

            {/* Los textos largos ocupan todo el ancho */}
            <div className="sm:col-span-2 lg:col-span-3">
              <Campo id="estadoGeneral" etiqueta="Estado general" error={errors.estadoGeneral}>
                <textarea id="estadoGeneral" {...register("estadoGeneral")} rows={2} className={estiloCampo} />
              </Campo>
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <Campo id="observaciones" etiqueta="Observaciones" error={errors.observaciones}>
                <textarea id="observaciones" {...register("observaciones")} rows={2} className={estiloCampo} />
              </Campo>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button type="submit" disabled={isSubmitting} className={estiloBotonPrincipal}>
              {isSubmitting ? "Guardando..." : editandoId ? "Guardar cambios" : "Registrar"}
            </button>
            {editandoId && (
              <button type="button" onClick={limpiarFormulario} className={estiloBotonSecundario}>
                Cancelar
              </button>
            )}
          </div>
        </form>

        {/* Listado */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-slate-800">
            Listado {!cargando && <span className="text-base font-normal text-slate-500">({animales.length})</span>}
          </h2>

          {cargando ? (
            <p className="text-slate-500">Cargando...</p>
          ) : animales.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-6 text-center text-slate-500">
              No hay animales registrados.
            </p>
          ) : (
            // overflow-x-auto: en pantallas chicas la tabla se desliza en vez de romper la página
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-3">ID</th>
                    <th className="px-3 py-3">Nombre</th>
                    <th className="px-3 py-3">Especie</th>
                    <th className="px-3 py-3">Sexo</th>
                    <th className="px-3 py-3">Fecha Nacimiento</th>
                    <th className="px-3 py-3">Peso (kg)</th>
                    <th className="px-3 py-3">Estado</th>
                    <th className="px-3 py-3">Ingreso</th>
                    <th className="px-3 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {animales.map((animal) => (
                    <tr
                      key={animal.id}
                      className={`border-b border-slate-100 hover:bg-slate-50 ${editandoId === animal.id ? "bg-emerald-50" : ""}`}
                    >
                      <td className="px-3 py-3 text-slate-500">{animal.id}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          {animal.fotografiaUrl ? (
                            <img
                              src={animal.fotografiaUrl}
                              alt={animal.nombre || "Animal"}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                              🐾
                            </div>
                          )}
                          <span className="font-medium text-slate-800">{animal.nombre || "—"}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">{animal.especie?.nombre}</td>
                      <td className="px-3 py-3 capitalize">{formatearEnum(animal.sexo)}</td>
                      <td className="px-3 py-3">{formatearFecha(animal.fechaNacimiento)}</td>
                      <td className="px-3 py-3">{animal.peso ?? "—"}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${COLOR_ESTADO[animal.estado] ?? COLOR_ESTADO.OTRO}`}
                        >
                          {formatearEnum(animal.estado)}
                        </span>
                      </td>
                      <td className="px-3 py-3">{new Date(animal.fechaIngreso).toLocaleDateString("es-CL")}</td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditar(animal)}
                            className="cursor-pointer rounded-md border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-100"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEliminar(animal)}
                            className="cursor-pointer rounded-md border border-red-200 px-3 py-1 text-red-600 hover:bg-red-50"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
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

export default AnimalesPage;