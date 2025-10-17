FROM node:18-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar el resto de la aplicación
COPY . .

# Crear directorio para la base de datos
RUN mkdir -p /app/data

# Exponer puerto
EXPOSE 7000

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=7000

# Comando de inicio
CMD ["node", "server.js"]
