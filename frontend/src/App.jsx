import { useEffect, useState } from "react";
import RegistroPage from "./pages/RegistroPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import InicioPage from "./pages/InicioPage.jsx";
import InicioPublicoPage from "./pages/InicioPublicoPage.jsx";
import AnimalesPage from "./pages/AnimalesPage.jsx";
import AdopcionesPage from "./pages/AdopcionesPage.jsx";
import HistorialPage from "./pages/HistorialPage.jsx";
import CuidadosPage from "./pages/CuidadosPage.jsx";
import InsumosPage from "./pages/InsumosPage.jsx";
import PerfilPage from "./pages/PerfilPage.jsx";
import InscripcionEsterilizacionPage from "./pages/inscripcionEsterilizacionPage.jsx";
import VoluntariadoPage from "./pages/VoluntariadoPage.jsx";
import TrabajadoresPage from "./pages/TrabajadoresPage.jsx";
import Layout from "./components/Layout.jsx";
import { cuentasApi, EVENTO_SESION_CERRADA } from "./services/api.js";
import EventosPage from "./pages/EventosPage.jsx";

const PAGINAS = {
  inicio: InicioPage,
  animales: AnimalesPage,
  adopciones: AdopcionesPage,
  historial: HistorialPage,
  cuidados: CuidadosPage,
  insumos: InsumosPage,
  voluntariado: VoluntariadoPage,
  trabajadores: TrabajadoresPage,
  perfil: PerfilPage,
  eventos: EventosPage,
};

function App() {
  // Inicio es la primera página en desarrollo y producción.
  const [pagina, setPagina] = useState("inicio");
  const [cuenta, setCuenta] = useState(null);
  const [enLogin, setEnLogin] = useState(false);
  const [cargandoSesion, setCargandoSesion] = useState(true);

  const volverAlInicio = () => {
    setCuenta(null);
    setEnLogin(false);
    setPagina("inicio");
  };

  const cerrarSesion = async () => {
    await cuentasApi.logout().catch(() => {});
    volverAlInicio();
  };

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

  if (window.location.pathname === "/eventos") {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="border-b bg-white px-6 py-4">
          <a href="/" className="font-medium text-blue-600 hover:underline">
            ← Volver al inicio
          </a>
        </header>
        <EventosPage cuenta={null} />
      </div>
    );
  }

  if (enLogin) {
    return (
      <LoginPage
        onLogin={(cuentaIniciada) => {
          setCuenta(cuentaIniciada);
          setEnLogin(false);
          setPagina("inicio");
        }}
        onVolver={() => setEnLogin(false)}
      />
    );
  }

  // Se conserva el formulario de registro existente, pero ya no se impone
  // como pantalla inicial. En el ZIP actual es únicamente una demostración.
  if (!cuenta && pagina === "registro") {
    return (
      <div>
        <div className="bg-white px-6 py-3">
          <button
            type="button"
            onClick={() => setPagina("inicio")}
            className="font-medium text-blue-600 hover:underline"
          >
            ← Volver al inicio
          </button>
        </div>
        <RegistroPage
          onIrALogin={() => {
            setPagina("inicio");
            setEnLogin(true);
          }}
        />
      </div>
    );
  }

  // Solo el personal con sesión puede ver el tablero con estadísticas.
  const Pagina = pagina === "inicio" && !cuenta
    ? InicioPublicoPage
    : PAGINAS[pagina];

  return (
    <Layout
      paginaActual={pagina}
      onNavegar={setPagina}
      cuenta={cuenta}
      onCerrarSesion={cerrarSesion}
      onIniciarSesion={() => setEnLogin(true)}
    >
      {Pagina ? (
        <Pagina
          cuenta={cuenta}
          onNavegar={setPagina}
          onIniciarSesion={() => setEnLogin(true)}
          onIrARegistro={() => setPagina("registro")}
        />
      ) : (
        <p>Sección en construcción.</p>
      )}
    </Layout>
  );
}

export default App;
