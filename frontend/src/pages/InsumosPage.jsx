
import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";

import { insumosApi } from "../services/api.js";

function InsumosPage({ cuenta }) {
  const [insumos, setInsumos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const esAdministrador = cuenta?.tipo === "ADMINISTRADOR";

  // Consultar los insumos de PostgreSQL
  const cargarInsumos = async () => {
    try {
      setCargando(true);
      setError("");

      const datos = await insumosApi.listar();
      setInsumos(datos);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  // Se ejecuta cuando se abre la página
  useEffect(() => {
    cargarInsumos();
  }, []);

  // Determinar si un insumo tiene stock bajo
  const obtenerEstado = (insumo) => {
    const actual = Number(insumo.stockActual);
    const minimo = Number(insumo.stockMinimo);

    if (actual <= minimo) {
      return { texto: "Stock bajo", color: "error" };
    }

    return { texto: "Disponible", color: "success" };
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        📦 Gestión de Insumos
      </Typography>

      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Inventario de alimentos, medicamentos y otros insumos.
      </Typography>

      <Chip
        label={esAdministrador ? "Administrador" : "Solo consulta"}
        color={esAdministrador ? "primary" : "default"}
        sx={{ mb: 3 }}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Error al cargar el inventario: {error}
        </Alert>
      )}

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            Inventario de insumos
          </Typography>

          <Button
            variant="outlined"
            onClick={cargarInsumos}
            disabled={cargando}
          >
            Actualizar
          </Button>
        </Box>

        {cargando ? (
          <Box sx={{ textAlign: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Categoría</TableCell>
                  <TableCell>Cantidad</TableCell>
                  <TableCell>Unidad</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {insumos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No hay insumos registrados.
                    </TableCell>
                  </TableRow>
                ) : (
                  insumos.map((insumo) => {
                    const estado = obtenerEstado(insumo);

                    return (
                      <TableRow key={insumo.id}>
                        <TableCell>{insumo.nombre}</TableCell>
                        <TableCell>{insumo.categoria}</TableCell>
                        <TableCell>{insumo.stockActual}</TableCell>
                        <TableCell>{insumo.unidadMedida}</TableCell>
                        <TableCell>
                          <Chip
                            label={estado.texto}
                            color={estado.color}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}

export default InsumosPage;
