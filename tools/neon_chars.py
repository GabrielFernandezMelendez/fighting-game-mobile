"""Configuración por personaje del pipeline 3D de NEÓN (F3 color plano → F2b malla → F5 rig).

Cada personaje define:
  palette  — colores para CLASIFICAR la proyección en zonas (medidos en la lámina; pueden ser algo oscuros)
  display  — colores FINALES de cada zona en el juego (muestras de la paleta de materiales de la lámina)
  slots    — materiales del GLB; el nombre elige el preset de cel-shading en models.js (CEL_PRESETS)
  group    — zona → material (las que no estén van al primer material)
Las reglas de zona (qué color puede ir en qué parte del cuerpo) están en tools/bl_aura_flatcolor.py.
Máximo 16 zonas (se codifican como (zona+0,5)/16).
Uso: CHAR=sombra python tools/bl_aura_flatcolor.py …   (por defecto CHAR=aura)
"""
import os

CHARS = {
  'aura': {
    'palette': [
      ('chaqueta', '#E8DACB'), ('pantalon', '#8E7686'), ('gris', '#776471'), ('grafito', '#3B313E'),
      ('negro', '#1B171F'), ('naranja', '#FF7A1A'), ('pelo', '#E3D9EE'), ('mascara', '#D5CFD3'),
      ('piel', '#E2B39E'), ('metal', '#A6A1AA'),
    ],
    'display': {
      'chaqueta': '#E7C6B3', 'pantalon': '#8F6E89', 'gris': '#91888E', 'grafito': '#342D3A', 'negro': '#1E1A24',
      'naranja': '#FD7A02', 'pelo': '#DCCBF0', 'mascara': '#D8D0D6', 'piel': '#E7B49E', 'metal': '#B3ABB4',
    },
    'slots': ['Aura_ropa', 'Aura_pelo', 'Aura_mascara', 'Aura_piel'],
    'group': {'pelo': 'Aura_pelo', 'mascara': 'Aura_mascara', 'piel': 'Aura_piel'},
  },
  'sombra': {
    # lámina "NEÓN / SOMBRA — hoja de modelo": tela borgoña, granate, carmesí, cuero, vendas, metal
    'palette': [
      ('capucha', '#9A1F3D'), ('tela', '#5A253A'), ('granate', '#3E1828'), ('carmesi', '#C21C44'),
      ('cuero', '#5E3C34'), ('correa', '#9C8070'), ('vendas', '#CCAAA2'), ('piel', '#A06A55'),
      ('grafito', '#2C2229'), ('negro', '#0E0A0E'), ('metal', '#8E8590'),
    ],
    'display': {
      'capucha': '#A3203F', 'tela': '#6A2843', 'granate': '#4B1E30', 'carmesi': '#D41F49', 'cuero': '#6B4438',
      'correa': '#A88C78', 'vendas': '#D9BBAE', 'piel': '#B47A5E', 'grafito': '#33262E', 'negro': '#0F0B10',
      'metal': '#A39AA3',
    },
    'slots': ['Sombra_ropa', 'Sombra_piel', 'Sombra_capucha'],
    'group': {'piel': 'Sombra_piel', 'vendas': 'Sombra_piel', 'capucha': 'Sombra_capucha'},
  },
}

def get(name=None):
    name = name or os.environ.get('CHAR', 'aura')
    c = dict(CHARS[name]); c['name'] = name
    c['names'] = [n for n, _ in c['palette']]
    return c
