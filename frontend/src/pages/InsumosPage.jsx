
import { useCallback, useEffect, useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, MenuItem,
  Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { insumosApi } from "../services/api.js";

const formularioInicial = {
  nombre: "",
  categoria: "ALIMENTO",
  descripcion: "",
  unidadMedida: "kg",
  stockActual: "0",
  stockMinimo: "0",
};

const tiposMovimiento = {
  INGRESO: "Ingreso",
  RETIRO: "Retiro",
  CONSUMO: "Consumo",
};

// Validar cantidades de hasta dos decimales
function cantidadValida(valor, permiteCero = true) {
  const texto = String(valor).trim();
  const numero = Number(texto);

  return (
    /^\d+(?:\.\d{1,2})?$/.test(texto) &&
    Number.isFinite(numero) &&
    numero <= 9999999999 &&
    (permiteCero ? numero >= 0 : numero > 0)
  );
}

function InsumosPage({ cuenta }) {
  // Estados del inventario
  const [insumos, setInsumos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  // Estados del formulario para crear insumos
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [nuevoInsumo, setNuevoInsumo] = useState({ ...formularioInicial });
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState("");

  // Estados del formulario de movimientos
  const [movimientoAbierto, setMovimientoAbierto] = useState(false);
  const [insumoSeleccionado, setInsumoSeleccionado] = useState(null);
  const [tipoMovimiento, setTipoMovimiento] = useState("INGRESO");
  const [cantidadMovimiento, setCantidadMovimiento] = useState("1");
  const [observacion, setObservacion] = useState("");
  const [guardandoMovimiento, setGuardandoMovimiento] = useState(false);
  const [errorMovimiento, setErrorMovimiento] = useState("");

  const esAdministrador = cuenta?.tipo === "ADMINISTRADOR";

  // Consultar insumos desde PostgreSQL
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

  useEffect(() => {
    cargarInsumos();
  }, [cargarInsumos]);

  // Determinar si un producto tiene stock bajo
  const obtenerEstado = (insumo) =>
    Number(insumo.stockActual) <= Number(insumo.stockMinimo)
      ? { texto: "Stock bajo", color: "error" }
      : { texto: "Disponible", color: "success" };

  // Abrir formulario de nuevo insumo
  const abrirFormulario = () => {
    if (!esAdministrador) return;

    setNuevoInsumo({ ...formularioInicial });
    setErrorFormulario("");
    setFormularioAbierto(true);
  };

  const actualizarCampo = (campo, valor) => {
    setNuevoInsumo((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  };

  // Registrar un nuevo insumo
  const guardarInsumo = async () => {
    if (!esAdministrador || guardando) return;

    if (
      !nuevoInsumo.nombre.trim() ||
      !nuevoInsumo.unidadMedida.trim() ||
      !cantidadValida(nuevoInsumo.stockActual) ||
      !cantidadValida(nuevoInsumo.stockMinimo)
    ) {
      setErrorFormulario(
        "Completa los campos obligatorios. Las cantidades deben ser mayores o iguales a cero y tener hasta dos decimales."
      );
      return;
    }

    try {
      setGuardando(true);
      setErrorFormulario("");

      await insumosApi.crear({
        nombre: nuevoInsumo.nombre.trim(),
        categoria: nuevoInsumo.categoria,
        descripcion: nuevoInsumo.descripcion.trim(),
        unidadMedida: nuevoInsumo.unidadMedida.trim(),
        stockActual: Number(nuevoInsumo.stockActual),
        stockMinimo: Number(nuevoInsumo.stockMinimo),
      });

      setFormularioAbierto(false);
      setNuevoInsumo({ ...formularioInicial });
      setMensajeExito("Insumo registrado correctamente.");

      await cargarInsumos();
    } catch (err) {
      setErrorFormulario(
        err.message || "No se pudo registrar el insumo."
      );
    } finally {
      setGuardando(false);
    }
  };

  // Abrir formulario de ingreso, retiro o consumo
  const abrirMovimiento = (insumo, tipo) => {
    if (!esAdministrador) return;

    setInsumoSeleccionado(insumo);
    setTipoMovimiento(tipo);
    setCantidadMovimiento("1");
    setObservacion("");
    setErrorMovimiento("");
    setMovimientoAbierto(true);
  };

  // Registrar movimiento en PostgreSQL
  const guardarMovimiento = async () => {
    if (!esAdministrador || !insumoSeleccionado || guardandoMovimiento) {
      return;
    }

    if (!cantidadValida(cantidadMovimiento, false)) {
      setErrorMovimiento(
        "La cantidad debe ser mayor que cero y tener como máximo dos decimales."
      );
      return;
    }

    const cantidad = Number(cantidadMovimiento);

    // Impedir retiros o consumos superiores al stock
    if (
      tipoMovimiento !== "INGRESO" &&
      cantidad > Number(insumoSeleccionado.stockActual)
    ) {
      setErrorMovimiento(
        "No puedes retirar o consumir más de la cantidad disponible."
      );
      return;
    }

    try {
      setGuardandoMovimiento(true);
      setErrorMovimiento("");

      await insumosApi.registrarMovimiento(insumoSeleccionado.id, {
        tipo: tipoMovimiento,
        cantidad,
        observacion: observacion.trim(),
      });

      setMovimientoAbierto(false);
      setInsumoSeleccionado(null);

      setMensajeExito(
        `${tiposMovimiento[tipoMovimiento]} registrado correctamente.`
      );

      await cargarInsumos();
    } catch (err) {
      setErrorMovimiento(
        err.message || "No se pudo registrar el movimiento."
      );
    } finally {
      setGuardandoMovimiento(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* ENCABEZADO */}
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        📦 Gestión de Insumos
      </Typography>

      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Inventario de alimentos, medicamentos y otros insumos del refugio.
      </Typography>

      {/* ROL Y BOTÓN DE REGISTRO */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Chip
          label={esAdministrador ? "Administrador" : "Solo consulta"}
          color={esAdministrador ? "primary" : "default"}
        />

        {esAdministrador && (
          <Button variant="contained" onClick={abrirFormulario}>
            + Nuevo insumo
          </Button>
        )}
      </Box>

      {/* MENSAJES */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
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
                  {esAdministrador && (
                    <TableCell>Movimientos</TableCell>
                  )}
                </TableRow>
              </TableHead>

              <TableBody>
                {insumos.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={esAdministrador ? 6 : 5}
                      align="center"
                    >
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

                        {/* Solo los administradores modifican */}
                        {esAdministrador && (
                          <TableCell>
                            <Box
                              sx={{
                                display: "flex",
                                gap: 1,
                                flexWrap: "wrap",
                              }}
                            >
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() =>
                                  abrirMovimiento(insumo, "INGRESO")
                                }
                              >
                                Ingresar
                              </Button>

                              <Button
                                size="small"
                                variant="outlined"
                                color="warning"
                                onClick={() =>
                                  abrirMovimiento(insumo, "RETIRO")
                                }
                              >
                                Retirar
                              </Button>

                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={() =>
                                  abrirMovimiento(insumo, "CONSUMO")
                                }
                              >
                                Consumir
                              </Button>
                            </Box>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* FORMULARIO DE REGISTRO DE INSUMOS */}
      <Dialog
        open={formularioAbierto}
        onClose={() => !guardando && setFormularioAbierto(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Registrar nuevo insumo</DialogTitle>

        <DialogContent>
          {errorFormulario && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorFormulario}
            </Alert>
          )}

          <TextField
            label="Nombre del insumo"
            required
            fullWidth
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
            margin="dense"
            value={nuevoInsumo.categoria}
            onChange={(e) =>
              actualizarCampo("categoria", e.target.value)
            }
          >
            <MenuItem value="ALIMENTO">Alimento</MenuItem>
            <MenuItem value="MEDICAMENTO">Medicamento</MenuItem>
            <MenuItem value="OTRO">Otro</MenuItem>
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
            required
            fullWidth
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
            required
            fullWidth
            margin="dense"
            slotProps={{
              htmlInput: { min: 0, step: 0.01 },
            }}
            value={nuevoInsumo.stockActual}
            onChange={(e) =>
              actualizarCampo("stockActual", e.target.value)
            }
          />

          <TextField
            label="Stock mínimo"
            type="number"
            required
            fullWidth
            margin="dense"
            slotProps={{
              htmlInput: { min: 0, step: 0.01 },
            }}
            value={nuevoInsumo.stockMinimo}
            onChange={(e) =>
              actualizarCampo("stockMinimo", e.target.value)
            }
          />
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            disabled={guardando}
            onClick={() => setFormularioAbierto(false)}
          >
            Cancelar
          </Button>

          <Button
            variant="contained"
            disabled={guardando}
            onClick={guardarInsumo}
          >
            {guardando ? "Guardando..." : "Registrar insumo"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* FORMULARIO DE MOVIMIENTOS */}
      <Dialog
        open={movimientoAbierto}
        onClose={() =>
          !guardandoMovimiento && setMovimientoAbierto(false)
        }
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {tiposMovimiento[tipoMovimiento]} de insumo
        </DialogTitle>

        <DialogContent>
          {insumoSeleccionado && (
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              {insumoSeleccionado.nombre} — Disponible:{" "}
              {insumoSeleccionado.stockActual}{" "}
              {insumoSeleccionado.unidadMedida}
            </Typography>
          )}

          {errorMovimiento && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMovimiento}
            </Alert>
          )}

          <TextField
            label="Cantidad"
            type="number"
            required
            fullWidth
            margin="dense"
            value={cantidadMovimiento}
            onChange={(e) =>
              setCantidadMovimiento(e.target.value)
            }
            slotProps={{
              htmlInput: { min: 0.01, step: 0.01 },
            }}
          />

          <TextField
            label="Observación (opcional)"
            fullWidth
            multiline
            rows={2}
            margin="dense"
            value={observacion}
            onChange={(e) =>
              setObservacion(e.target.value)
            }
          />
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            disabled={guardandoMovimiento}
            onClick={() => setMovimientoAbierto(false)}
          >
            Cancelar
          </Button>

          <Button
            variant="contained"
            disabled={guardandoMovimiento}
            onClick={guardarMovimiento}
          >
            {guardandoMovimiento
              ? "Guardando..."
              : `Confirmar ${tiposMovimiento[tipoMovimiento].toLowerCase()}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default InsumosPage;
