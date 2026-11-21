
import { useCallback, useEffect, useState } from "react";
import { eventosApi } from "../services/api.js";

const FORM_INICIAL = {
    nombre: "",
    descripcion: "",
    fecha: "",
    lugar: "",
    comuna: "",
    cuposTotales: "",
    publicado: false,
};

export default function EventosAdopcion({ esAdministrador }) {
    const [eventos, setEventos] = useState([]);
    const [form, setForm] = useState({ ...FORM_INICIAL });
    const [mostrarForm, setMostrarForm] = useState(false);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [editandoId, setEditandoId] = useState(null);
    const [eliminandoId, setEliminandoId] = useState(null);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");

    const cargar = useCallback(async () => {
        setCargando(true);

        try {
            const datos = esAdministrador
                ? await eventosApi.listar()
                : await eventosApi.listarPublicos();

            setEventos(datos);
            setError("");
        } catch (err) {
            setError(
                err.message || "No se pudieron cargar las jornadas"
            );
        } finally {
            setCargando(false);
        }
    }, [esAdministrador]);

    useEffect(() => {
        cargar();
    }, [cargar]);

    function cambiar(e) {
        const { name, value, type, checked } = e.target;

        setForm((actual) => ({
            ...actual,
            [name]: type === "checkbox" ? checked : value,
        }));
    }


    // Convertir la fecha al formato del input datetime-local
    function fechaParaInput(valor) {
        const fecha = new Date(valor);
        const fechaLocal = new Date(
            fecha.getTime() - fecha.getTimezoneOffset() * 60000
        );

        return fechaLocal.toISOString().slice(0, 16);
    }

    // Abrir formulario para crear una jornada
    function comenzarCrear() {
        setEditandoId(null);
        setForm({ ...FORM_INICIAL });
        setError("");
        setMensaje("");
        setMostrarForm(true);
    }

    // Cargar los datos de una jornada para editarla
    function comenzarEditar(evento) {
        setEditandoId(evento.id);

        setForm({
            nombre: evento.nombre,
            descripcion: evento.descripcion,
            fecha: fechaParaInput(evento.fecha),
            lugar: evento.lugar,
            comuna: evento.comuna,
            cuposTotales:
                evento.cuposTotales == null
                    ? ""
                    : String(evento.cuposTotales),
            publicado: evento.publicado,
        });

        setError("");
        setMensaje("");
        setMostrarForm(true);
    }

    // Eliminar una jornada
    async function eliminarJornada(id) {
        const confirmar = window.confirm(
            "¿Seguro que deseas eliminar esta jornada?"
        );

        if (!confirmar) return;

        setEliminandoId(id);
        setError("");
        setMensaje("");

        try {
            await eventosApi.eliminar(id);

            setMensaje("Jornada eliminada correctamente");

            if (editandoId === id) {
                setMostrarForm(false);
                setEditandoId(null);
            }

            await cargar();
        } catch (err) {
            setError(err.message || "No se pudo eliminar la jornada");
        } finally {
            setEliminandoId(null);
        }
    }



    async function guardar(e) {
        e.preventDefault();
        setGuardando(true);
        setError("");
        setMensaje("");

        try {
            const datos = {
                nombre: form.nombre,
                descripcion: form.descripcion,
                fecha: new Date(form.fecha).toISOString(),
                lugar: form.lugar,
                comuna: form.comuna,
                cuposTotales:
                    form.cuposTotales === ""
                        ? null
                        : Number(form.cuposTotales),
                publicado: form.publicado,
            };

            const esEdicion = editandoId !== null;

            if (esEdicion) {
                // Modificar un evento que ya existe
                await eventosApi.actualizar(editandoId, datos);
            } else {
                // Crear un evento nuevo
                await eventosApi.crear({
                    ...datos,
                    tipo: "ADOPCION",
                    estado: "PROGRAMADO",
                });
            }

            setMensaje(
                esEdicion
                    ? "Jornada actualizada correctamente"
                    : "Jornada creada correctamente"
            );

            setForm({ ...FORM_INICIAL });
            setEditandoId(null);
            setMostrarForm(false);

            await cargar();
        } catch (err) {
            setError(
                err.message || "No se pudo guardar la jornada"
            );
        } finally {
            setGuardando(false);
        }
    }


    const input =
        "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2";

    return (
        <section className="mt-10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-slate-800">
                    🏡 Jornadas de adopción
                </h2>

                {esAdministrador && (
                    <button
                        type="button"
                        onClick={comenzarCrear}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                    >
                        + Crear jornada de adopción
                    </button>
                )}
            </div>

            {error && (
                <p
                    role="alert"
                    className="rounded-lg bg-red-50 p-3 text-red-700"
                >
                    {error}
                </p>
            )}

            {mensaje && (
                <p className="rounded-lg bg-green-50 p-3 text-green-800">
                    {mensaje}
                </p>
            )}

            {esAdministrador && mostrarForm && (
                <form
                    onSubmit={guardar}
                    className="grid gap-4 rounded-xl border bg-white p-5 sm:grid-cols-2"
                >
                    <h3 className="text-lg font-semibold text-slate-800 sm:col-span-2">
                        {editandoId === null
                            ? "Nueva jornada de adopción"
                            : "Editar jornada de adopción"}
                    </h3>
                    <label>
                        Nombre
                        <input
                            required
                            minLength={3}
                            maxLength={150}
                            name="nombre"
                            value={form.nombre}
                            onChange={cambiar}
                            className={input}
                        />
                    </label>

                    <label>
                        Fecha y hora
                        <input
                            required
                            type="datetime-local"
                            name="fecha"
                            value={form.fecha}
                            onChange={cambiar}
                            className={input}
                        />
                    </label>

                    <label className="sm:col-span-2">
                        Descripción
                        <textarea
                            required
                            name="descripcion"
                            rows={3}
                            value={form.descripcion}
                            onChange={cambiar}
                            className={input}
                        />
                    </label>

                    <label>
                        Lugar
                        <input
                            required
                            minLength={3}
                            name="lugar"
                            value={form.lugar}
                            onChange={cambiar}
                            className={input}
                        />
                    </label>

                    <label>
                        Comuna
                        <input
                            required
                            minLength={2}
                            name="comuna"
                            value={form.comuna}
                            onChange={cambiar}
                            className={input}
                        />
                    </label>

                    <label>
                        Cupos (opcional)
                        <input
                            type="number"
                            min="1"
                            step="1"
                            name="cuposTotales"
                            value={form.cuposTotales}
                            onChange={cambiar}
                            className={input}
                        />
                    </label>

                    <label className="flex items-center gap-2 self-center">
                        <input
                            type="checkbox"
                            name="publicado"
                            checked={form.publicado}
                            onChange={cambiar}
                        />
                        Publicar para visitantes
                    </label>

                    <div className="flex gap-3 sm:col-span-2">
                        <button
                            type="submit"
                            disabled={guardando}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
                        >
                            {guardando
                                ? "Guardando..."
                                : editandoId === null
                                    ? "Crear jornada"
                                    : "Guardar cambios"}
                        </button>

                        <button
                            type="button"
                            onClick={() => setMostrarForm(false)}
                            className="rounded-lg border px-4 py-2"
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            )}

            {cargando ? (
                <p className="text-slate-500">
                    Cargando jornadas...
                </p>
            ) : eventos.length === 0 ? (
                <p className="rounded-xl bg-white p-5 text-slate-500">
                    No hay eventos registrados.
                </p>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">

                    {eventos
                        .filter((evento) => !(mostrarForm && editandoId === evento.id))
                        .map((evento) => (

                            <article
                                key={evento.id}
                                className="rounded-xl border bg-white p-5 shadow-sm"
                            >
                                <p className="text-sm font-semibold text-emerald-700">
                                    {evento.tipo === "ADOPCION"
                                        ? "Jornada de adopción"
                                        : "Otro evento"}
                                </p>

                                <h3 className="mt-2 text-lg font-bold">
                                    {evento.nombre}
                                </h3>

                                <p className="mt-2 text-sm text-slate-600">
                                    {evento.descripcion}
                                </p>

                                <p className="mt-2 text-sm text-slate-600">
                                    📅 {new Date(evento.fecha).toLocaleString("es-CL")}
                                </p>

                                <p className="text-sm text-slate-600">
                                    📍 {evento.lugar}, {evento.comuna}
                                </p>

                                {evento.cuposTotales !== null && (
                                    <p className="text-sm text-slate-600">
                                        Cupos informativos: {evento.cuposTotales}
                                    </p>
                                )}

                                {esAdministrador && (
                                    <p className="mt-2 text-xs text-slate-500">
                                        {evento.estado} ·{" "}
                                        {evento.publicado
                                            ? "Publicado"
                                            : "No publicado"}
                                    </p>
                                )}

                                {esAdministrador && (
                                    <div className="mt-4 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => comenzarEditar(evento)}
                                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                                        >
                                            Editar
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => eliminarJornada(evento.id)}
                                            disabled={eliminandoId === evento.id}
                                            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                                        >
                                            {eliminandoId === evento.id
                                                ? "Eliminando..."
                                                : "Eliminar"}
                                        </button>
                                    </div>
                                )}

                            </article>
                        ))}
                </div>
            )}
        </section>
    );
}
