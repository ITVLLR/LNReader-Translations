# Guía Rápida: Publicar en tu Repositorio

## 🚀 Pasos Rápidos

### 1. Preparar tu Repositorio

```bash
# Si haces fork:
git clone https://github.com/<tu-usuario>/lnreader-plugins.git
cd lnreader-plugins

# O crea un repo nuevo y copia los archivos
```

### 2. Configurar Git (si es necesario)

```bash
# Verificar remoto
git remote -v

# Si necesitas cambiar el remoto:
git remote set-url origin https://github.com/<tu-usuario>/<tu-repo>.git
```

### 3. Instalar Dependencias

```bash
npm install
```

### 4. Publicar Plugins

**En Windows:**
```bash
npm run publish:plugins:windows
```

**En Linux/Mac:**
```bash
npm run publish:plugins
```

Este comando automáticamente:
- ✅ Compila los plugins
- ✅ Incluye código de traducción en plugins que lo usan
- ✅ Genera el manifiesto
- ✅ Crea la rama `plugins/v3.0.0`
- ✅ Sube todo a GitHub

### 5. Obtener la URL

Después de publicar, tu URL será:

```
https://raw.githubusercontent.com/<tu-usuario>/<tu-repo>/plugins/v3.0.0/.dist/plugins.min.json
```

**Ejemplo:**
```
https://raw.githubusercontent.com/juan123/mis-plugins/plugins/v3.0.0/.dist/plugins.min.json
```

### 6. Usar en LNReader

1. Abre LNReader Android
2. Ve a **Configuración → Plugins**
3. Agrega tu repositorio con la URL de arriba
4. Instala tus plugins - funcionarán con traducción automática

## ✅ Verificación

Abre esta URL en tu navegador para verificar:
```
https://raw.githubusercontent.com/<usuario>/<repo>/plugins/v3.0.0/.dist/plugins.min.json
```

Deberías ver un JSON con tus plugins listados.

## 📝 Notas Importantes

- ✅ El repositorio debe ser **público** para que LNReader pueda acceder
- ✅ La rama `plugins/v3.0.0` se crea automáticamente
- ✅ Los plugins con traducción incluyen el código automáticamente
- ✅ No necesitas modificar el APK de LNReader

## 🔄 Actualizar Plugins

Cuando hagas cambios:

```bash
# 1. Edita tus plugins
# 2. Publica de nuevo
npm run publish:plugins:windows  # o publish:plugins en Linux/Mac
```

Los cambios se actualizarán automáticamente en la rama de plugins.

## 🎯 Ejemplo Completo

```bash
# 1. Clonar
git clone https://github.com/miusuario/mis-plugins.git
cd mis-plugins

# 2. Instalar
npm install

# 3. Crear plugin con traducción
# Edita: plugins/spanish/mi-novel.ts
# Con: import { translateChapter } from '@libs/translation';

# 4. Publicar
npm run publish:plugins:windows

# 5. URL resultante:
# https://raw.githubusercontent.com/miusuario/mis-plugins/plugins/v3.0.0/.dist/plugins.min.json

# 6. Usar en LNReader Android con esa URL
```

¡Listo! 🎉

