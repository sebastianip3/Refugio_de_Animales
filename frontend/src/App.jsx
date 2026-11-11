import { useEffect, useState } from "react";
import RegistroPage from "./pages/RegistroPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import InicioPage from "./pages/InicioPage.jsx";
import AnimalesPage from "./pages/AnimalesPage.jsx";
import AdopcionesPage from "./pages/AdopcionesPage.jsx";
import HistorialPage from "./pages/HistorialPage.jsx";
import CuidadosPage from "./pages/CuidadosPage.jsx";
import InsumosPage from "./pages/InsumosPage.jsx";
import PerfilPage from "./pages/PerfilPage.jsx";
import InscripcionEsterilizacionPage from "./pages/inscripcionEsterilizacionPage.jsx";
import VoluntariadoPage from "./pages/VoluntariadoPage.jsx";
import Layout from "./components/Layout.jsx";
import { cuentasApi, EVENTO_SESION_CERRADA } from "./services/api.js";
import EsterilizacionPage from "./pages/EsterilizacionPage.jsx";

const PAGINAS = {
  inicio: InicioPage,
  animales: AnimalesPage,
  adopciones: AdopcionesPage,
  historial: HistorialPage,
  cuidados: CuidadosPage,
  insumos: InsumosPage,
  voluntariado: VoluntariadoPage,
  perfil: PerfilPage,
  esterilizacion: EsterilizacionPage,
};

function App() {
  const [registrado, setRegistrado] = useState(false);
  const [pagina, setPagina] = useState(import.meta.env.DEV ? "voluntariado" : "inicio");
  // Cuenta del personal con sesión iniciada; null para los adoptantes
  const [cuenta, setCuenta] = useState(null);
  const [enLogin, setEnLogin] = useState(false);
  const [cargandoSesion, setCargandoSesion] = useState(true);

  const volverAlInicio = () => {
    setCuenta(null);
    setRegistrado(false);
    setEnLogin(false);
    setPagina("inicio");
  };

  // El backend borra la cookie de sesión
  const cerrarSesion = async () => {
    await cuentasApi.logout().catch(() => {});
    volverAlInicio();
  };

  // JavaScript no puede leer la cookie httpOnly, así que al cargar se pregunta
  // al backend si hay una sesión abierta (si no la hay, responde 401)
  useEffect(() => {
    cuentasApi
      .perfil()
      .then(setCuenta)
      .catch(() => {})
      .finally(() => setCargandoSesion(false));
  }, []);

  useEffect(() => {
    window.addEventListener(EVENTO_SESION_CERRADA, volverAlInicio);
    return () => window.removeEventListener(EVENTO_SESION_CERRADA, volverAlInicio);
  }, []);

  if (window.location.pathname === "/inscripcion-esterilizacion") {
    return <InscripcionEsterilizacionPage />;
  }

  if (cargandoSesion) return <p>Cargando...</p>;

  if (enLogin) {
    return (
      <LoginPage
        onLogin={(cuentaIniciada) => {
          setCuenta(cuentaIniciada);
          setEnLogin(false);
        }}
        onVolver={() => setEnLogin(false)}
      />
    );
  }

  if (!registrado && !cuenta && !import.meta.env.DEV) {
    return (
      <RegistroPage
        onRegistro={() => setRegistrado(true)}
        onIrALogin={() => setEnLogin(true)}
      />
    );
  }

  const Pagina = PAGINAS[pagina];

  return (
    <Layout
      paginaActual={pagina}
      onNavegar={setPagina}
      cuenta={cuenta}
      onCerrarSesion={cerrarSesion}
      onIniciarSesion={() => {
        setRegistrado(false);
        setEnLogin(true);
      }}
    >
      {Pagina ? (
        <Pagina
          cuenta={cuenta}
          onNavegar={setPagina}
          onIniciarSesion={() => setEnLogin(true)}
        />
      ) : (
        <p>Sección en construcción.</p>
      )}
    </Layout>
  );
}

export default App;
