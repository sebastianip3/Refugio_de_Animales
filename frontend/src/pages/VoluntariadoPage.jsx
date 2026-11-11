import { useCallback, useEffect, useMemo, useState } from "react";
import { cuentasApi } from "../services/api.js";

const CAMPOS_INICIALES = {
  nombre: "",
  apellido: "",
  correo: "",
  contrasena: "",
  horario: "",
  disponibleCuidado: true,
};

const DIAS_POR_DEFECTO = [
  { id: 0, nombre: "Lunes", abreviatura: "Lun" },
  { id: 1, nombre: "Martes", abreviatura: "Mar" },
  { id: 2, nombre: "Miércoles", abreviatura: "Mié" },
  { id: 3, nombre: "Jueves", abreviatura: "Jue" },
  { id: 4, nombre: "Viernes", abreviatura: "Vie" },
  { id: 5, nombre: "Sábado", abreviatura: "Sáb" },
  { id: 6, nombre: "Domingo", abreviatura: "Dom" },
];

const HORAS_POR_DEFECTO = Array.from({ length: 12 }, (_, idx) => idx + 8);

const PALETA_VOLUNTARIOS = [
  { bg: "bg-sky-100", text: "text-sky-900", ring: "ring-sky-300", badge: "bg-sky-600" },
  { bg: "bg-emerald-100", text: "text-emerald-900", ring: "ring-emerald-300", badge: "bg-emerald-600" },
  { bg: "bg-violet-100", text: "text-violet-900", ring: "ring-violet-300", badge: "bg-violet-600" },
  { bg: "bg-amber-100", text: "text-amber-900", ring: "ring-amber-300", badge: "bg-amber-600" },
  { bg: "bg-rose-100", text: "text-rose-900", ring: "ring-rose-300", badge: "bg-rose-600" },
  { bg: "bg-teal-100", text: "text-teal-900", ring: "ring-teal-300", badge: "bg-teal-600" },
  { bg: "bg-indigo-100", text: "text-indigo-900", ring: "ring-indigo-300", badge: "bg-indigo-600" },
  { bg: "bg-fuchsia-100", text: "text-fuchsia-900", ring: "ring-fuchsia-300", badge: "bg-fuchsia-600" },
];

const claseCampo =
  "mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-800 shadow-sm placeholder:text-slate-400 transition focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-100";

const claseTarjeta =
  "rounded-3xl bg-white/90 p-6 shadow-xl shadow-sky-900/5 ring-1 ring-slate-200 backdrop-blur sm:p-8";

function formatearFecha(fecha) {
  return new Date(fecha).toLocaleString();
}

function formatearRangoHora(hora) {
  const inicio = `${String(hora).padStart(2, "0")}:00`;
  const fin = `${String(hora + 1).padStart(2, "0")}:00`;
  return `${inicio} - ${fin}`;
}

function claveBloque(diaSemana, hora) {
  return `${diaSemana}-${hora}`;
}

function obtenerColorVoluntario(cuentaId) {
  if (!cuentaId) return PALETA_VOLUNTARIOS[0];
  return PALETA_VOLUNTARIOS[Math.abs(Number(cuentaId)) % PALETA_VOLUNTARIOS.length];
}

function VoluntariadoPage({ cuenta }) {
  const puedeAdministrar = cuenta?.tipo === "ADMINISTRADOR" || import.meta.env.DEV;
  const esVoluntarioAutenticado = cuenta?.tipo === "VOLUNTARIO";

  const [voluntarios, setVoluntarios] = useState([]);
  const [dias, setDias] = useState(DIAS_POR_DEFECTO);
  const [horas, setHoras] = useState(HORAS_POR_DEFECTO);
  const [disponibilidades, setDisponibilidades] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [resumenCalendario, setResumenCalendario] = useState(null);

  const [voluntarioActivoId, setVoluntarioActivoId] = useState("");
  const [bloquesSeleccionados, setBloquesSeleccionados] = useState(() => new Set());
  const [cambiosPendientes, setCambiosPendientes] = useState(false);
  const [guardandoDisponibilidad, setGuardandoDisponibilidad] = useState(false);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [datos, setDatos] = useState(CAMPOS_INICIALES);
  const [guardando, setGuardando] = useState(false);

  const aplicarDatosCalendario = useCallback(
    (calendario, idPreferido = null) => {
      const listaVoluntarios = calendario.voluntarios || [];
      setVoluntarios(listaVoluntarios);
      if (calendario.dias?.length) setDias(calendario.dias);
      if (calendario.horas?.length) setHoras(calendario.horas);
      setDisponibilidades(calendario.disponibilidades || []);
      setTurnos(calendario.turnos || []);
      setResumenCalendario(calendario.resumen || null);

      const idObjetivo =
        idPreferido ||
        (esVoluntarioAutenticado ? String(cuenta.id) : null) ||
        voluntarioActivoId ||
        (listaVoluntarios[0] ? String(listaVoluntarios[0].id) : "");

      const existeEnLista = listaVoluntarios.some((v) => String(v.id) === String(idObjetivo));
      const idFinal = existeEnLista
        ? String(idObjetivo)
        : listaVoluntarios[0]
          ? String(listaVoluntarios[0].id)
          : "";

      setVoluntarioActivoId(idFinal);

      if (idFinal) {
        const bloquesDelVoluntario = new Set(
          (calendario.disponibilidades || [])
            .filter((d) => String(d.cuentaId) === String(idFinal))
            .map((d) => claveBloque(d.diaSemana, d.hora)),
        );
        setBloquesSeleccionados(bloquesDelVoluntario);
      } else {
        setBloquesSeleccionados(new Set());
      }
      setCambiosPendientes(false);
    },
    [cuenta, esVoluntarioAutenticado, voluntarioActivoId],
  );

  const cargarTodo = useCallback(
    async (idPreferido = null) => {
      setCargando(true);
      try {
        const calendario = await cuentasApi.obtenerCalendarioVoluntariado();
        aplicarDatosCalendario(calendario, idPreferido);
        setError("");
      } catch (err) {
        setError(`No se pudieron cargar los datos de voluntariado: ${err.message}`);
      } finally {
        setCargando(false);
      }
    },
    [aplicarDatosCalendario],
  );

  useEffect(() => {
    if (cuenta || import.meta.env.DEV) {
      cargarTodo();
    }
  }, [cuenta, cargarTodo]);

  const cambiarVoluntarioActivo = (nuevoId) => {
    setVoluntarioActivoId(nuevoId);
    const bloquesDelVoluntario = new Set(
      disponibilidades
        .filter((d) => String(d.cuentaId) === String(nuevoId))
        .map((d) => claveBloque(d.diaSemana, d.hora)),
    );
    setBloquesSeleccionados(bloquesDelVoluntario);
    setCambiosPendientes(false);
    setMensaje("");
    setError("");
  };

  const alternarBloqueHorario = (diaSemana, hora) => {
    if (!voluntarioActivoId) return;
    const clave = claveBloque(diaSemana, hora);
    setBloquesSeleccionados((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(clave)) {
        siguiente.delete(clave);
      } else {
        siguiente.add(clave);
      }
      return siguiente;
    });
    setCambiosPendientes(true);
  };

  const seleccionarRangoDia = (diaSemana, horaInicio, horaFin) => {
    if (!voluntarioActivoId) return;
    setBloquesSeleccionados((prev) => {
      const siguiente = new Set(prev);
      const todosMarcados = horas
        .filter((h) => h >= horaInicio && h <= horaFin)
        .every((h) => siguiente.has(claveBloque(diaSemana, h)));

      for (const h of horas) {
        if (h >= horaInicio && h <= horaFin) {
          const clave = claveBloque(diaSemana, h);
          if (todosMarcados) {
            siguiente.delete(clave);
          } else {
            siguiente.add(clave);
          }
        }
      }
      return siguiente;
    });
    setCambiosPendientes(true);
  };

  const seleccionarFranjaSemanal = (horaInicio, horaFin) => {
    if (!voluntarioActivoId) return;
    setBloquesSeleccionados((prev) => {
      const siguiente = new Set(prev);
      for (const dia of dias) {
        for (const h of horas) {
          if (h >= horaInicio && h <= horaFin) {
            siguiente.add(claveBloque(dia.id, h));
          }
        }
      }
      return siguiente;
    });
    setCambiosPendientes(true);
  };

  const limpiarSeleccionVoluntario = () => {
    if (!voluntarioActivoId) return;
    setBloquesSeleccionados(new Set());
    setCambiosPendientes(true);
  };

  const guardarDisponibilidadYAsignar = async () => {
    if (!voluntarioActivoId) return;
    setGuardandoDisponibilidad(true);
    setError("");
    setMensaje("");

    try {
      const bloques = Array.from(bloquesSeleccionados).map((clave) => {
        const [diaSemana, hora] = clave.split("-").map(Number);
        return { diaSemana, hora };
      });

      const calendarioActualizado = await cuentasApi.guardarDisponibilidadVoluntario(
        Number(voluntarioActivoId),
        bloques,
      );

      aplicarDatosCalendario(calendarioActualizado, voluntarioActivoId);
      const voluntario = (calendarioActualizado.voluntarios || []).find(
        (v) => String(v.id) === String(voluntarioActivoId),
      );
      const nombreVol = voluntario ? `${voluntario.nombre} ${voluntario.apellido}` : "el voluntario";
      setMensaje(
        `Disponibilidad de ${nombreVol} guardada. El sistema reasignó automáticamente los turnos evitando tiempos muertos y actualizó el calendario para todos.`,
      );
    } catch (err) {
      setError(`No se pudo guardar la disponibilidad: ${err.message}`);
    } finally {
      setGuardandoDisponibilidad(false);
    }
  };

  const mapaTurnos = useMemo(() => {
    const mapa = new Map();
    for (const turno of turnos) {
      mapa.set(claveBloque(turno.diaSemana, turno.hora), turno);
    }
    return mapa;
  }, [turnos]);

  const mapaDisponibilidades = useMemo(() => {
    const mapa = new Map();
    for (const disp of disponibilidades) {
      const clave = claveBloque(disp.diaSemana, disp.hora);
      if (!mapa.has(clave)) mapa.set(clave, []);
      mapa.get(clave).push(disp);
    }
    return mapa;
  }, [disponibilidades]);

  const resumenPorVoluntario = useMemo(() => {
    return voluntarios.map((vol) => {
      const dispCount = disponibilidades.filter((d) => d.cuentaId === vol.id).length;
      const turnosVol = turnos.filter((t) => t.cuentaId === vol.id);
      return {
        ...vol,
        bloquesDisponibles: dispCount,
        bloquesAsignados: turnosVol.length,
        color: obtenerColorVoluntario(vol.id),
      };
    });
  }, [voluntarios, disponibilidades, turnos]);

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
      const creado = await cuentasApi.crearVoluntario(datos);
      setDatos(CAMPOS_INICIALES);
      setMostrarFormulario(false);
      setMensaje("Voluntario agregado correctamente.");
      await cargarTodo(creado?.id ? String(creado.id) : null);
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
      setMensaje(`Se eliminó a ${nombre} y se actualizaron las asignaciones del calendario.`);
      await cargarTodo();
    } catch (err) {
      setError(`No se pudo eliminar a ${nombre}: ${err.message}`);
    }
  };

  const voluntarioSeleccionadoObj = voluntarios.find(
    (v) => String(v.id) === String(voluntarioActivoId),
  );

  return (
    <section className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-100 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-4 py-1 text-sm font-medium text-sky-700">
            🤝 El equipo que cuida del refugio
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Voluntariado y Calendario de Turnos
          </h1>
          <p className="mx-auto mt-3 max-w-3xl text-slate-600">
            Ingresa tu disponibilidad horaria en el calendario semanal. El sistema asigna automáticamente
            los turnos procurando coincidir con la disponibilidad de cada voluntario y evitando tiempos muertos.
          </p>
          {import.meta.env.DEV && (
            <p className="mx-auto mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800 ring-1 ring-amber-200">
              Modo de prueba local: puedes seleccionar cualquier voluntario para simular su ingreso de horarios
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

        {/* SECCIÓN CALENDARIO DE DISPONIBILIDAD Y ASIGNACIÓN AUTOMÁTICA */}
        <section className={claseTarjeta}>
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
                📅 Asignación inteligente sin tiempos muertos
              </span>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">
                Calendario Semanal de Disponibilidad y Turnos
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Haz clic en los bloques en los que puedes trabajar y presiona{" "}
                <strong className="text-slate-700">Guardar disponibilidad</strong>. El calendario compartido se actualizará al instante para todos.
              </p>
            </div>

            {resumenCalendario && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-sky-50/80 px-4 py-3 ring-1 ring-sky-100">
                  <p className="text-xs font-medium text-sky-700">Horas cubiertas</p>
                  <p className="mt-0.5 text-2xl font-extrabold text-sky-900">
                    {resumenCalendario.bloquesAsignados}{" "}
                    <span className="text-xs font-normal text-sky-700">
                      / {resumenCalendario.bloquesConDisponibilidad} disp.
                    </span>
                  </p>
                </div>
                <div className="rounded-2xl bg-emerald-50/80 px-4 py-3 ring-1 ring-emerald-100">
                  <p className="text-xs font-medium text-emerald-700">Cobertura efectiva</p>
                  <p className="mt-0.5 text-2xl font-extrabold text-emerald-900">
                    {resumenCalendario.bloquesConDisponibilidad > 0
                      ? `${Math.round(
                          (resumenCalendario.bloquesAsignados /
                            resumenCalendario.bloquesConDisponibilidad) *
                            100,
                        )}%`
                      : "100%"}
                  </p>
                </div>
                <div className="col-span-2 rounded-2xl bg-indigo-50/80 px-4 py-3 ring-1 ring-indigo-100 sm:col-span-1">
                  <p className="text-xs font-medium text-indigo-700">Bloques continuos</p>
                  <p className="mt-0.5 text-2xl font-extrabold text-indigo-900">
                    {resumenCalendario.conexionesContinuas}{" "}
                    <span className="text-xs font-normal text-indigo-700">sin cortes</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {voluntarios.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-3xl" aria-hidden="true">📅</p>
              <p className="mt-2 font-semibold text-slate-800">
                Registra al menos un voluntario para comenzar a ingresar disponibilidad en el calendario.
              </p>
            </div>
          ) : (
            <>
              {/* Barra de control del voluntario activo y atajos */}
              <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/80 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <label className="text-sm font-semibold text-slate-700">
                    {esVoluntarioAutenticado ? "Voluntario en sesión:" : "Ingresar disponibilidad como:"}
                    <select
                      value={voluntarioActivoId}
                      onChange={(e) => cambiarVoluntarioActivo(e.target.value)}
                      disabled={esVoluntarioAutenticado}
                      className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-100 sm:mt-0 sm:ml-2 sm:inline-block sm:w-auto"
                    >
                      {voluntarios.map((vol) => (
                        <option key={vol.id} value={vol.id}>
                          {vol.nombre} {vol.apellido} {!vol.disponibleCuidado ? "(No disponible)" : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  {voluntarioSeleccionadoObj && !voluntarioSeleccionadoObj.disponibleCuidado && (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
                      ⚠️ Este voluntario tiene su disponibilidad de cuidado desactivada
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">Atajos rápidos:</span>
                  <button
                    type="button"
                    onClick={() => seleccionarFranjaSemanal(8, 13)}
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-sky-50 hover:text-sky-700"
                  >
                    + Mañanas (08-14h)
                  </button>
                  <button
                    type="button"
                    onClick={() => seleccionarFranjaSemanal(14, 19)}
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-sky-50 hover:text-sky-700"
                  >
                    + Tardes (14-20h)
                  </button>
                  <button
                    type="button"
                    onClick={limpiarSeleccionVoluntario}
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-sm ring-1 ring-rose-200 transition hover:bg-rose-50"
                  >
                    Limpiar mi selección
                  </button>
                  <button
                    type="button"
                    onClick={() => guardarDisponibilidadYAsignar()}
                    disabled={guardandoDisponibilidad || !voluntarioActivoId}
                    className="ml-auto inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-600/20 transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {guardandoDisponibilidad
                      ? "Asignando horarios..."
                      : cambiosPendientes
                        ? "💾 Guardar disponibilidad y actualizar calendario"
                        : "🔄 Guardar y recalcular turnos"}
                  </button>
                </div>
              </div>

              {/* Leyenda visual */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-3.5 w-3.5 rounded border-2 border-sky-600 bg-sky-500/20" />
                    Mi disponibilidad marcada ({bloquesSeleccionados.size} h)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-3.5 w-3.5 rounded bg-emerald-600" />
                    Turno asignado a mí
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-3.5 w-3.5 rounded bg-indigo-100 ring-1 ring-indigo-300" />
                    Turno asignado a otro voluntario
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-3.5 w-3.5 rounded border border-dashed border-slate-300 bg-slate-50" />
                    Sin cobertura (haz clic para ofrecer disponibilidad)
                  </span>
                </div>
                {cambiosPendientes && (
                  <span className="font-semibold text-amber-700">
                    ● Tienes cambios de disponibilidad sin guardar
                  </span>
                )}
              </div>

              {/* Grilla del calendario semanal */}
              <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 shadow-inner">
                <table className="min-w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="sticky left-0 z-10 bg-slate-800 px-3 py-3 text-xs font-semibold uppercase tracking-wider">
                        Horario
                      </th>
                      {dias.map((dia) => (
                        <th key={dia.id} className="min-w-[130px] px-3 py-2.5 text-center font-semibold">
                          <div className="text-sm">{dia.nombre}</div>
                          <div className="mt-1 flex justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => seleccionarRangoDia(dia.id, 8, 13)}
                              title={`Marcar/desmarcar mañana del ${dia.nombre}`}
                              className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-normal text-slate-200 hover:bg-sky-600 hover:text-white"
                            >
                              AM
                            </button>
                            <button
                              type="button"
                              onClick={() => seleccionarRangoDia(dia.id, 14, 19)}
                              title={`Marcar/desmarcar tarde del ${dia.nombre}`}
                              className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-normal text-slate-200 hover:bg-sky-600 hover:text-white"
                            >
                              PM
                            </button>
                            <button
                              type="button"
                              onClick={() => seleccionarRangoDia(dia.id, 8, 19)}
                              title={`Marcar/desmarcar día completo (${dia.nombre})`}
                              className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-normal text-slate-200 hover:bg-sky-600 hover:text-white"
                            >
                              Todo
                            </button>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {horas.map((hora) => (
                      <tr key={hora} className="hover:bg-slate-50/60">
                        <td className="sticky left-0 z-10 whitespace-nowrap border-r border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-xs font-semibold text-slate-700">
                          {formatearRangoHora(hora)}
                        </td>
                        {dias.map((dia) => {
                          const clave = claveBloque(dia.id, hora);
                          const disponibleMarcado = bloquesSeleccionados.has(clave);
                          const turnoAsignado = mapaTurnos.get(clave);
                          const disponiblesEnBloque = mapaDisponibilidades.get(clave) || [];
                          const esMiTurno =
                            turnoAsignado &&
                            String(turnoAsignado.cuentaId) === String(voluntarioActivoId);
                          const colorAsignado = obtenerColorVoluntario(turnoAsignado?.cuentaId);

                          // Verificar si este turno continúa desde la hora anterior con la misma persona
                          const turnoHoraAnterior = mapaTurnos.get(claveBloque(dia.id, hora - 1));
                          const esContinuo =
                            turnoAsignado &&
                            turnoHoraAnterior &&
                            turnoHoraAnterior.cuentaId === turnoAsignado.cuentaId;

                          return (
                            <td
                              key={clave}
                              onClick={() => alternarBloqueHorario(dia.id, hora)}
                              className={`cursor-pointer border-r border-slate-100 p-1.5 align-top transition select-none ${
                                disponibleMarcado
                                  ? "bg-sky-50/90 ring-2 ring-inset ring-sky-500"
                                  : turnoAsignado
                                    ? "bg-white hover:bg-slate-50"
                                    : "bg-slate-50/40 hover:bg-sky-50/40"
                              }`}
                            >
                              <div className="flex min-h-[54px] flex-col justify-between gap-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                      disponibleMarcado
                                        ? "bg-sky-600 text-white"
                                        : "bg-slate-100 text-slate-500"
                                    }`}
                                  >
                                    {disponibleMarcado ? "✓ Disponible" : "+ Marcar"}
                                  </span>

                                  {disponiblesEnBloque.length > 0 && (
                                    <span
                                      title={`Voluntarios disponibles: ${disponiblesEnBloque
                                        .map((d) => `${d.cuenta.nombre} ${d.cuenta.apellido}`)
                                        .join(", ")}`}
                                      className="rounded-full bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-700"
                                    >
                                      👥 {disponiblesEnBloque.length}
                                    </span>
                                  )}
                                </div>

                                {turnoAsignado ? (
                                  <div
                                    className={`rounded-lg px-2 py-1 text-[11px] font-semibold ring-1 ${
                                      esMiTurno
                                        ? "bg-emerald-600 text-white ring-emerald-700"
                                        : `${colorAsignado.bg} ${colorAsignado.text} ${colorAsignado.ring}`
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-1 truncate">
                                      <span className="truncate">
                                        {turnoAsignado.cuenta.nombre} {turnoAsignado.cuenta.apellido}
                                      </span>
                                      {esContinuo && (
                                        <span title="Turno continuo sin tiempo muerto" className="text-[10px]">
                                          ⇅
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="rounded-lg border border-dashed border-slate-200 px-2 py-1 text-center text-[10px] text-slate-400">
                                    Sin asignar
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Resumen de carga horaria y turnos por voluntario */}
              <div className="mt-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                  Resumen de asignación semanal por voluntario
                </h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {resumenPorVoluntario.map((vol) => {
                    const activo = String(vol.id) === String(voluntarioActivoId);
                    return (
                      <button
                        key={vol.id}
                        type="button"
                        onClick={() => !esVoluntarioAutenticado && cambiarVoluntarioActivo(String(vol.id))}
                        className={`flex flex-col justify-between rounded-2xl p-4 text-left transition ring-1 ${
                          activo
                            ? "bg-sky-50/90 ring-2 ring-sky-500 shadow-sm"
                            : "bg-white hover:bg-slate-50 ring-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`h-3 w-3 rounded-full ${vol.color.badge}`} />
                            <span className="font-bold text-slate-900">
                              {vol.nombre} {vol.apellido}
                            </span>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                            {vol.bloquesAsignados} h asignadas
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-slate-600">
                          {vol.horario || "Sin horario asignado aún"}
                        </p>
                        <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                          <span>Disponibilidad declarada: {vol.bloquesDisponibles} h</span>
                          {!esVoluntarioAutenticado && (
                            <span className="font-semibold text-sky-700">
                              {activo ? "Editando ahora" : "Editar horario →"}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </section>

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
                    Horario <span className="font-normal text-slate-400">(opcional, se actualiza con el calendario)</span>
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
              <p className="text-sm text-slate-500">Datos de las cuentas y horarios asignados en el calendario del refugio.</p>
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
              <p className="mt-3">Cargando voluntarios y calendario...</p>
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
                      "Horario asignado / disponible",
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
                      <td className="max-w-xs truncate px-4 py-3 text-slate-600" title={voluntario.horario || ""}>
                        {voluntario.horario || "—"}
                      </td>
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
