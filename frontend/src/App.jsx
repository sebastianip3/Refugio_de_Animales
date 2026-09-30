import { useState } from "react";
import RegistroPage from "./pages/RegistroPage.jsx";
import InicioPage from "./pages/InicioPage.jsx";
import Layout from "./components/Layout.jsx";

function App() {
  const [registrado, setRegistrado] = useState(false);

  if (!registrado) {
    return (
      <RegistroPage
        onRegistro={() => setRegistrado(true)}
      />
    );
  }

  return (
    <Layout>
      <InicioPage />
    </Layout>
  );
}

export default App;