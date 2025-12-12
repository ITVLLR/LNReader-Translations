# Cómo Publicar Plugins con Traducción en tu Propio Repositorio

Esta guía explica cómo publicar tus plugins con traducción automática en tu propio repositorio de GitHub.

## 📋 Paso 1: Preparar tu Repositorio

### Opción A: Fork del Repositorio Original

1. Ve a [lnreader-plugins](https://github.com/LNReader/lnreader-plugins)
2. Haz clic en "Fork" para crear tu copia
3. Clona tu fork:
   ```bash
   git clone https://github.com/<tu-usuario>/lnreader-plugins.git
   cd lnreader-plugins
   ```

### Opción B: Crear un Repositorio Nuevo

1. Crea un nuevo repositorio en GitHub
2. Clónalo:
   ```bash
   git clone https://github.com/<tu-usuario>/<tu-repo>.git
   cd <tu-repo>
   ```
3. Copia los archivos necesarios del proyecto lnreader-plugins

## 📋 Paso 2: Configurar el Proyecto

```bash
# Instalar dependencias
npm install

# Compilar plugins con traducción
npm run build:full
```

## 📋 Paso 3: Publicar Plugins

### En Windows:

```bash
npm run publish:plugins:windows
```

### En Linux/Mac:

```bash
npm run publish:plugins
```

Este comando:
1. ✅ Compila los plugins
2. ✅ Incluye el código de traducción automáticamente
3. ✅ Genera el manifiesto
4. ✅ Crea una rama `plugins/v3.0.0` (o la versión de package.json)
5. ✅ Sube todo a GitHub

## 📋 Paso 4: Obtener la URL del Repositorio

Después de publicar, tu repositorio estará disponible en:

```
https://raw.githubusercontent.com/<tu-usuario>/<tu-repo>/plugins/v3.0.0/.dist/plugins.min.json
```

**Ejemplo:**
```
https://raw.githubusercontent.com/miusuario/mis-plugins/plugins/v3.0.0/.dist/plugins.min.json
```

## 📋 Paso 5: Usar en LNReader Android

1. **Abre LNReader Android**
2. **Ve a Configuración → Plugins**
3. **Agrega tu repositorio:**
   - Toca el botón "+" o "Agregar repositorio"
   - Pega la URL de tu repositorio
4. **Instala tus plugins** - funcionarán con traducción automática

## 🔧 Configuración Avanzada

### Cambiar la Versión

Edita `package.json`:

```json
{
  "version": "1.0.0"  // Cambia esto
}
```

La rama será `plugins/v1.0.0`

### Personalizar la URL Base

Si usas GitHub Pages o otro hosting, edita `.env`:

```bash
USER_CONTENT_BASE=https://tu-dominio.com
```

### Publicar Manualmente

Si prefieres publicar manualmente:

```bash
# 1. Compilar
npm run build:full

# 2. Crear rama
git checkout --orphan plugins/v3.0.0

# 3. Agregar archivos necesarios
git add .dist .js/src/plugins public/static total.svg

# 4. Commit y push
git commit -m "chore: Publish Plugins"
git push -f origin plugins/v3.0.0
```

## ✅ Verificación

Para verificar que todo funciona:

1. **Abre la URL del manifiesto en el navegador:**
   ```
   https://raw.githubusercontent.com/<usuario>/<repo>/plugins/v3.0.0/.dist/plugins.min.json
   ```
   Deberías ver un JSON con la lista de plugins.

2. **Verifica que el plugin con traducción está incluido:**
   Busca `"id": "example-translated"` en el JSON.

3. **Prueba en LNReader:**
   Agrega el repositorio y verifica que el plugin se carga correctamente.

## 📝 Estructura del Repositorio Publicado

Después de publicar, tu repositorio tendrá:

```
plugins/v3.0.0/
├── .dist/
│   ├── plugins.json          # Manifiesto completo
│   ├── plugins.min.json       # Manifiesto minificado
│   └── translation-standalone.min.js  # Bundle de traducción (opcional)
├── .js/src/plugins/          # Plugins compilados
│   ├── english/
│   ├── spanish/
│   └── ...
└── public/static/             # Iconos y assets
```

## 🎯 Ejemplo Completo

```bash
# 1. Clonar tu repositorio
git clone https://github.com/miusuario/mis-plugins.git
cd mis-plugins

# 2. Instalar dependencias
npm install

# 3. Crear/editar plugins con traducción
# Edita plugins/spanish/mi-novel.ts

# 4. Compilar y publicar
npm run build:full
npm run publish:plugins

# 5. URL resultante:
# https://raw.githubusercontent.com/miusuario/mis-plugins/plugins/v3.0.0/.dist/plugins.min.json
```

## ⚠️ Notas Importantes

- ✅ **Los plugins con traducción** se incluyen automáticamente con el código necesario
- ✅ **No necesitas modificar el APK** de LNReader
- ✅ **Cada plugin es independiente** - incluye su propio código de traducción
- ⚠️ **El repositorio debe ser público** para que LNReader pueda acceder
- ⚠️ **La rama `plugins/v3.0.0`** se crea automáticamente y sobrescribe contenido anterior

## 🚀 Próximos Pasos

1. ✅ Crea tu repositorio en GitHub
2. ✅ Clona y configura el proyecto
3. ✅ Crea tus plugins con traducción
4. ✅ Publica con `npm run publish:plugins`
5. ✅ Usa la URL en LNReader Android

¿Necesitas ayuda con algún paso específico?

