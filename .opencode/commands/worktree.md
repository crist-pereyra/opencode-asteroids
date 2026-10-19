---
description: Crea un worktree a partir del contexto indicado
---

Analiza el argumento completo, aunque contenga espacios, y deduce un nombre
breve y descriptivo para el worktree en kebab-case, usando solo letras
minúsculas ASCII, números y guiones.

Ejecuta exclusivamente este comando, reemplazando `<nombre>` por el nombre
deducido:

git worktree add .worktrees/<nombre>

No ejecutes otros comandos, no cambies de directorio ni hagas nada adicional.
Si el comando falla, informa del error sin intentar corregirlo.

Si los argumentos son muy largos, simplifícalos a un nombre significativo. 

Argumento: $ARGUMENTS
