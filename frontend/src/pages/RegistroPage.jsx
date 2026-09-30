import { useState } from "react";

function RegistroPage() {
  const [formulario, setFormulario] = useState({
    nombre: "",
    correo: "",
    contrasena: "",
    confirmarContrasena: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormulario({
      ...formulario,
      [name]: value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    console.log(formulario);
  };

  return (
    <main>
      <h1>Refugio de Animales</h1>

      <h2>Crear cuenta</h2>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="nombre">Nombre</label>
          <br />

          <input
            type="text"
            id="nombre"
            name="nombre"
            value={formulario.nombre}
            onChange={handleChange}
            placeholder="Ingrese su nombre"
            required
          />
        </div>

        <br />

        <div>
          <label htmlFor="correo">Correo electrónico</label>
          <br />

          <input
            type="email"
            id="correo"
            name="correo"
            value={formulario.correo}
            onChange={handleChange}
            placeholder="correo@ejemplo.com"
            required
          />
        </div>

        <br />

        <div>
          <label htmlFor="contrasena">Contraseña</label>
          <br />

          <input
            type="password"
            id="contrasena"
            name="contrasena"
            value={formulario.contrasena}
            onChange={handleChange}
            placeholder="Ingrese una contraseña"
            required
          />
        </div>

        <br />

        <div>
          <label htmlFor="confirmarContrasena">
            Confirmar contraseña
          </label>
          <br />

          <input
            type="password"
            id="confirmarContrasena"
            name="confirmarContrasena"
            value={formulario.confirmarContrasena}
            onChange={handleChange}
            placeholder="Repita su contraseña"
            required
          />
        </div>

        <br />

        <button type="submit">
          Registrarse
        </button>
      </form>
    </main>
  );
}

export default RegistroPage;