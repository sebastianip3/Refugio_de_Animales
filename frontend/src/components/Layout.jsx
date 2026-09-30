const SECCIONES = [
  { id: "inicio", label: "Inicio" },
  { id: "animales", label: "Animales" },
  { id: "adopciones", label: "Adopciones" },
  { id: "historial", label: "Historial clínico" },
  { id: "insumos", label: "Insumos" },
  { id: "voluntariado", label: "Voluntariado" },
  { id: "trabajadores", label: "Trabajadores" },
  { id: "esterilizacion", label: "Esterilización" },
];

function Layout({ children, paginaActual, onNavegar }) {
  return (
    <div>
      <header>
        <h1>🐾 Refugio de Animales</h1>
      </header>

      <div>
        <aside>
          <h2>Menú</h2>

          <nav>
            <ul>
              {SECCIONES.map((seccion) => (
                <li key={seccion.id}>
                  <a
                    href={`#${seccion.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onNavegar(seccion.id);
                    }}
                    style={{ fontWeight: paginaActual === seccion.id ? "bold" : "normal" }}
                  >
                    {seccion.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main>
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;
