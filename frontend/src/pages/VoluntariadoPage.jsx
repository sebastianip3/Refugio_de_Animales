import { useCallback, useEffect, useState } from "react";
import { cuentasApi } from "../services/api.js";

const CAMPOS_INICIALES = {
  nombre: "",
  apellido: "",
  correo: "",
  contrasena: "",
  horario: "",
  disponibleCuidado: true,
};

const claseCampo =
  "mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-800 shadow-sm placeholder:text-slate-400 transition focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-100";

const claseTarjeta =
  "rounded-3xl bg-white/90 p-6 shadow-xl shadow-sky-900/5 ring-1 ring-slate-200 backdrop-blur sm:p-8";

function formatearFecha(fecha) {
  return new Date(fecha).toLocaleString();
}

function VoluntariadoPage({ cuenta }) {
  const puedeAdministrar = cuenta?.tipo === "ADMINISTRADOR" || import.meta.env.DEV;
  const [voluntarios, setVoluntarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [datos, setDatos] = useState(CAMPOS_INICIALES);
  const [guardando, setGuardando] = useState(false);

  const cargarVoluntarios = useCallback(async () => {
    setCargando(true);
    try {
      setVoluntarios(await cuentasApi.listarVoluntarios());
      setError("");
    } catch (err) {
      setError(`No se pudieron cargar los voluntarios: ${err.message}`);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (cuenta || import.meta.env.DEV) cargarVoluntarios();
  }, [cuenta, cargarVoluntarios]);

  if (!cuenta && !import.meta.env.DEV) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-100 px-4 py-10 sm:px-8">
        <p className="mx-auto max-w-6xl text-slate-600">Inicia sesión para consultar los voluntarios.</p>
      </main>
    );
  }

  const actualizarCampo = (event) => {
    const { name, value, checked, type } = event.target;
    setDatos((actuales) => ({
      ...actuales,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const agregarVoluntario = async (event) => {
    event.preventDefault();
    setGuardando(true);
    setError("");
    setMensaje("");
    try {
      await cuentasApi.crearVoluntario(datos);
      setDatos(CAMPOS_INICIALES);
      setMostrarFormulario(false);
      setMensaje("Voluntario agregado correctamente.");
      await cargarVoluntarios();
    } catch (err) {
      setError(`No se pudo agregar el voluntario: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  };

  const eliminarVoluntario = async (voluntario) => {
    const nombre = `${voluntario.nombre} ${voluntario.apellido}`;
    if (!window.confirm(`¿Eliminar la cuenta de ${nombre}? Esta acción no se puede deshacer.`)) {
      return;
    }

    setError("");
    setMensaje("");
    try {
      await cuentasApi.eliminarVoluntario(voluntario.id);
      setMensaje(`Se eliminó a ${nombre}.`);
      await cargarVoluntarios();
    } catch (err) {
      setError(`No se pudo eliminar a ${nombre}: ${err.message}`);
    }
  };

  return (
    <section className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-100 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-4 py-1 text-sm font-medium text-sky-700">
            🤝 El equipo que cuida del refugio
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Voluntariado
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            Consulta y administra las cuentas de las personas voluntarias del refugio.
          </p>
          {import.meta.env.DEV && (
            <p className="mx-auto mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800 ring-1 ring-amber-200">
              Modo de prueba local: no se requiere iniciar sesión
            </p>
          )}
        </header>

        {error && (
          <div role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
            ⚠️ {error}
          </div>
        )}
        {mensaje && (
          <div role="status" className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
            ✅ {mensaje}
          </div>
        )}

        {puedeAdministrar && (
          <section className={claseTarjeta}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Equipo de voluntariado</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {voluntarios.length} {voluntarios.length === 1 ? "persona registrada" : "personas registradas"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMostrarFormulario((visible) => !visible);
                  setError("");
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-5 py-3 font-semibold text-white shadow-lg shadow-sky-600/25 transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                <span aria-hidden="true">{mostrarFormulario ? "×" : "+"}</span>
                {mostrarFormulario ? "Cancelar" : "Agregar voluntario"}
              </button>
            </div>

            {mostrarFormulario && (
              <form onSubmit={agregarVoluntario} className="mt-6 border-t border-slate-100 pt-6">
                <h3 className="text-lg font-semibold text-slate-900">Datos del voluntario</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">
                    Nombre
                    <input
                      name="nombre"
                      value={datos.nombre}
                      onChange={actualizarCampo}
                      required
                      maxLength={100}
                      className={claseCampo}
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Apellido
                    <input
                      name="apellido"
                      value={datos.apellido}
                      onChange={actualizarCampo}
                      required
                      maxLength={100}
                      className={claseCampo}
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Correo electrónico
                    <input
                      name="correo"
                      type="email"
                      value={datos.correo}
                      onChange={actualizarCampo}
                      required
                      maxLength={254}
                      className={claseCampo}
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Contraseña inicial
                    <input
                      name="contrasena"
                      type="password"
                      value={datos.contrasena}
                      onChange={actualizarCampo}
                      required
                      minLength={8}
                      maxLength={72}
                      autoComplete="new-password"
                      className={claseCampo}
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Horario <span className="font-normal text-slate-400">(opcional)</span>
                    <input
                      name="horario"
                      value={datos.horario}
                      onChange={actualizarCampo}
                      maxLength={255}
                      placeholder="Ej. sábados por la mañana"
                      className={claseCampo}
                    />
                  </label>
                  <label className="flex items-center gap-3 self-end rounded-xl bg-sky-50 px-4 py-3 text-sm font-medium text-slate-700 ring-1 ring-sky-100">
                    <input
                      name="disponibleCuidado"
                      type="checkbox"
                      checked={datos.disponibleCuidado}
                      onChange={actualizarCampo}
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    Disponible para cuidado
                  </label>
                </div>
                <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">
                  <button
                    type="submit"
                    disabled={guardando}
                    className="rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-6 py-3 font-semibold text-white shadow-lg shadow-sky-600/25 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {guardando ? "Guardando..." : "Guardar voluntario"}
                  </button>
                </div>
              </form>
            )}
          </section>
        )}

        <section className={claseTarjeta}>
          <div className="flex flex-col gap-1 border-b border-slate-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Voluntarios registrados</h2>
              <p className="text-sm text-slate-500">Datos de las cuentas y disponibilidad para apoyar al refugio.</p>
            </div>
            {!cargando && (
              <span className="mt-2 inline-flex w-fit rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-800 ring-1 ring-sky-200 sm:mt-0">
                {voluntarios.length} {voluntarios.length === 1 ? "voluntario" : "voluntarios"}
              </span>
            )}
          </div>

          {cargando ? (
            <div role="status" className="py-12 text-center text-slate-500">
              <span className="text-4xl" aria-hidden="true">⏳</span>
              <p className="mt-3">Cargando voluntarios...</p>
            </div>
          ) : voluntarios.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-4xl" aria-hidden="true">🤝</p>
              <p className="mt-3 font-semibold text-slate-800">Aún no hay voluntarios registrados</p>
              <p className="mt-1 text-sm text-slate-500">Agrega la primera persona al equipo del refugio.</p>
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    {[
                      "ID",
                      "Nombre",
                      "Apellido",
                      "Correo electrónico",
                      "Tipo de cuenta",
                      "Horario",
                      "Disponible para cuidado",
                      "Creado",
                      "Última actualización",
                      ...(puedeAdministrar ? ["Acciones"] : []),
                    ].map((titulo) => (
                      <th key={titulo} scope="col" className="whitespace-nowrap px-4 py-3 font-semibold">
                        {titulo}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {voluntarios.map((voluntario) => (
                    <tr key={voluntario.id} className="transition hover:bg-sky-50/60">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-400">#{voluntario.id}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">{voluntario.nombre}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{voluntario.apellido}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{voluntario.correo}</td>
                      <td className="whitespace-nowrap px-4 py-3 capitalize text-slate-600">
                        {voluntario.tipo.toLowerCase()}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{voluntario.horario || "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                            voluntario.disponibleCuidado
                              ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
                              : "bg-slate-100 text-slate-600 ring-slate-200"
                          }`}
                        >
                          {voluntario.disponibleCuidado ? "Disponible" : "No disponible"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatearFecha(voluntario.createdAt)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatearFecha(voluntario.updatedAt)}</td>
                      {puedeAdministrar && (
                        <td className="whitespace-nowrap px-4 py-3">
                          <button
                            type="button"
                            onClick={() => eliminarVoluntario(voluntario)}
                            className="rounded-lg px-3 py-1.5 font-medium text-rose-700 transition hover:bg-rose-50 hover:text-rose-800 focus:outline-none focus:ring-2 focus:ring-rose-300"
                          >
                            Eliminar
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-4 text-xs text-slate-400">Las contraseñas no se exponen; solo se almacena su hash.</p>
        </section>
      </div>
    </section>
  );
}

export default VoluntariadoPage;
