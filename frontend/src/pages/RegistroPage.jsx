
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { registroFormSchema } from "../schemas/registro.schema.js";
import { estilosUI } from "../components/EstilosUI.jsx";

const FORMULARIO_VACIO = {
  nombre: "",
  apellido: "",
  correo: "",
  contrasena: "",
  confirmarContrasena: "",
};

function RegistroPage({ onIrALogin }) {
  const [aviso, setAviso] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registroFormSchema),
    defaultValues: FORMULARIO_VACIO,
    mode: "onChange",
  });

  function onSubmit() {
    // El registro real aún no está conectado al backend.
    // No guardamos ni imprimimos contraseñas.
    setAviso(
      "Los datos del formulario son válidos, pero el registro de cuentas todavía no está habilitado."
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

        {/* ENCABEZADO */}
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-3xl">
            🐾
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Refugio de Animales
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Registro de nuevos usuarios
          </p>
        </div>

        {/* AVISO */}
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          El registro de cuentas está en desarrollo.
          Por ahora puedes comprobar las validaciones
          del formulario, pero no se creará una cuenta.
        </div>

        {aviso && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800"
          >
            {aviso}
          </div>
        )}

        {/* FORMULARIO */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">

            {/* NOMBRE */}
            <div>
              <label
                htmlFor="nombre"
                className={estilosUI.etiqueta}
              >
                Nombre
              </label>

              <input
                id="nombre"
                type="text"
                placeholder="Tu nombre"
                autoComplete="given-name"
                className={estilosUI.campo}
                {...register("nombre")}
              />

              {errors.nombre && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.nombre.message}
                </p>
              )}
            </div>

            {/* APELLIDO */}
            <div>
              <label
                htmlFor="apellido"
                className={estilosUI.etiqueta}
              >
                Apellido
              </label>

              <input
                id="apellido"
                type="text"
                placeholder="Tu apellido"
                autoComplete="family-name"
                className={estilosUI.campo}
                {...register("apellido")}
              />

              {errors.apellido && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.apellido.message}
                </p>
              )}
            </div>
          </div>

          {/* CORREO */}
          <div>
            <label
              htmlFor="correo"
              className={estilosUI.etiqueta}
            >
              Correo electrónico
            </label>

            <input
              id="correo"
              type="email"
              placeholder="correo@ejemplo.com"
              autoComplete="email"
              className={estilosUI.campo}
              {...register("correo")}
            />

            {errors.correo && (
              <p className="mt-1 text-sm text-red-600">
                {errors.correo.message}
              </p>
            )}
          </div>

          {/* CONTRASEÑA */}
          <div>
            <label
              htmlFor="contrasena"
              className={estilosUI.etiqueta}
            >
              Contraseña
            </label>

            <input
              id="contrasena"
              type="password"
              placeholder="Ingresa una contraseña"
              autoComplete="new-password"
              className={estilosUI.campo}
              {...register("contrasena")}
            />

            {errors.contrasena && (
              <p className="mt-1 text-sm text-red-600">
                {errors.contrasena.message}
              </p>
            )}
          </div>

          {/* CONFIRMAR CONTRASEÑA */}
          <div>
            <label
              htmlFor="confirmarContrasena"
              className={estilosUI.etiqueta}
            >
              Confirmar contraseña
            </label>

            <input
              id="confirmarContrasena"
              type="password"
              placeholder="Repite tu contraseña"
              autoComplete="new-password"
              className={estilosUI.campo}
              {...register("confirmarContrasena")}
            />

            {errors.confirmarContrasena && (
              <p className="mt-1 text-sm text-red-600">
                {errors.confirmarContrasena.message}
              </p>
            )}
          </div>

          {/* BOTÓN */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`${estilosUI.botonPrincipal} w-full py-3`}
          >
            {isSubmitting
              ? "Validando..."
              : "Comprobar formulario"}
          </button>
        </form>

        {/* NAVEGACIÓN */}
        <div className="mt-6 space-y-3 border-t border-slate-200 pt-5 text-center">

          {onIrALogin && (
            <button
              type="button"
              onClick={onIrALogin}
              className="block w-full text-sm font-medium text-blue-600 hover:underline"
            >
              ¿Ya tienes cuenta? Iniciar sesión
            </button>
          )}

          <a
            href="/eventos"
            className="block rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            📅 Ver eventos del refugio
          </a>

        </div>
      </section>
    </main>
  );
}

export default RegistroPage;
