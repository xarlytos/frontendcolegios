import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/database';
import authRoutes from './routes/authRoutes';
import contactosRoutes from './routes/contactosRoutes';
import estadisticasRoutes from './routes/estadisticasRoutes';
import usuariosRoutes from './routes/usuariosRoutes';
import universidadesRoutes from './routes/universidadesRoutes';
import titulacionesRoutes from './routes/titulacionesRoutes';
import graduacionesRoutes from './routes/graduacionesRoutes';
import configuracionRoutes from './routes/configuracionRoutes';
import { errorHandler } from './middleware/errorHandler';
import { authenticateToken } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configuración de CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log de todas las peticiones
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path} - Body:`, req.body);
  next();
});

// Conectar a la base de datos
connectDB();

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Rutas públicas
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);

// Rutas protegidas (aplicar middleware individualmente)
app.use('/api/contactos', authenticateToken, contactosRoutes);
app.use('/api/estadisticas', authenticateToken, estadisticasRoutes);
app.use('/api/universidades', authenticateToken, universidadesRoutes);
app.use('/api/titulaciones', authenticateToken, titulacionesRoutes);
app.use('/api/graduaciones', authenticateToken, graduacionesRoutes);
app.use('/api/configuracion', authenticateToken, configuracionRoutes);


// Middleware de manejo de errores
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 API base: http://localhost:${PORT}/api`);
}).on('error', (error: any) => {
  console.error('❌ Error iniciando servidor:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Puerto ${PORT} ya está en uso`);
  }
});

export default app;