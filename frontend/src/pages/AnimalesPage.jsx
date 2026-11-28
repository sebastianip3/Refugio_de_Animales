import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { animalesApi, especiesApi } from "../services/api.js";
import {
  animalFormSchema, SEXOS, ESTADOS_INICIALES, ESTADOS_MANUALES, ESTADOS_BLOQUEADOS,
  EDAD_MAXIMA, PESO_MAXIMO, MAX_CAMBIOS, MAX_CAMBIOS_FECHA, fechaMinimaNacimiento,
} from "../schemas/animal.schema.js";
import { estilosUI } from "../components/EstilosUI.jsx";
import { puedeRegistrarAnimales, puedeEditarAnimales, puedeEliminarAnimales } from "../utils.js";

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
  motivoEgreso: "",
};

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
    motivoEgreso: animal.motivoEgreso ?? "",
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
  ADOPTABLE: "bg-sky-100 text-sky-800",
  EN_ADOPCION: "bg-indigo-100 text-indigo-800",
  ADOPTADO: "bg-emerald-100 text-emerald-800",
  NO_ADOPTABLE: "bg-rose-100 text-rose-800",
  FALLECIDO: "bg-slate-200 text-slate-700",
  EXTRAVIADO: "bg-purple-100 text-purple-800",
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

//muestra cuantos intentos le quedan al editar
function AvisoIntentos({ definido, usados, campo, maximo = MAX_CAMBIOS }) {
  const quedan = maximo - usados;
  let texto = `Te quedan ${quedan} de ${maximo} cambios de ${campo}`;
  if (!definido) texto = `Definir ${campo} por primera vez no gasta intentos`;
  else if (quedan <= 0) texto = `Ya se cambió ${maximo} ${maximo === 1 ? "vez" : "veces"}, no se puede modificar`;

  return <p className="mt-1 text-xs text-slate-500">{texto}</p>; 
}

// campos que el usuario cambió y cuyo cambio gasta el último intento disponible
function camposUltimoIntento(animal, datos) {
  if (!animal) return []; // al registrar no hay intentos

  const campos = [
    { texto: "el nombre", definido: Boolean(animal.nombre), cambio: datos.nombre !== animal.nombre, usados: animal.cambioNombre, maximo: MAX_CAMBIOS },
    { texto: "el sexo", definido: animal.sexo !== "DESCONOCIDO", cambio: datos.sexo !== animal.sexo, usados: animal.cambioSexo, maximo: MAX_CAMBIOS },
    { texto: "el número de chip", definido: Boolean(animal.numeroChip), cambio: datos.numeroChip !== animal.numeroChip, usados: animal.cambioChip, maximo: MAX_CAMBIOS },
    { texto: "la fecha de nacimiento", definido: Boolean(animal.fechaNacimiento), cambio: datos.fechaNacimiento !== animal.fechaNacimiento?.slice(0, 10), usados: animal.cambioFechaNacimiento, maximo: MAX_CAMBIOS_FECHA },
  ];

  // si se pone por primera vez no gasta intentos; usados === maximo-1 le queda solo uno
  return campos.filter((c) => c.definido && c.cambio && c.usados === c.maximo - 1).map((c) => c.texto);
}

// cuenta: sesión del personal 
function AnimalesPage({ cuenta }) {
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
    if (datos.estado === "FALLECIDO" && !window.confirm("¿Seguro? Un animal fallecido no se puede volver a editar, adoptar ni asignar.")) return;
    if (datos.estado === "EXTRAVIADO" && !window.confirm("¿Seguro? Quedará bloqueado hasta marcarlo como encontrado.")) return;

    const ultimos = camposUltimoIntento(animalEditando, datos);
    if (ultimos.length > 0 && !window.confirm(
      `¿Seguro que quieres cambiar ${ultimos.join(" y ")}? Es tu último intento: después no se podrá volver a modificar.`
    )) return;

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
    const nombre = animal.nombre || "este animal sin nombre";
    if (!window.confirm(`¿Eliminar a ${nombre}?`)) return;

    try {
      await animalesApi.eliminar(animal.id);
      if (editandoId === animal.id) limpiarFormulario();
      await cargarDatos();
    } catch (err) {
      setError(`No se pudo eliminar: ${err.message}`);
    }
  };

  const handleEncontrado = async (animal) => {
    if (!window.confirm(`¿${animal.nombre || "El animal"} fue encontrado? Volverá a evaluación.`)) return;
    try {
      await animalesApi.encontrado(animal.id);
      await cargarDatos();
    } catch (err) {
      setError(`No se pudo actualizar: ${err.message}`);
    }
  };

  const especieElegida = especies.find((especie) => String(especie.id) === String(watch("especieId")));
  const minNacimiento = fechaMinimaNacimiento(especieElegida?.nombre);
  const maxPeso = PESO_MAXIMO[especieElegida?.nombre] ?? 200;
  const tieneChip = watch("tieneChip");
  const esEgreso = ["FALLECIDO", "EXTRAVIADO"].includes(watch("estado"));

  const animalEditando = animales.find((animal) => animal.id === editandoId);

  // permisos según el rol de la cuenta 
  const puedeRegistrar = puedeRegistrarAnimales(cuenta); // administrador, trabajador, voluntario
  const puedeEditar = puedeEditarAnimales(cuenta); // los anteriores, encargado de adopciones
  const puedeEliminar = puedeEliminarAnimales(cuenta); // solo administrador
  // el formulario solo le aparece al editar al encargado de adopciones
  const mostrarFormulario = puedeRegistrar || (puedeEditar && editandoId);
  // si no puede editar ni eliminar, no se muestra la columna "Acciones"
  const tieneAcciones = puedeEditar || puedeEliminar;

  const sexoDefinido = animalEditando && animalEditando.sexo !== "DESCONOCIDO";
  const sexoBloqueado = sexoDefinido && animalEditando.cambioSexo >= MAX_CAMBIOS;
  const opcionesSexo = sexoDefinido ? SEXOS.filter((sexo) => sexo !== "DESCONOCIDO") : SEXOS;

  const nombreDefinido = Boolean(animalEditando?.nombre);
  const nombreBloqueado = nombreDefinido && animalEditando.cambioNombre >= MAX_CAMBIOS;

  const chipDefinido = Boolean(animalEditando?.numeroChip);
  const chipBloqueado = chipDefinido && animalEditando.cambioChip >= MAX_CAMBIOS;

  const fechaDefinida = Boolean(animalEditando?.fechaNacimiento);
  const fechaBloqueada = fechaDefinida && animalEditando.cambioFechaNacimiento >= MAX_CAMBIOS_FECHA;

  // registrar: estados iniciales; con solicitud en curso: solo fallecido/extraviado; al editar: los manuales
  let opcionesEstado = ESTADOS_INICIALES;
  if (animalEditando?.estado === "EN_ADOPCION") opcionesEstado = ["EN_ADOPCION", "FALLECIDO", "EXTRAVIADO"];
  else if (animalEditando) opcionesEstado = ESTADOS_MANUALES;

  // peso: corta los decimales extra antes de que react-hook-form lea el valor
  const registroPeso = register("peso", {
    setValueAs: (valor) => (valor === "" || valor === null ? null : Number(valor)),
  });
  const cambiarPeso = (e) => {
    const [entero, decimales] = e.target.value.split(".");
    if (decimales?.length > 2) e.target.value = `${entero}.${decimales.slice(0, 2)}`;
    registroPeso.onChange(e);
  };

  return (
    <section className={estilosUI.pagina}>
      <div className="mx-auto max-w-7xl space-y-6">
       {/*encabezado*/}
        <header className={estilosUI.encabezado}>
          <h1 className={estilosUI.titulo}>🐾 Animales</h1>
          <p className={estilosUI.subtitulo}>
            {cuenta ? "Registra y administra los animales del refugio." : "Conoce a los animales que viven en nuestro refugio."}
          </p>
        </header>

        {error && (
          <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
            {error}
          </p>
        )}

       {/*formulario solo para quien tiene permiso de registrar o está editando con permiso*/}
        {mostrarFormulario && (
        <form
          onSubmit={handleSubmit(guardar)}
          noValidate
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-xl font-semibold text-slate-800">
            {/*se muestra nombre del animal*/}
            {editandoId ? `Editar a ${animalEditando?.nombre || "animal sin nombre"}` : "Registrar animal"}
          </h2>

          {/* 1 columna en celular, 2 en tablet, 3 en pantalla grande */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Campo id="nombre" etiqueta="Nombre" error={errors.nombre}>
              {nombreBloqueado ? (
                <input id="nombre" value={animalEditando.nombre} disabled className={estiloBloqueado} />
              ) : (
                <input id="nombre" {...register("nombre")} maxLength={30} placeholder="Sin nombre" className={estiloCampo} />
              )}
              {animalEditando && <AvisoIntentos definido={nombreDefinido} usados={animalEditando.cambioNombre} campo="nombre" />}
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
              {animalEditando && <AvisoIntentos definido={sexoDefinido} usados={animalEditando.cambioSexo} campo="sexo" />}
            </Campo>

            <Campo id="fechaNacimiento" etiqueta="Fecha nacimiento (estimada)" error={errors.fechaNacimiento}>
              {fechaBloqueada ? (
                <input id="fechaNacimiento" value={formatearFecha(animalEditando.fechaNacimiento)} disabled className={estiloBloqueado} />
              ) : (
                <input
                  id="fechaNacimiento"
                  type="date"
                  {...register("fechaNacimiento")}
                  min={minNacimiento}
                  max={hoy}
                  title={especieElegida ? `Un ${especieElegida.nombre.toLowerCase()} no puede superar los ${EDAD_MAXIMA[especieElegida.nombre]} años` : undefined}
                  className={estiloCampo}
                />
              )}
              {animalEditando && (
                <AvisoIntentos definido={fechaDefinida} usados={animalEditando.cambioFechaNacimiento} campo="fecha" maximo={MAX_CAMBIOS_FECHA} />
              )}
            </Campo>

            <Campo id="peso" etiqueta="Peso (kg)" error={errors.peso}>
              <input
                id="peso"
                type="number"
                {...registroPeso}
                onChange={cambiarPeso}
                min={0}
                max={maxPeso}
                step="any"
                onKeyDown={(e) => ["-", "+", "e", "E", ","].includes(e.key) && e.preventDefault()}
                className={estiloCampo}
              />
            </Campo>

            <Campo id="estado" etiqueta="Estado" error={errors.estado}>
              <select id="estado" {...register("estado")} className={`${estiloCampo} capitalize`}>
              {opcionesEstado.map((estado) => (
                  <option key={estado} value={estado}>{formatearEnum(estado)}</option>
                ))}
              </select>
            </Campo>

            {esEgreso && (
              <div className="sm:col-span-2 lg:col-span-3">
                <Campo id="motivoEgreso" etiqueta="Motivo del egreso (obligatorio)" error={errors.motivoEgreso}>
                  <textarea id="motivoEgreso" {...register("motivoEgreso")} rows={2} maxLength={100}
                    placeholder="Ej: falleció por neumonia / se escapó durante el paseo" className={estiloCampo} />
                </Campo>
              </div>
            )}

            <Campo id="fotografiaUrl" etiqueta="URL de fotografía" error={errors.fotografiaUrl}>
              <input id="fotografiaUrl" type="url" {...register("fotografiaUrl")} placeholder="https://..." className={estiloCampo} />
            </Campo>

            {/*  el número solo aparece si se marca la casilla (chip) */}
            <div className="flex items-end gap-4">
              <label className="flex cursor-pointer items-center gap-2 py-2 text-slate-700">
                {chipDefinido ? (
                  // un chip registrado no se puede quitar
                  <input type="checkbox" checked disabled className="h-5 w-5 accent-emerald-600" />
                ) : (
                  <input type="checkbox" {...register("tieneChip")} className="h-5 w-5 accent-emerald-600" />
                )}
                Tiene chip
              </label>
            </div>

            {tieneChip && (
              <Campo id="numeroChip" etiqueta="Número de chip" error={errors.numeroChip}>
                {chipBloqueado ? (
                  <input id="numeroChip" value={animalEditando.numeroChip} disabled className={estiloBloqueado} />
                ) : (
                  <input
                    id="numeroChip"
                    {...register("numeroChip")}
                    inputMode="numeric"
                    maxLength={15}
                    placeholder="15 dígitos"
                    className={estiloCampo}
                  />
                )}
                {animalEditando && <AvisoIntentos definido={chipDefinido} usados={animalEditando.cambioChip} campo="chip" />}
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
        )}

        {/* Listado público, lo ve cualquiera */}
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
                    <th className="px-3 py-3">Nombre</th>
                    <th className="px-3 py-3">Especie</th>
                    <th className="px-3 py-3">Sexo</th>
                    <th className="px-3 py-3">Fecha Nacimiento</th>
                    <th className="px-3 py-3">Peso (kg)</th>
                    <th className="px-3 py-3">Estado</th>
                    <th className="px-3 py-3">Ingreso</th>
                    {tieneAcciones && <th className="px-3 py-3 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {animales.map((animal) => (
                    <tr
                      key={animal.id}
                      className={`border-b border-slate-100 hover:bg-slate-50 ${editandoId === animal.id ? "bg-emerald-50" : ""}`}
                    >
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
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${COLOR_ESTADO[animal.estado] ?? ""}`} >
                          {formatearEnum(animal.estado)}
                        </span>
                      </td>
                      <td className="px-3 py-3">{new Date(animal.fechaIngreso).toLocaleDateString("es-CL")}</td>
                      {tieneAcciones && (
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          {/* Editar y encontrado requieren permiso de editar*/}
                          {puedeEditar && (animal.estado === "EXTRAVIADO" ? (
                            <button
                              type="button"
                              onClick={() => handleEncontrado(animal)}
                              className="cursor-pointer rounded-md border border-emerald-300 px-3 py-1 text-emerald-700 hover:bg-emerald-50"
                            >
                              Encontrado
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleEditar(animal)}
                              disabled={ESTADOS_BLOQUEADOS.includes(animal.estado)}
                              title={ESTADOS_BLOQUEADOS.includes(animal.estado) ? "Este animal ya no está en el refugio" : undefined}
                              className="cursor-pointer rounded-md border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Editar
                            </button>
                          ))}
                          {/* Eliminar solo admin*/}
                          {puedeEliminar && (
                            <button
                              type="button"
                              onClick={() => handleEliminar(animal)}
                              className="cursor-pointer rounded-md border border-red-200 px-3 py-1 text-red-600 hover:bg-red-50"
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                      )}
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