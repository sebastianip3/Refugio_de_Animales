
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { cuentasApi } from "../services/api.js";
import { loginFormSchema } from "../schemas/login.schema.js";
import { estilosUI } from "../components/EstilosUI.jsx";

function LoginPage({ onLogin, onVolver }) {
  const [errorServidor, setErrorServidor] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      correo: "",
      contrasena: "",
    },
  });

  async function onSubmit(datos) {
    try {
      setErrorServidor("");

      const { cuenta } = await cuentasApi.login(datos);

      onLogin(cuenta);
    } catch (error) {
      setErrorServidor(
        error.message || "No se pudo iniciar sesión"
      );
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

        {/* ENCABEZADO */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-3xl">
            🐾
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Refugio de Animales
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Inicia sesión para acceder al sistema del refugio.
          </p>
        </div>

        {/* ERROR DEL SERVIDOR */}
        {errorServidor && (
          <div
            role="alert"
            className={`${estilosUI.error} mb-5`}
          >
            {errorServidor}
          </div>
        )}

        {/* FORMULARIO */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-5"
        >

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
              autoComplete="username"
              aria-invalid={Boolean(errors.correo)}
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
              placeholder="Ingresa tu contraseña"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.contrasena)}
              className={estilosUI.campo}
              {...register("contrasena")}
            />

            {errors.contrasena && (
              <p className="mt-1 text-sm text-red-600">
                {errors.contrasena.message}
              </p>
            )}
          </div>

          {/* BOTÓN INICIAR SESIÓN */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`${estilosUI.botonPrincipal} w-full py-3`}
          >
            {isSubmitting
              ? "Ingresando..."
              : "Iniciar sesión"}
          </button>
        </form>

        {/* VOLVER */}
        <div className="mt-5 border-t border-slate-200 pt-5 text-center">
          <button
            type="button"
            onClick={onVolver}
            className="text-sm font-medium text-blue-600 transition hover:text-blue-700 hover:underline"
          >
            ← Volver al inicio
          </button>
        </div>

      </section>
    </main>
  );
}

export default LoginPage;
