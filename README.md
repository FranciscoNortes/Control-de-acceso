# 🚪 Sistema de Control de Acceso a Sala

Sistema web para gestionar el acceso a una sala compartida. Los administradores indican cuándo están dentro de la sala, permitiendo que las demás personas puedan acceder también.

## 💡 Funcionamiento

- 🟢 **Administrador marca "Estoy dentro"** → Todos los demás pueden acceder a la sala
- 🔴 **Administrador marca "He salido"** → La sala queda cerrada para los demás

## ✨ Características

- Vista pública con actualización automática (5 segundos)
- Panel de administración protegido con login
- Gestión de administradores (crear/eliminar)
- Diseño responsive (móvil, tablet, desktop)
- Despliegue fácil con Docker

## 🚀 Inicio Rápido

```bash
# 1. Iniciar
./start.sh

# 2. Crear administrador
docker-compose exec sala-control node setup.js

# 3. Acceder
# Vista pública: http://localhost:7000
# Panel admin: http://localhost:7000/admin
```

## ⚙️ Configuración

Edita `.env` para personalizar:
```bash
PORT=7000
ROOM_NAME=Sala Principal
JWT_SECRET=clave_secreta
```

## 📁 Estructura

```
├── server.js          # Backend (Express + SQLite)
├── setup.js           # Script para crear admins
├── public/
│   ├── index.html     # Vista pública
│   └── admin.html     # Panel admin
├── data/              # Base de datos
├── docker-compose.yml # Configuración Docker
└── start.sh           # Script de inicio
```

## 🔧 Comandos Útiles

```bash
# Ver logs
docker-compose logs -f

# Reiniciar
docker-compose restart

# Detener
docker-compose down

# Crear admin
docker-compose exec sala-control node setup.js

# Backup
tar -czf backup-$(date +%Y%m%d).tar.gz data/
```

## 🌐 Acceso Remoto

Para acceder desde otros dispositivos en tu red:

1. Obtén tu IP local:
   ```bash
   ip addr show | grep "inet " | grep -v 127.0.0.1
   ```

2. Accede desde otros dispositivos:
   ```
   http://TU_IP:7000
   ```

## 🔒 Seguridad

1. **Cambia JWT_SECRET** en `.env`
2. **Usa HTTPS** en producción
3. **Haz backups** del directorio `data/`

## 🐛 Solución de Problemas

**El contenedor no inicia:**
```bash
docker-compose logs sala-control
```

**Olvidé mi contraseña:**
```bash
docker-compose down
rm -rf data/database.db
docker-compose up -d
docker-compose exec sala-control node setup.js
```

## 📊 API REST

### Públicos
- `GET /api/status`

### Protegidos
- `POST /api/login`
- `POST /api/logout`
- `POST /api/occupy`
- `POST /api/release`
- `GET /api/admins`
- `POST /api/admins`
- `DELETE /api/admins/:id`

## 📝 Licencia

MIT
