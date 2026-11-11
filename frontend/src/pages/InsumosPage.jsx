
import { useCallback, useEffect, useState } from "react";

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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from "@mui/material";

import { insumosApi } from "../services/api.js";

// Valores iniciales del formulario
const formularioInicial = {
  nombre: "",
  categoria: "ALIMENTO",
  descripcion: "",
  unidadMedida: "kg",
  stockActual: "0",
  stockMinimo: "0",
};

function InsumosPage({ cuenta }) {
  // Estados del inventario
  const [insumos, setInsumos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // Estados del formulario
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [nuevoInsumo, setNuevoInsumo] = useState({
    ...formularioInicial,
  });
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  // Verificar si el usuario es administrador
  const esAdministrador = cuenta?.tipo === "ADMINISTRADOR";

  // Obtener inventario desde PostgreSQL
  const cargarInsumos = useCallback(async () => {
    try {
      setCargando(true);
      setError("");

      const datos = await insumosApi.listar();
      setInsumos(datos);
    } catch (err) {
      setError(err.message || "No se pudo cargar el inventario.");
    } finally {
      setCargando(false);
    }
  }, []);

  // Cargar los insumos al entrar a la página
  useEffect(() => {
    cargarInsumos();
  }, [cargarInsumos]);

  // Determinar el estado del stock
  const obtenerEstado = (insumo) => {
    const actual = Number(insumo.stockActual);
    const minimo = Number(insumo.stockMinimo);

    if (actual <= minimo) {
      return {
        texto: "Stock bajo",
        color: "error",
      };
    }

    return {
      texto: "Disponible",
      color: "success",
    };
  };

  // Abrir formulario
  const abrirFormulario = () => {
    if (!esAdministrador) return;

    setNuevoInsumo({ ...formularioInicial });
    setErrorFormulario("");
    setMensajeExito("");
    setFormularioAbierto(true);
  };

  // Cerrar formulario
  const cerrarFormulario = () => {
    if (guardando) return;

    setFormularioAbierto(false);
    setErrorFormulario("");
  };

  // Actualizar campos del formulario
  const actualizarCampo = (campo, valor) => {
    setNuevoInsumo((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  };

  // Registrar nuevo insumo
  const guardarInsumo = async () => {
    if (!esAdministrador || guardando) return;

    const stockActual = Number(nuevoInsumo.stockActual);
    const stockMinimo = Number(nuevoInsumo.stockMinimo);

    // Validaciones del formulario
    if (
      !nuevoInsumo.nombre.trim() ||
      !nuevoInsumo.unidadMedida.trim() ||
      nuevoInsumo.stockActual === "" ||
      nuevoInsumo.stockMinimo === "" ||
      !Number.isFinite(stockActual) ||
      !Number.isFinite(stockMinimo) ||
      stockActual < 0 ||
      stockMinimo < 0 ||
      !Number.isInteger(stockActual * 100) ||
      !Number.isInteger(stockMinimo * 100)
    ) {
      setErrorFormulario(
        "Completa correctamente los campos. Las cantidades deben ser positivas o cero y tener como máximo dos decimales."
      );
      return;
    }

    try {
      setGuardando(true);
      setErrorFormulario("");
      setMensajeExito("");

      await insumosApi.crear({
        nombre: nuevoInsumo.nombre.trim(),
        categoria: nuevoInsumo.categoria,
        descripcion: nuevoInsumo.descripcion.trim(),
        unidadMedida: nuevoInsumo.unidadMedida.trim(),
        stockActual,
        stockMinimo,
      });

      // Cerrar y limpiar formulario
      setFormularioAbierto(false);
      setNuevoInsumo({ ...formularioInicial });

      // Actualizar inventario
      await cargarInsumos();

      setMensajeExito("Insumo registrado correctamente.");
    } catch (err) {
      setErrorFormulario(
        err.message || "No se pudo registrar el insumo."
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* ENCABEZADO */}
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        📦 Gestión de Insumos
      </Typography>

      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Inventario de alimentos, medicamentos y otros insumos
        del refugio.
      </Typography>

      {/* ROL DEL USUARIO */}
      <Box sx={{ mb: 3 }}>
        <Chip
          label={
            esAdministrador
              ? "Administrador"
              : "Solo consulta"
          }
          color={esAdministrador ? "primary" : "default"}
        />
      </Box>

      {/* BOTÓN PARA ADMINISTRADORES */}
      {esAdministrador && (
        <Box sx={{ mb: 3 }}>
          <Button
            variant="contained"
            onClick={abrirFormulario}
          >
            + Nuevo insumo
          </Button>
        </Box>
      )}

      {/* MENSAJES */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error al cargar inventario: {error}
        </Alert>
      )}

      {mensajeExito && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setMensajeExito("")}
        >
          {mensajeExito}
        </Alert>
      )}

      {/* TABLA DE INVENTARIO */}
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
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
                        <TableCell>
                          {insumo.nombre}
                        </TableCell>

                        <TableCell>
                          {insumo.categoria}
                        </TableCell>

                        <TableCell>
                          {insumo.stockActual}
                        </TableCell>

                        <TableCell>
                          {insumo.unidadMedida}
                        </TableCell>

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

      {/* FORMULARIO DE REGISTRO */}
      <Dialog
        open={formularioAbierto}
        onClose={cerrarFormulario}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Registrar nuevo insumo
        </DialogTitle>

        <DialogContent>
          {errorFormulario && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorFormulario}
            </Alert>
          )}

          <TextField
            label="Nombre del insumo"
            fullWidth
            required
            margin="dense"
            value={nuevoInsumo.nombre}
            onChange={(e) =>
              actualizarCampo("nombre", e.target.value)
            }
          />

          <TextField
            select
            label="Categoría"
            fullWidth
            required
            margin="dense"
            value={nuevoInsumo.categoria}
            onChange={(e) =>
              actualizarCampo("categoria", e.target.value)
            }
          >
            <MenuItem value="ALIMENTO">
              Alimento
            </MenuItem>
            <MenuItem value="MEDICAMENTO">
              Medicamento
            </MenuItem>
            <MenuItem value="OTRO">
              Otro
            </MenuItem>
          </TextField>

          <TextField
            label="Descripción"
            fullWidth
            multiline
            rows={2}
            margin="dense"
            value={nuevoInsumo.descripcion}
            onChange={(e) =>
              actualizarCampo("descripcion", e.target.value)
            }
          />

          <TextField
            label="Unidad de medida"
            fullWidth
            required
            margin="dense"
            helperText="Ejemplo: kg, litros, unidades"
            value={nuevoInsumo.unidadMedida}
            onChange={(e) =>
              actualizarCampo("unidadMedida", e.target.value)
            }
          />

          <TextField
            label="Cantidad inicial"
            type="number"
            fullWidth
            required
            margin="dense"
            slotProps={{
              htmlInput: {
                min: 0,
                step: 0.01,
              },
            }}
            value={nuevoInsumo.stockActual}
            onChange={(e) =>
              actualizarCampo("stockActual", e.target.value)
            }
          />

          <TextField
            label="Stock mínimo"
            type="number"
            fullWidth
            required
            margin="dense"
            helperText="Cantidad a partir de la cual se considera stock bajo"
            slotProps={{
              htmlInput: {
                min: 0,
                step: 0.01,
              },
            }}
            value={nuevoInsumo.stockMinimo}
            onChange={(e) =>
              actualizarCampo("stockMinimo", e.target.value)
            }
          />
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={cerrarFormulario}
            disabled={guardando}
          >
            Cancelar
          </Button>

          <Button
            variant="contained"
            onClick={guardarInsumo}
            disabled={guardando}
          >
            {guardando
              ? "Guardando..."
              : "Registrar insumo"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default InsumosPage;
