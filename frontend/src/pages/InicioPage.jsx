// frontend/src/pages/InicioPage.jsx
import React from 'react';
import { Container, Box, Typography, Card, CardContent, Grid } from '@mui/material';

function InicioPage() {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f4f6f8', py: 6 }}>
      <Container maxWidth="md">
        
        {/* Tarjeta central de bienvenida */}
        <Card sx={{ mb: 4, p: 3, textAlign: 'center', borderRadius: 3, boxShadow: 3 }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ color: '#2c3e50', fontWeight: 'bold' }}>
            🐾 Refugio de Animales
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Bienvenido! 
          </Typography>
        </Card>

        {/* Panel de Resumen General */}
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <Card sx={{ textAlign: 'center', borderRadius: 3, borderTop: '5px solid #3498db', boxShadow: 2 }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  Animales Registrados
                </Typography>
                <Typography variant="h3" sx={{ color: '#2c3e50', fontWeight: 'bold' }}>
                  ##
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <Card sx={{ textAlign: 'center', borderRadius: 3, borderTop: '5px solid #2ecc71', boxShadow: 2 }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  En Adopción
                </Typography>
                <Typography variant="h3" sx={{ color: '#2c3e50', fontWeight: 'bold' }}>
                  ##
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Card sx={{ textAlign: 'center', borderRadius: 3, borderTop: '5px solid #f39c12', boxShadow: 2 }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  Adopciones en Proceso
                </Typography>
                <Typography variant="h3" sx={{ color: '#2c3e50', fontWeight: 'bold' }}>
                  ##
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

      </Container>
    </Box>
  );
}

export default InicioPage;