
import { useCallback, useEffect, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import { insumosApi } from "../services/api.js";

// Valores iniciales para registrar un insumo
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

const nombresCategoria = {
  ALIMENTO: "Alimento",
  MEDICAMENTO: "Medicamento",
  OTRO: "Otro",
};

// Validar cantidades con máximo dos decimales
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

// Formatear fecha para Chile
function formatearFecha(fecha) {
  return new Date(fecha).toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function InsumosPage({ cuenta }) {
  // ============================
  // ESTADOS DEL INVENTARIO
  // ============================

  const [insumos, setInsumos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  // ============================
  // ESTADOS DE REGISTRO
  // ============================

  const [formularioAbierto, setFormularioAbierto] =
    useState(false);

  const [nuevoInsumo, setNuevoInsumo] = useState({
    ...formularioInicial,
  });

  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState("");

  // ============================
  // ESTADOS DE MOVIMIENTOS
  // ============================

  const [movimientoAbierto, setMovimientoAbierto] =
    useState(false);

  const [insumoSeleccionado, setInsumoSeleccionado] =
    useState(null);

  const [tipoMovimiento, setTipoMovimiento] =
    useState("INGRESO");

  const [cantidadMovimiento, setCantidadMovimiento] =
    useState("1");

  const [observacion, setObservacion] = useState("");
  const [guardandoMovimiento, setGuardandoMovimiento] =
    useState(false);

  const [errorMovimiento, setErrorMovimiento] = useState("");

  // ============================
  // ESTADOS DEL HISTORIAL
  // ============================

  const [historialAbierto, setHistorialAbierto] =
    useState(false);

  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] =
    useState(false);

  const [errorHistorial, setErrorHistorial] = useState("");

  // ============================
  // ESTADOS DE ALERTAS - RF2
  // ============================

  const [alertas, setAlertas] = useState([]);
  const [cargandoAlertas, setCargandoAlertas] =
    useState(true);

  const [errorAlertas, setErrorAlertas] = useState("");

  // Comprobar permisos del usuario
  const esAdministrador = cuenta?.tipo === "ADMINISTRADOR";

  // ============================
  // CONSULTAR INVENTARIO
  // ============================

  const cargarInsumos = useCallback(async () => {
    try {
      setCargando(true);
      setError("");

      const datos = await insumosApi.listar();
      setInsumos(datos);
    } catch (err) {
      setError(
        err.message || "No se pudo consultar el inventario."
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarInsumos();
  }, [cargarInsumos]);

  // ============================
  // CONSULTAR ALERTAS - RF2
  // ============================

  const cargarAlertas = useCallback(async () => {
    if (!esAdministrador) return;

    try {
      setErrorAlertas("");

      const datos = await insumosApi.listarAlertas();
      setAlertas(datos);
    } catch (err) {
      setErrorAlertas(
        err.message || "No se pudieron cargar las alertas."
      );
    } finally {
      setCargandoAlertas(false);
    }
  }, [esAdministrador]);

  // Cargar alertas al entrar y cada 30 segundos
  useEffect(() => {
    if (!esAdministrador) {
      setAlertas([]);
      setCargandoAlertas(false);
      return;
    }

    cargarAlertas();

    const intervalo = setInterval(() => {
      cargarAlertas();
    }, 30000);

    return () => clearInterval(intervalo);
  }, [esAdministrador, cargarAlertas]);

  // Actualizar inventario y alertas
  const actualizarTodo = async () => {
    const consultas = [cargarInsumos()];

    if (esAdministrador) {
      consultas.push(cargarAlertas());
    }

    await Promise.all(consultas);
  };

  // ============================
  // ESTADO DEL STOCK
  // ============================

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

  // ============================
  // REGISTRAR INSUMOS - RF1
  // ============================

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

  const guardarInsumo = async () => {
    if (!esAdministrador || guardando) return;

    if (
      !nuevoInsumo.nombre.trim() ||
      !nuevoInsumo.unidadMedida.trim() ||
      !cantidadValida(nuevoInsumo.stockActual) ||
      !cantidadValida(nuevoInsumo.stockMinimo)
    ) {
      setErrorFormulario(
        "Completa los campos obligatorios con cantidades válidas de hasta dos decimales."
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

      // Actualizar inventario y alertas
      await actualizarTodo();
    } catch (err) {
      setErrorFormulario(
        err.message || "No se pudo registrar el insumo."
      );
    } finally {
      setGuardando(false);
    }
  };

  // ============================
  // MOVIMIENTOS - RF1
  // ============================

  const abrirMovimiento = (insumo, tipo) => {
    if (!esAdministrador) return;

    setInsumoSeleccionado(insumo);
    setTipoMovimiento(tipo);
    setCantidadMovimiento("1");
    setObservacion("");
    setErrorMovimiento("");
    setMovimientoAbierto(true);
  };

  const guardarMovimiento = async () => {
    if (
      !esAdministrador ||
      !insumoSeleccionado ||
      guardandoMovimiento
    ) {
      return;
    }

    if (!cantidadValida(cantidadMovimiento, false)) {
      setErrorMovimiento(
        "La cantidad debe ser mayor que cero y tener hasta dos decimales."
      );
      return;
    }

    const cantidad = Number(cantidadMovimiento);

    if (
      tipoMovimiento !== "INGRESO" &&
      cantidad > Number(insumoSeleccionado.stockActual)
    ) {
      setErrorMovimiento(
        "No hay stock suficiente para esta operación."
      );
      return;
    }

    try {
      setGuardandoMovimiento(true);
      setErrorMovimiento("");

      await insumosApi.registrarMovimiento(
        insumoSeleccionado.id,
        {
          tipo: tipoMovimiento,
          cantidad,
          observacion: observacion.trim(),
        }
      );

      setMovimientoAbierto(false);
      setInsumoSeleccionado(null);

      setMensajeExito("Movimiento registrado correctamente.");

      // Actualizar stock y alertas inmediatamente
      await actualizarTodo();
    } catch (err) {
      setErrorMovimiento(
        err.message || "No se pudo registrar el movimiento."
      );
    } finally {
      setGuardandoMovimiento(false);
    }
  };

  // ============================
  // HISTORIAL DE MOVIMIENTOS
  // ============================

  const abrirHistorial = async (insumo) => {
    if (!esAdministrador) return;

    setInsumoSeleccionado(insumo);
    setHistorial([]);
    setErrorHistorial("");
    setHistorialAbierto(true);
    setCargandoHistorial(true);

    try {
      const datos = await insumosApi.listarMovimientos(insumo.id);
      setHistorial(datos);
    } catch (err) {
      setErrorHistorial(
        err.message || "No se pudo cargar el historial."
      );
    } finally {
      setCargandoHistorial(false);
    }
  };

  const colorMovimiento = (tipo) => {
    if (tipo === "INGRESO") return "success";
    if (tipo === "RETIRO") return "warning";
    return "error";
  };

  // ============================
  // INTERFAZ PRINCIPAL
  // ============================

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

      {/* ROL Y BOTÓN DE REGISTRO */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          gap: 2,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <Chip
          label={
            esAdministrador ? "Administrador" : "Solo consulta"
          }
          color={esAdministrador ? "primary" : "default"}
        />

        {esAdministrador && (
          <Button variant="contained" onClick={abrirFormulario}>
            + Nuevo insumo
          </Button>
        )}
      </Box>

      {/* MENSAJES DEL SISTEMA */}
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

      {/* ============================ */}
      {/* PANEL DE ALERTAS - RF2 */}
      {/* ============================ */}

      {esAdministrador && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 2,
              mb: 2,
              flexWrap: "wrap",
            }}
          >
            <Typography variant="h6" fontWeight="bold">
              🔔 Alertas de inventario
            </Typography>

            <Chip
              label={`${alertas.length} alertas`}
              color={
                alertas.length > 0 ? "warning" : "success"
              }
            />
          </Box>

          {errorAlertas ? (
            <Alert severity="error">
              {errorAlertas}
            </Alert>
          ) : cargandoAlertas ? (
            <CircularProgress size={24} />
          ) : alertas.length === 0 ? (
            <Alert severity="success">
              No hay alertas activas. Los alimentos y medicamentos
              tienen existencias superiores a sus niveles mínimos.
            </Alert>
          ) : (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              {alertas.map((alerta) => (
                <Alert key={alerta.id} severity="warning">
                  <Typography fontWeight="bold">
                    Stock bajo: {alerta.nombre}
                  </Typography>

                  <Typography variant="body2">
                    Cantidad disponible: {alerta.stockActual}{" "}
                    {alerta.unidadMedida}
                  </Typography>

                  <Typography variant="body2">
                    Stock mínimo: {alerta.stockMinimo}{" "}
                    {alerta.unidadMedida}
                  </Typography>
                </Alert>
              ))}
            </Box>
          )}
        </Paper>
      )}

      {/* ============================ */}
      {/* TABLA DE INVENTARIO */}
      {/* ============================ */}

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
            mb: 2,
            flexWrap: "wrap",
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            Inventario de insumos
          </Typography>

          <Button
            variant="outlined"
            onClick={actualizarTodo}
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
                    <TableCell>Acciones</TableCell>
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

                        <TableCell>
                          {nombresCategoria[insumo.categoria]}
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
                                  abrirMovimiento(
                                    insumo,
                                    "INGRESO"
                                  )
                                }
                              >
                                Ingresar
                              </Button>

                              <Button
                                size="small"
                                variant="outlined"
                                color="warning"
                                onClick={() =>
                                  abrirMovimiento(
                                    insumo,
                                    "RETIRO"
                                  )
                                }
                              >
                                Retirar
                              </Button>

                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={() =>
                                  abrirMovimiento(
                                    insumo,
                                    "CONSUMO"
                                  )
                                }
                              >
                                Consumir
                              </Button>

                              <Button
                                size="small"
                                variant="contained"
                                color="info"
                                onClick={() =>
                                  abrirHistorial(insumo)
                                }
                              >
                                Historial
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

      {/* ============================ */}
      {/* FORMULARIO DE REGISTRO */}
      {/* ============================ */}

      <Dialog
        open={formularioAbierto}
        onClose={() =>
          !guardando && setFormularioAbierto(false)
        }
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
            required
            fullWidth
            margin="dense"
            helperText="Cantidad mínima aceptable para el inventario"
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
            {guardando
              ? "Guardando..."
              : "Registrar insumo"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ============================ */}
      {/* FORMULARIO DE MOVIMIENTOS */}
      {/* ============================ */}

      <Dialog
        open={movimientoAbierto}
        onClose={() =>
          !guardandoMovimiento &&
          setMovimientoAbierto(false)
        }
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {tiposMovimiento[tipoMovimiento]} de insumo
        </DialogTitle>

        <DialogContent>
          {insumoSeleccionado && (
            <Typography
              color="text.secondary"
              sx={{ mb: 2 }}
            >
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
              htmlInput: {
                min: 0.01,
                step: 0.01,
              },
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
              : "Confirmar movimiento"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ============================ */}
      {/* HISTORIAL DE MOVIMIENTOS */}
      {/* ============================ */}

      <Dialog
        open={historialAbierto}
        onClose={() => setHistorialAbierto(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Historial de movimientos
        </DialogTitle>

        <DialogContent dividers>
          {insumoSeleccionado && (
            <Typography
              fontWeight="bold"
              sx={{ mb: 2 }}
            >
              {insumoSeleccionado.nombre}
            </Typography>
          )}

          {errorHistorial && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorHistorial}
            </Alert>
          )}

          {cargandoHistorial ? (
            <Box sx={{ textAlign: "center", p: 4 }}>
              <CircularProgress />
            </Box>
          ) : !errorHistorial && historial.length === 0 ? (
            <Alert severity="info">
              Este insumo todavía no tiene movimientos.
            </Alert>
          ) : !errorHistorial && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Operación</TableCell>
                    <TableCell>Cantidad</TableCell>
                    <TableCell>Responsable</TableCell>
                    <TableCell>Observación</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {historial.map((movimiento) => {
                    const esIngreso =
                      movimiento.tipo === "INGRESO";

                    const responsable = [
                      movimiento.realizadoPor?.nombre,
                      movimiento.realizadoPor?.apellido,
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <TableRow key={movimiento.id}>
                        <TableCell>
                          {formatearFecha(movimiento.fecha)}
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={
                              tiposMovimiento[
                                movimiento.tipo
                              ] || movimiento.tipo
                            }
                            color={colorMovimiento(
                              movimiento.tipo
                            )}
                            size="small"
                          />
                        </TableCell>

                        <TableCell>
                          {esIngreso ? "+" : "-"}
                          {movimiento.cantidad}{" "}
                          {insumoSeleccionado?.unidadMedida}
                        </TableCell>

                        <TableCell>
                          {responsable || "Sin información"}
                        </TableCell>

                        <TableCell>
                          {movimiento.observacion || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setHistorialAbierto(false)}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default InsumosPage;
