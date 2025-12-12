# Guía: Hacer Fork y Configurar tu Repositorio

## 🌐 Paso 1: Hacer Fork desde GitHub (Web)

1. **Ve a:** https://github.com/LNReader/lnreader-plugins
2. **Haz clic en el botón "Fork"** (arriba a la derecha)
3. **Selecciona tu cuenta** de GitHub
4. **Espera** a que se complete el fork (puede tardar unos minutos)

## 🔧 Paso 2: Configurar Git Local

Después de hacer el fork, necesitas cambiar el remoto para apuntar a tu fork:

### Obtener tu URL de Fork

Tu URL será:
```
https://github.com/<tu-usuario>/lnreader-plugins.git
```

### Cambiar el Remoto

```bash
# Ver remoto actual
git remote -v

# Cambiar a tu fork
git remote set-url origin https://github.com/<tu-usuario>/lnreader-plugins.git

# Verificar
git remote -v
```

## 📝 Paso 3: Configurar Usuario de Git (si es necesario)

```bash
# Configurar tu nombre
git config user.name "Tu Nombre"

# Configurar tu email
git config user.email "tu-email@ejemplo.com"

# O configurar globalmente
git config --global user.name "Tu Nombre"
git config --global user.email "tu-email@ejemplo.com"
```

## 💾 Paso 4: Guardar tus Cambios

```bash
# Agregar todos los cambios
git add .

# Hacer commit
git commit -m "feat: Add translation system with automatic bundling"

# Subir a tu fork
git push origin master
```

## ✅ Paso 5: Verificar

Ve a tu repositorio en GitHub:
```
https://github.com/<tu-usuario>/lnreader-plugins
```

Deberías ver todos tus cambios ahí.

## 🚀 Paso 6: Publicar Plugins

Una vez configurado, puedes publicar:

```bash
npm run publish:plugins:windows
```

Esto creará la rama `plugins/v3.0.0` en tu fork.

## 📋 Tu URL de Plugins

Después de publicar, tu URL será:

```
https://raw.githubusercontent.com/<tu-usuario>/lnreader-plugins/plugins/v3.0.0/.dist/plugins.min.json
```

## 🔄 Mantener Sincronizado con el Original

Si quieres mantener tu fork actualizado con el repositorio original:

```bash
# Agregar el original como "upstream"
git remote add upstream https://github.com/LNReader/lnreader-plugins.git

# Traer cambios del original
git fetch upstream

# Fusionar cambios
git merge upstream/master

# Subir a tu fork
git push origin master
```

