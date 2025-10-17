#!/bin/bash

echo "🚀 Iniciando Sistema de Control de Sala..."
echo ""

# Verificar si Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado. Por favor, instala Docker primero."
    exit 1
fi

# Verificar si docker-compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose no está instalado. Por favor, instala docker-compose primero."
    exit 1
fi

# Crear archivo .env si no existe
if [ ! -f .env ]; then
    echo "📝 Creando archivo .env..."
    cp .env.example .env
    echo "✅ Archivo .env creado. Puedes editarlo para personalizar la configuración."
fi

# Crear directorio para datos
mkdir -p data

# Iniciar contenedores
echo ""
echo "🐳 Iniciando contenedores..."
docker-compose up -d

# Esperar a que el servidor esté listo
echo ""
echo "⏳ Esperando a que el servidor esté listo..."
sleep 3

# Verificar si hay administradores
echo ""
echo "🔍 Verificando si existen administradores..."

if [ ! -f data/database.db ]; then
    echo ""
    echo "📋 No hay administradores configurados."
    echo "   Ejecuta el siguiente comando para crear uno:"
    echo ""
    echo "   docker-compose exec sala-control node setup.js"
    echo ""
else
    echo "✅ Base de datos encontrada"
fi

echo ""
echo "✨ ¡Sistema iniciado exitosamente!"
echo ""
echo "📍 Accesos:"
echo "   - Vista pública: http://localhost:7000"
echo "   - Panel admin:   http://localhost:7000/admin"
echo ""
echo "📚 Comandos útiles:"
echo "   - Ver logs:              docker-compose logs -f"
echo "   - Detener:               docker-compose down"
echo "   - Crear administrador:   docker-compose exec sala-control node setup.js"
echo ""
