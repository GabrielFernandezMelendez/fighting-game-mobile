# Historial de diseño

## 2026-11-16 — Inicialización v1.0
- Capturada la línea base del roster existente (`ROSTER.md`).
- Registrada la decisión de **un personaje y una arma fija por combate 1v1**.
- Documentado como **futuro** el combate por equipos de dos personajes, con un arma fija por personaje y mecánicas tag/assist.
- Añadida ficha `AURA.md` v1.0 con A funcional y B artístico; producción/integración pendientes.
- Establecido protocolo de archivo de versiones previas en `history/`.
- **Sin cambios al gameplay.**

## 2026-11-16 — Aura v1.1 (PR de preproducción 3D)
- Versión anterior archivada en [history/AURA-v1.0.md](history/AURA-v1.0.md).
- Se añadió una **vista previa comprimida y reducida** del turnaround aprobado en `images/aura-turnaround-preview.svg`; original de alta resolución aún pendiente de subir.
- Se añadió un script de **blockout no riggeado** de Aura en `tools/bl_aura_blockout.py`.
- Se documentó el uso previsto del cel-shading existente `MeshToonMaterial`; el juego y la simulación permanecen intactos.
- Blender y las validaciones de exportación/rig/móvil siguen pendientes.

## 2026-11-16 — Aura v1.2: visor de detalle V2
- Se archivó la [versión 1.1](history/AURA-v1.1.md).
- Se introdujo una nueva geometría procedural de revisión (pelo, máscara, ropa, correas, botas), conservando comparación con V1 y daga opcional.
- No se modificaron combate ni modelos GLB de producción.
- Requiere revisión visual y rendimiento en navegador antes de considerarlo aprobado.

## Plantilla para revisiones
### FECHA — PERSONAJE vX.Y
- Estado: propuesto / aprobado / implementado
- Motivo y detalles:
- Antes: `history/PERSONAJE-vANTERIOR.md`
- Después: `PERSONAJE.md`
- Impacto en animaciones/balance/network:
- PR, commit y pruebas:
