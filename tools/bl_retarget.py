# Retarget de Universal Animation Library 1 y 2 (Quaternius, CC0) al esqueleto
# compartido de "RPG Characters" (Quaternius, CC0). Exporta:
#   anims.glb  -> solo esqueleto + clips retargeteados
#   <char>.glb -> malla + esqueleto de cada personaje, sin arma ni animaciones
import bpy, sys, os
RAW = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets_raw")
from mathutils import Matrix, Vector, Quaternion

RPG = f"{RAW}/rpg/RPG Characters - Nov 2020/Blends"
SRC = [
  (f"{RAW}/ual1/Animation Library[Standard]/Godot/AnimationLibrary_Godot_Standard.glb",
   ["Idle_Loop", "Walk_Loop", "Crouch_Idle_Loop", "Jump_Start", "Jump_Loop", "Jump_Land", "Hit_Chest", "Hit_Head",
    "Death01", "Punch_Jab", "Punch_Cross", "Punch_Enter", "Roll", "Sword_Attack", "Sword_Idle", "Spell_Simple_Shoot", "Interact"]),
  (f"{RAW}/ual/Universal Animation Library 2 [Standard]/Unreal-Godot/UAL2_Standard.glb",
   ["Hit_Knockback", "LayToIdle", "Melee_Hook", "Melee_Hook_Rec", "NinjaJump_Start", "NinjaJump_Idle_Loop", "NinjaJump_Land",
    "OverhandThrow", "Shield_Dash_RM", "Shield_OneShot", "Slide_Start", "Slide_Loop", "Slide_Exit", "Sword_Block", "Sword_Dash_RM",
    "Sword_Regular_A", "Sword_Regular_A_Rec", "Sword_Regular_B", "Sword_Regular_B_Rec", "Sword_Regular_C", "Sword_Regular_Combo",
    "TreeChopping_Loop", "Yes", "Idle_Shield_Loop", "Idle_FoldArms_Loop", "Zombie_Scratch", "Idle_Shield_Break"]),
]
OUT = sys.argv[-1]
os.makedirs(OUT, exist_ok=True)

# destino <- (origen, hijo origen para la dirección, hijo destino para la dirección)  (None = sin alinear)
MAP = {
  'Body': ('pelvis', None, None), 'Hips': ('spine_01', None, None), 'Abdomen': ('spine_02', None, None),
  'Torso': ('spine_03', None, None), 'Neck': ('neck_01', None, None), 'Head': ('Head', None, None),
}
for s, S in (('L', 'l'), ('R', 'r')):
  MAP.update({
    f'Shoulder.{s}': (f'clavicle_{S}', f'upperarm_{S}', f'UpperArm.{s}'),
    f'UpperArm.{s}': (f'upperarm_{S}', f'lowerarm_{S}', f'LowerArm.{s}'),
    f'LowerArm.{s}': (f'lowerarm_{S}', f'hand_{S}', f'Fist.{s}'),
    f'Fist.{s}': (f'hand_{S}', f'middle_01_{S}', f'Fist1.{s}'),
    f'UpperLeg.{s}': (f'thigh_{S}', f'calf_{S}', f'LowerLeg.{s}'),
    f'LowerLeg.{s}': (f'calf_{S}', f'foot_{S}', None),       # hacia la cola (tobillo)
    f'Foot.{s}': (f'foot_{S}', f'ball_{S}', None),
  })

bpy.ops.wm.open_mainfile(filepath=f"{RPG}/Warrior.blend")
scene = bpy.context.scene
tgt = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
for pb in tgt.pose.bones:
  for c in list(pb.constraints): pb.constraints.remove(c)      # sin IK: todo FK horneado
  pb.rotation_mode = 'QUATERNION'
if tgt.animation_data: tgt.animation_data.action = None
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
TB = tgt.data.bones
order = []
def walk(b):
  order.append(b.name)
  for c in b.children: walk(c)
for b in TB:
  if b.parent is None: walk(b)
order = [n for n in order if not n.startswith('Foot.')] + ['Foot.L', 'Foot.R']

def tdir(name, child):
  b = TB[name]
  return ((TB[child].head_local if child else b.tail_local) - b.head_local).normalized()

def retarget_file(path, clips):
  before = set(bpy.data.objects)
  bpy.ops.import_scene.gltf(filepath=path)
  new = [o for o in bpy.data.objects if o not in before]
  src = [o for o in new if o.type == 'ARMATURE'][0]
  SB0 = src.data.bones
  RIG = {'pelvis': 'DEF-hips', 'spine_01': 'DEF-spine.001', 'spine_02': 'DEF-spine.002', 'spine_03': 'DEF-spine.003',
         'neck_01': 'DEF-neck', 'Head': 'DEF-head'}
  for S, X in (('l', 'L'), ('r', 'R')):
    RIG.update({f'clavicle_{S}': f'DEF-shoulder.{X}', f'upperarm_{S}': f'DEF-upper_arm.{X}', f'lowerarm_{S}': f'DEF-forearm.{X}',
                f'hand_{S}': f'DEF-hand.{X}', f'middle_01_{S}': f'DEF-f_middle.01.{X}', f'thigh_{S}': f'DEF-thigh.{X}',
                f'calf_{S}': f'DEF-shin.{X}', f'foot_{S}': f'DEF-foot.{X}', f'ball_{S}': f'DEF-toe.{X}'})
  rigify = 'DEF-hips' in SB0
  N = (lambda n: RIG.get(n, n)) if rigify else (lambda n: n)
  class _SB:
    def __getitem__(self, n): return SB0[N(n)]
    def keys(self): return list(RIG.keys()) + ['root'] if rigify else SB0.keys()
  SB = _SB()
  srest = {n: SB[n].matrix_local.copy() for n in SB.keys()}
  def sdir_rest(n, child):
    return (SB[child].head_local - SB[n].head_local).normalized()
  # alineación de reposo (swing) para extremidades
  C = {}
  for t, (s, sc, tc) in MAP.items():
    if sc is None: C[t] = Matrix.Identity(3); continue
    C[t] = tdir(t, tc).rotation_difference(sdir_rest(s, sc)).to_matrix()
  # escala por longitud de pierna
  sl = (SB['thigh_l'].head_local - SB['foot_l'].head_local).length
  tl = (TB['UpperLeg.L'].head_local - TB['Foot.L'].head_local).length
  ratio = tl / sl
  p_rest = SB['pelvis'].head_local.copy()
  body_rest = TB['Body'].head_local.copy()
  acts = {a.name: a for a in bpy.data.actions}
  if not src.animation_data: src.animation_data_create()
  for clip in clips:
    act = acts.get(clip)
    if act is None: print('FALTA', clip); continue
    src.animation_data.action = act
    try:
      if hasattr(src.animation_data, 'action_slot') and act.slots: src.animation_data.action_slot = act.slots[0]
    except Exception as e: print('slot', e)
    f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
    out = bpy.data.actions.new(clip); out.use_fake_user = True
    tgt.animation_data_create(); tgt.animation_data.action = out
    for f in range(f0, f1 + 1):
      scene.frame_set(f)
      SP = {n: src.pose.bones[N(n)].matrix.copy() for n in SB.keys()}
      arm = {}
      for name in order:
        b = TB[name]; pb = tgt.pose.bones[name]
        rel = (b.parent.matrix_local.inverted() @ b.matrix_local) if b.parent else b.matrix_local.copy()
        parent_m = arm[b.parent.name] if b.parent else Matrix.Identity(4)
        base = parent_m @ rel                          # pose si basis = identidad
        if name in MAP:
          s = MAP[name][0]
          delta = SP[s].to_3x3() @ srest[s].to_3x3().inverted()
          R = delta @ C[name] @ b.matrix_local.to_3x3()
          pos = base.translation.copy()
          if name == 'Body':
            P = SP['pelvis'].translation; Rt = SP['root'].translation
            off = Vector((P.x - Rt.x - p_rest.x, P.y - Rt.y - p_rest.y, P.z - p_rest.z)) * ratio
            pos = body_rest + off
          if name.startswith('Foot.'):
            ll = arm['LowerLeg.' + name[-1]]
            pos = ll @ Vector((0, TB['LowerLeg.' + name[-1]].length, 0))
          M = Matrix.Translation(pos) @ R.to_4x4()
        else:
          M = base
        arm[name] = M
        basis = base.inverted() @ M
        loc, rot, _ = basis.decompose()
        pb.location = loc; pb.rotation_quaternion = rot; pb.scale = (1, 1, 1)
        pb.keyframe_insert('location', frame=f - f0); pb.keyframe_insert('rotation_quaternion', frame=f - f0)
    print('OK', clip, f1 - f0 + 1)
  # limpiar origen
  for o in new: bpy.data.objects.remove(o, do_unlink=True)
  for a in list(bpy.data.actions):
    if not a.use_fake_user: bpy.data.actions.remove(a)

for path, clips in SRC: retarget_file(path, clips)
tgt.animation_data.action = None
for pb in tgt.pose.bones: pb.location = (0, 0, 0); pb.rotation_quaternion = (1, 0, 0, 0)

# ---- anims.glb: esqueleto sin mallas
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
for o in meshes: o.hide_set(False)
bpy.ops.object.select_all(action='DESELECT'); tgt.select_set(True); bpy.context.view_layer.objects.active = tgt
# NLA: una pista por acción para que el exportador las incluya todas
for tr in list(tgt.animation_data.nla_tracks): tgt.animation_data.nla_tracks.remove(tr)
for a in list(bpy.data.actions):
  if 'Stash' in a.name: bpy.data.actions.remove(a)
for a in bpy.data.actions: a.name = a.name.split('.')[0]
print('ACTS', [(a.name, len(a.fcurves) if hasattr(a,'fcurves') else '?', [sl.identifier for sl in a.slots] if hasattr(a,'slots') else '') for a in bpy.data.actions][:4])
bpy.ops.export_scene.gltf(filepath=f"{OUT}/anims.glb", use_selection=True, export_animations=True,
  export_animation_mode='ACTIONS', export_force_sampling=True, export_frame_step=1, export_skins=True,
  export_def_bones=False, export_optimize_animation_size=True, export_yup=True)
print('ANIMS OK')
