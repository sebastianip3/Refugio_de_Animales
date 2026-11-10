
import {
  Box,
  Typography,
  Paper,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";

function InsumosPage({ cuenta }) {
  const esAdministrador = cuenta?.tipo === "ADMINISTRADOR";

  return (
    <Box sx={{ p: 4 }}>
      {/* Encabezado */}
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        📦 Gestión de Insumos
      </Typography>

      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Administración y consulta del inventario del refugio.
      </Typography>

      {/* Información del usuario */}
      <Chip
        label={esAdministrador ? "Administrador" : "Solo consulta"}
        color={esAdministrador ? "primary" : "default"}
        sx={{ mb: 3 }}
      />

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
          Inventario de insumos
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Categoría</TableCell>
                <TableCell>Cantidad disponible</TableCell>
                <TableCell>Unidad</TableCell>
                <TableCell>Estado</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              <TableRow>
                <TableCell colSpan={5} align="center">
                  Todavía no hay datos cargados.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Alert severity="info" sx={{ mt: 3 }}>
        Próximamente conectaremos el inventario con la base de datos.
      </Alert>
    </Box>
  );
}

export default InsumosPage;
