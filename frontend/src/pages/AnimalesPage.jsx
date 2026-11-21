import { useEffect, useState } from "react";
import { animalesApi, especiesApi } from "../services/api.js";
import { estilosUI } from "../components/EstilosUI.jsx";

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
  fechaNacimiento: "",
  peso: "",
  estado: "EN_EVALUACION",
  tieneChip: false,
  numeroChip: "",
  fotografiaUrl: "",
  estadoGeneral: "",
  observaciones: "",
};

const formatearEnum = (valor) => valor.replaceAll("_", " ").toLowerCase();

const hoy = new Date().toLocaleDateString("en-CA");

const formatearFecha = (fecha) => (fecha ? fecha.slice(0, 10).split("-").reverse().join("-") : "-");

const EDAD_MAXIMA = { Perro: 60, Gato: 50 };

function fechaMinimaNacimiento(nombreEspecie) {
  const edadMaxima = EDAD_MAXIMA[nombreEspecie];
  if (!edadMaxima) return undefined;

  const fecha = new Date();
  fecha.setFullYear(fecha.getFullYear() - edadMaxima);
  return fecha.toLocaleDateString("en-CA");
}

// El formulario trabaja con strings; el backend espera números y null
function aPayload(formulario) {
  const textoONull = (valor) => (valor.trim() === "" ? null : valor.trim());
  const numeroONull = (valor) => (valor === "" ? null : Number(valor));

  return {
    nombre: textoONull(formulario.nombre),
    especieId: Number(formulario.especieId),
    sexo: formulario.sexo,
    fechaNacimiento: formulario.fechaNacimiento || null,
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
    fechaNacimiento: animal.fechaNacimiento ? animal.fechaNacimiento.slice(0, 10) : "",
    peso: animal.peso ?? "",
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

// Color de la etiqueta según el estado del animal
const COLOR_ESTADO = {
  EN_EVALUACION: "bg-amber-100 text-amber-800",
  CUARENTENA: "bg-orange-100 text-orange-800",
  EN_TRATAMIENTO: "bg-red-100 text-red-700",
  EN_ADOPCION: "bg-sky-100 text-sky-800",
  ADOPTADO: "bg-emerald-100 text-emerald-800",
  OTRO: "bg-slate-100 text-slate-700",
};

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

  const especieElegida = especies.find((especie) => String(especie.id) === String(formulario.especieId));
  const minNacimiento = fechaMinimaNacimiento(especieElegida?.nombre);

  const MaxCambioSexo = 2;
  const animalEditando = animales.find((animal) => animal.id === editandoId);
  const sexoDefinido = animalEditando && animalEditando.sexo !== "DESCONOCIDO";
  const sexoBloqueado = sexoDefinido && animalEditando.cambioSexo >= MaxCambioSexo;
  const opcionesSexo = sexoDefinido ? SEXOS.filter((sexo) => sexo !== "DESCONOCIDO") : SEXOS;

  return (
    <section className={estilosUI.pagina}>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Encabezado */}
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

        {/* Formulario */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-xl font-semibold text-slate-800">
            {editandoId ? `Editar animal #${editandoId}` : "Registrar animal"}
          </h2>

          {/* 1 columna en celular, 2 en tablet, 3 en pantalla grande */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="nombre" className={estiloEtiqueta}>Nombre</label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                value={formulario.nombre}
                onChange={handleChange}
                minLength={2}
                maxLength={30}
                placeholder="Sin nombre"
                className={estiloCampo}
              />
            </div>

            <div>
              <label htmlFor="especieId" className={estiloEtiqueta}>Especie</label>
              <select
                id="especieId"
                name="especieId"
                value={formulario.especieId}
                onChange={handleChange}
                required
                disabled={Boolean(editandoId)}
                className={`${estiloCampo} disabled:bg-slate-100 disabled:text-slate-500`}
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
              <label htmlFor="sexo" className={estiloEtiqueta}>Sexo</label>
              <select
                id="sexo"
                name="sexo"
                value={formulario.sexo}
                onChange={handleChange}
                disabled={sexoBloqueado}
                className={`${estiloCampo} capitalize disabled:bg-slate-100 disabled:text-slate-500`}
              >
                {opcionesSexo.map((sexo) => (
                  <option key={sexo} value={sexo}>
                    {formatearEnum(sexo)}
                  </option>
                ))}
              </select>
              {animalEditando && (
                <p className="mt-1 text-xs text-slate-500">
                  {sexoBloqueado
                    ? "Ya se corrigió 2 veces, no se puede modificar"
                    : `Te quedan ${MaxCambioSexo - animalEditando.cambioSexo} de ${MaxCambioSexo} correcciones de sexo`}
                  {!sexoDefinido && " (definirlo por primera vez no gasta intentos)"}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="fechaNacimiento" className={estiloEtiqueta}>Fecha nacimiento (estimada)</label>
              <input
                type="date"
                id="fechaNacimiento"
                name="fechaNacimiento"
                value={formulario.fechaNacimiento}
                onChange={handleChange}
                min={minNacimiento}
                max={hoy}
                title={especieElegida ? `Un ${especieElegida.nombre.toLowerCase()} no puede superar los ${EDAD_MAXIMA[especieElegida.nombre]} años` : undefined}
                className={estiloCampo}
              />
            </div>

            <div>
              <label htmlFor="peso" className={estiloEtiqueta}>Peso (kg)</label>
              <input
                type="number"
                id="peso"
                name="peso"
                value={formulario.peso}
                onChange={handleChange}
                max={200}
                step={0.5}
                className={estiloCampo}
              />
            </div>

            <div>
              <label htmlFor="estado" className={estiloEtiqueta}>Estado</label>
              <select
                id="estado"
                name="estado"
                value={formulario.estado}
                onChange={handleChange}
                className={`${estiloCampo} capitalize`}
              >
                {ESTADOS.map((estado) => (
                  <option key={estado} value={estado}>
                    {formatearEnum(estado)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="fotografiaUrl" className={estiloEtiqueta}>URL de fotografía</label>
              <input
                type="url"
                id="fotografiaUrl"
                name="fotografiaUrl"
                value={formulario.fotografiaUrl}
                onChange={handleChange}
                maxLength={500}
                placeholder="https://..."
                className={estiloCampo}
              />
            </div>

            {/* Chip: el número solo aparece si se marca la casilla */}
            <div className="flex items-end gap-4">
              <label className="flex cursor-pointer items-center gap-2 py-2 text-slate-700">
                <input
                  type="checkbox"
                  name="tieneChip"
                  checked={formulario.tieneChip}
                  onChange={handleChange}
                  className="h-5 w-5 accent-emerald-600"
                />
                Tiene chip
              </label>
            </div>

            {formulario.tieneChip && (
              <div>
                <label htmlFor="numeroChip" className={estiloEtiqueta}>Número de chip</label>
                <input
                  type="text"
                  id="numeroChip"
                  name="numeroChip"
                  value={formulario.numeroChip}
                  onChange={handleChange}
                  inputMode="numeric"
                  pattern="\d{15}"
                  maxLength={15}
                  required
                  title="El chip debe tener 15 dígitos"
                  placeholder="15 dígitos"
                  className={estiloCampo}
                />
              </div>
            )}

            {/* Los textos largos ocupan todo el ancho */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label htmlFor="estadoGeneral" className={estiloEtiqueta}>Estado general</label>
              <textarea
                id="estadoGeneral"
                name="estadoGeneral"
                value={formulario.estadoGeneral}
                onChange={handleChange}
                maxLength={300}
                rows={2}
                className={estiloCampo}
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label htmlFor="observaciones" className={estiloEtiqueta}>Observaciones</label>
              <textarea
                id="observaciones"
                name="observaciones"
                value={formulario.observaciones}
                onChange={handleChange}
                maxLength={300}
                rows={2}
                className={estiloCampo}
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button type="submit" disabled={guardando} className={estiloBotonPrincipal}>
              {guardando ? "Guardando..." : editandoId ? "Guardar cambios" : "Registrar"}
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
                      className={`border-b border-slate-100 hover:bg-slate-50 ${editandoId === animal.id ? "bg-emerald-50" : ""
                        }`}
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
                          className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${COLOR_ESTADO[animal.estado] ?? COLOR_ESTADO.OTRO
                            }`}
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