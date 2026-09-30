function Layout({ children }) {
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
              <li>Inicio</li>
              <li>Animales</li>
              <li>Adopciones</li>
              <li>Historial clínico</li>
              <li>Insumos</li>
              <li>Voluntariado</li>
              <li>Trabajadores</li>
              <li>Esterilización</li>
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