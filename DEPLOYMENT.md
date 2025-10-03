# Guía de Despliegue

## Backend en Railway

### 1. Preparación
- Asegúrate de que tu base de datos MongoDB esté funcionando en la nube
- Ten listas las variables de entorno

### 2. Variables de entorno en Railway
Configura estas variables en el panel de Railway:

```
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/colegios_db
DB_NAME=colegios_db
JWT_SECRET=tu-super-secreto-jwt-aqui
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=tu-refresh-secret-aqui
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=production
CORS_ORIGIN=https://tu-frontend.vercel.app
CORS_CREDENTIALS=true
BCRYPT_ROUNDS=12
MAX_FILE_SIZE=10485760
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
UPLOAD_PATH=./uploads
```

### 3. Despliegue
1. Conecta tu repositorio a Railway
2. Selecciona la carpeta `backend` como directorio raíz
3. Railway detectará automáticamente que es un proyecto Node.js
4. Las variables de entorno se configurarán automáticamente

## Frontend en Vercel

### 1. Variables de entorno en Vercel
Configura esta variable en el panel de Vercel:

```
VITE_API_URL=https://tu-backend.railway.app/api
```

### 2. Despliegue
1. Conecta tu repositorio a Vercel
2. Vercel detectará automáticamente que es un proyecto Vite
3. Configura la variable de entorno `VITE_API_URL` con la URL de tu backend en Railway

## Verificación

### Backend
- Verifica que el endpoint `/health` responda correctamente
- Revisa los logs en Railway para asegurar que no hay errores

### Frontend
- Verifica que la aplicación se carga correctamente
- Revisa la consola del navegador para errores de CORS
- Prueba el login y las funcionalidades principales

## Troubleshooting

### Error de CORS
Si tienes errores de CORS, verifica que:
1. La variable `CORS_ORIGIN` en Railway incluya tu dominio de Vercel
2. La variable `CORS_CREDENTIALS` esté en `true`

### Error de conexión a la base de datos
1. Verifica que `MONGODB_URI` sea correcta
2. Asegúrate de que la base de datos permita conexiones desde Railway

### Error de JWT
1. Verifica que `JWT_SECRET` esté configurado
2. Asegúrate de que sea lo suficientemente complejo
