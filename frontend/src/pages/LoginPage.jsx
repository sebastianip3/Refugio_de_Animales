import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cuentasApi } from "../services/api.js";
import { loginFormSchema } from "../schemas/login.schema.js";

const estiloCampo = {
  width: "100%",
  padding: "10px",
  marginTop: "5px",
  border: "1px solid #ccc",
  borderRadius: "6px",
  boxSizing: "border-box",
};

const estiloError = {
  color: "crimson",
  fontSize: "0.85rem",
  marginTop: "4px",
};

// Inicio de sesión del personal del refugio (por ejemplo, el encargado de adopciones)
function LoginPage({ onLogin, onVolver }) {
  const [errorServidor, setErrorServidor] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { correo: "", contrasena: "" },
  });

  const onSubmit = async (datos) => {
    try {
      setErrorServidor("");
      // El backend deja la sesión en una cookie; aquí solo llegan los datos de la cuenta
      const { cuenta } = await cuentasApi.login(datos);
      onLogin(cuenta);
    } catch (err) {
      setErrorServidor(err.message);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f4f6f8",
        padding: "24px",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "420px",
          backgroundColor: "white",
          padding: "32px",
          borderRadius: "12px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
        }}
      >
        <h1 style={{ textAlign: "center", marginBottom: "8px" }}>
          🐾 Refugio de Animales
        </h1>

        <p style={{ textAlign: "center", color: "#666", marginBottom: "28px" }}>
          Iniciar sesión (personal del refugio)
        </p>

        {errorServidor && <p style={{ ...estiloError, fontSize: "0.95rem" }}>{errorServidor}</p>}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div style={{ marginBottom: "16px" }}>
            <label htmlFor="correo">Correo electrónico</label>

            <input
              id="correo"
              type="email"
              placeholder="correo@ejemplo.com"
              autoComplete="username"
              style={estiloCampo}
              {...register("correo")}
            />

            {errors.correo && <p style={estiloError}>{errors.correo.message}</p>}
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label htmlFor="contrasena">Contraseña</label>

            <input
              id="contrasena"
              type="password"
              placeholder="Ingrese su contraseña"
              autoComplete="current-password"
              style={estiloCampo}
              {...register("contrasena")}
            />

            {errors.contrasena && <p style={estiloError}>{errors.contrasena.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: "100%",
              padding: "11px",
              border: "none",
              borderRadius: "6px",
              backgroundColor: "#2563eb",
              color: "white",
              fontWeight: "bold",
              cursor: isSubmitting ? "not-allowed" : "pointer",
            }}
          >
            {isSubmitting ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>

        <button
          type="button"
          onClick={onVolver}
          style={{
            width: "100%",
            marginTop: "12px",
            padding: "8px",
            border: "none",
            background: "none",
            color: "#2563eb",
            cursor: "pointer",
          }}
        >
          Volver
        </button>
      </section>
    </main>
  );
}

export default LoginPage;
