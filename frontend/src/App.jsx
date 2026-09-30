import { useState } from "react";
import RegistroPage from "./pages/RegistroPage.jsx";
import InicioPage from "./pages/InicioPage.jsx";
import AnimalesPage from "./pages/AnimalesPage.jsx";
import AdopcionesPage from "./pages/AdopcionesPage.jsx";
import Layout from "./components/Layout.jsx";

const PAGINAS = {
  inicio: InicioPage,
  animales: AnimalesPage,
  adopciones: AdopcionesPage,
};

function App() {
  const [registrado, setRegistrado] = useState(false);
  const [pagina, setPagina] = useState("inicio");

  if (!registrado) {
    return (
      <RegistroPage
        onRegistro={() => setRegistrado(true)}
      />
    );
  }

  const Pagina = PAGINAS[pagina];

  return (
    <Layout paginaActual={pagina} onNavegar={setPagina}>
      {Pagina ? <Pagina /> : <p>Sección en construcción.</p>}
    </Layout>
  );
}

export default App;
