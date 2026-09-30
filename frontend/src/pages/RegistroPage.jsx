// frontend/src/pages/RegistroPage.jsx
import React from 'react';
import { Container, Box, Typography, Button, Card, CardContent, TextField } from '@mui/material';

function RegistroPage() {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f4f6f8', display: 'flex', alignItems: 'center' }}>
      <Container maxWidth="sm">
        <Card sx={{ p: 4, borderRadius: 3, boxShadow: 4 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            
            <Typography variant="h4" component="h1" gutterBottom sx={{ color: '#2c3e50', fontWeight: 'bold' }}>
              Crear Cuenta
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Únete a nuestra comunidad y ayuda a los animales del refugio.
            </Typography>

            <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField 
                label="Nombre Completo" 
                variant="outlined" 
                fullWidth 
                placeholder="Ej. Juan Pérez"
              />
              <TextField 
                label="Correo Electrónico" 
                type="email" 
                variant="outlined" 
                fullWidth 
                placeholder="ejemplo@correo.com"
              />
              <TextField 
                label="Contraseña" 
                type="password" 
                variant="outlined" 
                fullWidth 
                placeholder="Crea una contraseña segura"
              />
              
              <Button 
                variant="contained" 
                size="large" 
                sx={{ mt: 2, backgroundColor: '#3498db', fontWeight: 'bold', py: 1.5, borderRadius: 2 }}
                disableElevation
              >
                Registrarse
              </Button>
            </Box>

          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

export default RegistroPage;