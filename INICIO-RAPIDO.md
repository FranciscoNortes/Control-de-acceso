# 🚀 Inicio Rápido

## 💡 ¿Cómo funciona?

- **10 administradores** tienen acceso al panel para marcar cuando entran/salen
- **37 personas restantes** solo pueden ver si hay algún admin dentro
- 🟢 **Admin marca "Estoy dentro"** → Todos pueden acceder
- 🔴 **Admin marca "He salido"** → Sala cerrada

---

## 1️⃣ Iniciar la aplicación

```bash
# Opción A: Usando el script automático
./start.sh

# Opción B: Manualmente
docker-compose up -d
```

## 2️⃣ Crear el primer administrador

```bash
docker-compose exec sala-control node setup.js
```

Te pedirá un **usuario** y **contraseña**. Ejemplo:
- Usuario: `admin`
- Contraseña: `admin123`

## 3️⃣ Acceder a la aplicación

- **Vista pública**: http://localhost:7000
- **Panel admin**: http://localhost:7000/admin

## 4️⃣ Usar el panel de administración

1. Ve a http://localhost:7000/admin
2. Ingresa con tu usuario y contraseña
3. **Marca "Estoy dentro"** para que los demás puedan acceder
4. **Marca "He salido"** cuando te vayas para cerrar el acceso
5. Crea más administradores si lo necesitas (hasta 10)

## 🛑 Detener la aplicación

```bash
docker-compose down
```

## 📊 Ver logs en tiempo real

```bash
docker-compose logs -f
```

## ⚙️ Personalizar (opcional)

Edita el archivo `.env`:

```bash
nano .env
```

Cambia:
- `ROOM_NAME=Sala Principal` → Nombre de tu sala
- `JWT_SECRET=...` → Una clave secreta segura
- `PORT=3000` → Puerto del servidor

Después reinicia:

```bash
docker-compose restart
```

## 🌐 Acceder desde otros dispositivos

Si quieres que otros dispositivos en tu red accedan:

1. Averigua tu IP local:
   ```bash
   ip addr show | grep "inet " | grep -v 127.0.0.1
   ```

2. Los demás accederán desde:
   - `http://TU_IP:3000` (ejemplo: `http://192.168.1.100:3000`)

## 🔐 ¿Olvidaste tu contraseña?

```bash
docker-compose down
rm database.db
docker-compose up -d
docker-compose exec sala-control node setup.js
```

---

**¡Eso es todo!** 🎉 Tu sistema de control de sala está listo.

¿Necesitas más ayuda? Consulta el **README.md** completo.
