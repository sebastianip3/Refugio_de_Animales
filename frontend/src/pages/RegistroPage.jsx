import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registroFormSchema } from "../schemas/registro.schema.js";

const FORMULARIO_VACIO = {
  nombre: "",
  apellido: "",
  correo: "",
  contrasena: "",
  confirmarContrasena: "",
};

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

function RegistroPage({ onRegistro }) {
  const {
    register,
    handleSubmit,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm({
    resolver: zodResolver(registroFormSchema),
    defaultValues: FORMULARIO_VACIO,
    mode: "onChange",
  });

  const onSubmit = (datos) => {
    console.log(datos);

    onRegistro();
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
        <h1
          style={{
            textAlign: "center",
            marginBottom: "8px",
          }}
        >
          🐾 Refugio de Animales
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#666",
            marginBottom: "28px",
          }}
        >
          Crear cuenta
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <div style={{ marginBottom: "16px" }}>
            <label htmlFor="nombre">
              Nombre
            </label>

            <input
              id="nombre"
              type="text"
              placeholder="Ingrese su nombre"
              style={estiloCampo}
              {...register("nombre")}
            />

            {errors.nombre && (
              <p style={estiloError}>
                {errors.nombre.message}
              </p>
            )}
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label htmlFor="apellido">
              Apellido
            </label>

            <input
              id="apellido"
              type="text"
              placeholder="Ingrese su apellido"
              style={estiloCampo}
              {...register("apellido")}
            />

            {errors.apellido && (
              <p style={estiloError}>
                {errors.apellido.message}
              </p>
            )}
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label htmlFor="correo">
              Correo electrónico
            </label>

            <input
              id="correo"
              type="email"
              placeholder="correo@ejemplo.com"
              style={estiloCampo}
              {...register("correo")}
            />

            {errors.correo && (
              <p style={estiloError}>
                {errors.correo.message}
              </p>
            )}
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label htmlFor="contrasena">
              Contraseña
            </label>

            <input
              id="contrasena"
              type="password"
              placeholder="Ingrese su contraseña"
              style={estiloCampo}
              {...register("contrasena")}
            />

            {errors.contrasena && (
              <p style={estiloError}>
                {errors.contrasena.message}
              </p>
            )}
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label htmlFor="confirmarContrasena">
              Confirmar contraseña
            </label>

            <input
              id="confirmarContrasena"
              type="password"
              placeholder="Repita su contraseña"
              style={estiloCampo}
              {...register("confirmarContrasena")}
            />

            {errors.confirmarContrasena && (
              <p style={estiloError}>
                {errors.confirmarContrasena.message}
              </p>
            )}
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
              cursor: isSubmitting
                ? "not-allowed"
                : "pointer",
            }}
          >
            {isSubmitting
              ? "Procesando..."
              : "Crear cuenta"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default RegistroPage;