
import { useEffect, useState } from "react";
import { adopcionesApi } from "../services/api.js";
import { puedeEvaluarAdopciones } from "../utils.js";

import {
  ContenedorPagina,
  EncabezadoPagina,
  Tarjeta,
  estilosUI,
} from "../components/EstilosUI.jsx";

const ESTADOS = [
  "PENDIENTE",
  "EN_REVISION",
  "APROBADA",
  "RECHAZADA",
];

const formatearEnum = (valor) =>
  valor.replaceAll("_", " ").toLowerCase();

const estilosEstado = {
  PENDIENTE: "bg-amber-50 text-amber-700",
  EN_REVISION: "bg-blue-50 text-blue-700",
  APROBADA: "bg-emerald-50 text-emerald-700",
  RECHAZADA: "bg-red-50 text-red-700",
};

// Mostrar los datos de la cuenta
function DatoPerfil({ etiqueta, valor }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-sm font-medium text-slate-500">
        {etiqueta}
      </p>

      <p className="mt-2 break-words text-base font-semibold text-slate-800">
        {valor || "—"}
      </p>
    </div>
  );
}

function PerfilPage({ cuenta, onNavegar }) {
  const esEncargado = puedeEvaluarAdopciones(cuenta);

  const [conteo, setConteo] = useState(null);
  const [error, setError] = useState("");

  // Mantener la consulta original de adopciones
  useEffect(() => {
    if (!esEncargado) return;

    adopcionesApi
      .listar()
      .then((adopciones) => {
        const porEstado = Object.fromEntries(
          ESTADOS.map((estado) => [estado, 0])
        );

        for (const adopcion of adopciones) {
          if (adopcion.estado in porEstado) {
            porEstado[adopcion.estado] += 1;
          }
        }

        setConteo(porEstado);
      })
      .catch((err) => {
        setError(
          `No se pudieron cargar las solicitudes: ${err.message}`
        );
      });
  }, [esEncargado]);

  if (!cuenta) {
    return (
      <ContenedorPagina>
        <Tarjeta>
          <p className="text-slate-600">
            Debes iniciar sesión para ver tu perfil.
          </p>
        </Tarjeta>
      </ContenedorPagina>
    );
  }

  const pendientesDeEvaluar = conteo
    ? conteo.PENDIENTE + conteo.EN_REVISION
    : 0;

  return (
    <ContenedorPagina>
      {/* ENCABEZADO */}
      <EncabezadoPagina
        titulo="👤 Mi perfil"
        descripcion="Consulta los datos de tu cuenta y tus funciones dentro del refugio."
      />

      {/* MENSAJES DE ERROR */}
      {error && (
        <div role="alert" className={estilosUI.error}>
          {error}
        </div>
      )}

      {/* DATOS DEL USUARIO */}
      <Tarjeta>
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-2xl">
            👤
          </div>

          <div>
            <h2 className={estilosUI.tituloSeccion}>
              Datos de la cuenta
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Información de tu usuario registrado.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <DatoPerfil
            etiqueta="Nombre completo"
            valor={`${cuenta.nombre} ${cuenta.apellido}`}
          />

          <DatoPerfil
            etiqueta="Correo electrónico"
            valor={cuenta.correo}
          />

          <DatoPerfil
            etiqueta="Rol"
            valor={formatearEnum(cuenta.tipo)}
          />

          <DatoPerfil
            etiqueta="Horario"
            valor={cuenta.horario}
          />
        </div>
      </Tarjeta>

      {/* SOLICITUDES PARA ENCARGADOS Y ADMINISTRADORES */}
      {esEncargado && (
        <Tarjeta>
          <div className="mb-6">
            <h2 className={estilosUI.tituloSeccion}>
              🏡 Solicitudes de adopción
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Resumen de las solicitudes registradas en el refugio.
            </p>
          </div>

          {!conteo ? (
            !error && (
              <p className="text-sm text-slate-500">
                Cargando solicitudes...
              </p>
            )
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {ESTADOS.map((estado) => (
                  <div
                    key={estado}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${estilosEstado[estado]}`}
                    >
                      {formatearEnum(estado)}
                    </span>

                    <p className="mt-4 text-3xl font-bold text-slate-900">
                      {conteo[estado]}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Solicitudes
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-xl bg-blue-50 p-4">
                <p className="font-semibold text-blue-900">
                  {pendientesDeEvaluar === 0
                    ? "No hay solicitudes por evaluar."
                    : `Tienes ${pendientesDeEvaluar} solicitud(es) por evaluar.`}
                </p>
              </div>
            </>
          )}

          <div className="mt-6">
            <button
              type="button"
              onClick={() => onNavegar("adopciones")}
              className={estilosUI.botonPrincipal}
            >
              Ir a evaluar solicitudes
            </button>
          </div>
        </Tarjeta>
      )}
    </ContenedorPagina>
  );
}

export default PerfilPage;
