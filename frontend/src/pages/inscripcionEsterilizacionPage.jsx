import { useEffect, useState} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { esterilizacionApi, especiesApi } from "../services/api.js";
import { inscripcionFormSchema } from "../schemas/esterilizacion.schema.js";
import { COMUNAS } from "../schemas/adopcion.schema.js";

const estiloInput = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none";
const estiloBoton = "cursor-pointer rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300";

const formatearFecha = (fecha) =>
    new Date(fecha).toLocaleString("es-CL", {dateStyle: "full", timeStyle: "short"});

function Campo({id, etiqueta, error, children}) {
    return(
        <div>
            <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
                {etiqueta}
            </label>
            {children}
            {error && <p className="mt-1 text-sm text-red-600">{error.message}</p>}    
        </div>
    );
}

function FormularioInscripcion({jornada, especies, onVolver, onInscrito}) {
    const [errorServidor, setErrorServidor] = useState("");

    const{
        register,
        handleSubmit,
        formState: {errors, isSubmitting},
    } = useForm({ resolver: zodResolver(inscripcionFormSchema), mode: "onTouched"});

    const onSubmit =  async (datos) => {
        setErrorServidor("");
        try{
            const respuesta = await esterilizacionApi.crearInscripcion(jornada.id, datos);
            onInscrito(respuesta);
        }catch (err){
            setErrorServidor(err.message);
        }
    };

    return (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <button type="button" onClick={onVolver} className="cursor-pointer text-sm text-blue-600 hover:underline">
            Volver a Eventos
          </button>  
            
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>      
          <h2 className="mt-3 text-2xl font-semibold text-slate-800">{jornada.nombre}</h2>
          <p className="mt-1 text-slate-600">
           📅 {formatearFecha(jornada.fecha)} · 📍 {jornada.lugar}, {jornada.comuna}
          </p>
          </div>

          <img src="/refugioAnimales.jpg" alt="Refugio de Animales" className="w-24 shrink-0 rounded-lg object-contain" />
        </div>

          {errorServidor && (
            <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-red-700">
            {errorServidor}
            </p>
            )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 flex flex-col gap-6">
            <fieldset className="grid gap-4 sm:grid-cols-2">
                <legend className="mb-2 text-lg font-semibold text-slate-800">Datos de la mascota</legend>

                <Campo id="especieId" etiqueta="Especie" error={errors.especieId}>
                    <select id="especieId" {...register("especieId")} className={estiloInput}>
                        <option value="">Seleccione...</option>
                        {especies.map((especie) => (
                            <option key={especie.id} value={especie.id}>
                         {especie.nombre}
                        </option>
                      ))}
                    </select>
                </Campo>

                <Campo id="sexo" etiqueta="Sexo" error={errors.sexo}>
                    <select id="sexo" {...register("sexo")} className={estiloInput}>
                        <option value="">Seleccione...</option>
                        <option value="MACHO">Macho</option>
                        <option value="HEMBRA">Hembra</option>
                    </select>
                </Campo>

                <Campo id="tamano" etiqueta="Tamaño" error={errors.tamano}>
                    <select id="tamano" {...register("tamano")} className={estiloInput}>
                        <option value="">Selecione...</option>
                        <option value="PEQUENO">Pequeño</option>
                        <option value="MEDIANO">Mediano</option>
                        <option value="GRANDE">Grande</option>
                    </select>
                </Campo>

                <Campo id="pesoEstimado" etiqueta="Peso Estimado (kg)" error={errors.pesoEstimado}>
                    <input id="pesoEstimado" type="number" step="0.5" min="0.5" max="150"  
                     onKeyDown={(e) => ["-", "+", "e", "E"].includes(e.key) && e.preventDefault()} {...register("pesoEstimado")} className={estiloInput} />
                </Campo>
            </fieldset>

            <fieldset className="grid gap-4 sm:grid-cols-2">
                <legend className="mb-2 text-lg font-semibold text-slate-800">Datos del tutor</legend>

                <Campo id="tutorNombre" etiqueta="Nombre" error={errors.tutorNombre}>
                    <input id="tutorNombre" {...register("tutorNombre")} className={estiloInput} />
                </Campo>

                <Campo id="tutorApellido" etiqueta="Apellido" error={errors.tutorApellido}>
                    <input id="tutorApellido" {...register("tutorApellido")} className={estiloInput} />
                </Campo>

                <Campo id="tutorRut" etiqueta="RUT" error={errors.tutorRut}>
                    <input id="tutorRut" placeholder="12.345.678-9" {...register("tutorRut")} className={estiloInput}/>
                </Campo>

                <Campo id="tutorEmail" etiqueta="Correo electronico" error={errors.tutorEmail}>
                    <input id="tutorEmail" type="email" {...register("tutorEmail")} className={estiloInput} />
                </Campo>

                <Campo id="tutorComuna" etiqueta="Comuna" error={errors.tutorComuna}>
                    <select id="tutorComuna" {...register("tutorComuna")} className={estiloInput} >
                        <option value="">Seleccione su comuna</option>
                        {Object.values(COMUNAS).map((nombre) => (
                            <option key={nombre} value={nombre}>{nombre}</option>
                        ))}
                    </select>
                </Campo>

                <Campo id="tutorSector" etiqueta="Sector" error={errors.tutorSector}>
                    <input id="tutorSector" {...register("tutorSector")} className={estiloInput} />
                </Campo>
            </fieldset>

            <button type="submit" disabled={isSubmitting} className={estiloBoton}>
                {isSubmitting ? "Enviando..." : "Confirmar inscripción"}
            </button>
        </form>
        </section>
    );
}

function InscripcionEsterilizacionPage() {
    // El botón de Eventos identifica la jornada en la URL.
    const jornadaId = new URLSearchParams(window.location.search).get("jornada");

    const [especies, setEspecies] = useState([]);
    const [cargando, setCargando] = useState(Boolean(jornadaId));
    const [errorServidor, setErrorServidor] = useState("");
    const [jornadaElegida, setJornadaElegida] = useState(null);
    const [resultado, setResultado] = useState(null);

    useEffect(() => {
        if (!jornadaId) return;

        let activo = true;
        Promise.all([
            esterilizacionApi.listarJornadasDisponibles(),
            especiesApi.listar(),
        ])
            .then(([jornadasDisponibles, listaEspecies]) => {
                if (!activo) return;

                const jornada = jornadasDisponibles.find(
                    (item) => String(item.id) === jornadaId
                );

                if (!jornada || !jornada.activa || Number(jornada.cuposDisponibles) <= 0) {
                    setErrorServidor(
                        "La jornada seleccionada no tiene inscripciones abiertas o ya no dispone de cupos."
                    );
                    return;
                }

                // Se abre el formulario directamente, sin listado previo.
                setJornadaElegida(jornada);
                setEspecies(listaEspecies);
                setErrorServidor("");
            })
            .catch((err) => {
                if (activo) {
                    setErrorServidor(`No se pudo cargar el formulario: ${err.message}`);
                }
            })
            .finally(() => {
                if (activo) setCargando(false);
            });

        return () => {
            activo = false;
        };
    }, [jornadaId]);

    const volverAEventos = () => {
        window.location.assign("/eventos");
    };

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-10">
            <div className="mx-auto max-w-2xl">
                <h1 className="text-3xl font-bold text-slate-800">
                    Inscripción a jornada de esterilización
                </h1>
                <p className="mt-2 text-slate-600">
                    Completa los datos de la mascota y del tutor.
                </p>

                <div className="mt-6">
                    {resultado ? (
                        <section className="rounded-xl border border-green-200 bg-green-50 p-6">
                            <h2 className="text-2xl font-semibold text-green-800">
                                ¡Inscripción confirmada!
                            </h2>
                            <p className="mt-2 text-green-900">{resultado.message}</p>
                            <p className="mt-4 text-green-900">
                                Tu folio es{" "}
                                <strong className="font-mono text-lg">
                                    {resultado.inscripcion.codigoComprobante}
                                </strong>
                            </p>
                            <button
                                type="button"
                                onClick={volverAEventos}
                                className={`mt-6 ${estiloBoton}`}
                            >
                                Volver a Eventos
                            </button>
                        </section>
                    ) : cargando ? (
                        <p className="text-slate-600">Cargando formulario de inscripción...</p>
                    ) : jornadaElegida ? (
                        <FormularioInscripcion
                            jornada={jornadaElegida}
                            especies={especies}
                            onVolver={volverAEventos}
                            onInscrito={setResultado}
                        />
                    ) : (
                        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                            <p role="alert" className="text-slate-700">
                                {errorServidor || "Selecciona una jornada desde Eventos para inscribirte."}
                            </p>
                            <a
                                href="/eventos"
                                className="mt-5 inline-block rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                            >
                                Ver eventos del refugio
                            </a>
                        </section>
                    )}
                </div>
            </div>
        </main>
    );
}

export default InscripcionEsterilizacionPage;
