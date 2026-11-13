"""Original Blender build script. Input graphical assets are MakeHuman CC0, pinned
and documented in web/assets/avatar-source/README.md. No MakeHuman program code.
Run: blender --background --python web/scripts/build-avatar-model.py
"""
import bpy, bmesh, json, math, random
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'web/assets/avatar-source'
OUTPUT = ROOT / 'web/public/avatars/gcina-v2.glb'
SCALE = 0.25
random.seed(42)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

vertices, faces, uv, face_uv = [], [], [], []
group = ''
for line in (SOURCE / 'base.obj').read_text().splitlines():
    if line.startswith('v '): vertices.append(Vector(tuple(map(float, line.split()[1:4]))))
    elif line.startswith('vt '): uv.append(tuple(map(float, line.split()[1:3])))
    elif line.startswith('g '): group = line[2:]
    elif line.startswith('f ') and group == 'body':
        terms = [term.split('/') for term in line.split()[1:]]
        faces.append([int(t[0])-1 for t in terms]); face_uv.append([int(t[1])-1 for t in terms])
for line in (SOURCE / 'african-female-young.target').read_text().splitlines():
    if line and not line.startswith('#'):
        index, *delta = line.split(); vertices[int(index)] += Vector(tuple(map(float, delta)))
# A small authored smile, while preserving the anatomical lip surface.
for v in vertices:
    if v.z > 1.20 and 6.5 < v.y < 7.15:
        v.y += 0.075 * math.exp(-((abs(v.x)-0.24)/0.10)**2 - ((v.y-6.83)/0.13)**2)

skel = json.loads((SOURCE / 'default.mhskel').read_text())
weights = json.loads((SOURCE / 'default_weights.mhw').read_text())['weights']
positions = {name: sum((vertices[i] for i in ids), Vector()) / len(ids) for name, ids in skel['joints'].items()}
# Spread forearm twist continuously along the radius/ulna region. The source
# half-forearm weights otherwise produce a visible band under palm-facing poses.
per_vertex=[{} for _ in vertices]
for name,items in weights.items():
    for index,value in items:per_vertex[index][name]=value
for side in ['L','R']:
    first,second=f'lowerarm01.{side}',f'lowerarm02.{side}'
    start=positions[skel['bones'][first]['head']]
    end=positions[skel['bones'][f'wrist.{side}']['head']]
    direction=end-start;length=direction.length_squared
    for i,influences in enumerate(per_vertex):
        total=influences.get(first,0)+influences.get(second,0)
        if total<.01:continue
        t=min(1,max(0,(vertices[i]-start).dot(direction)/length))
        t=t*t*(3-2*t)
        influences[first]=total*(1-t);influences[second]=total*t
weights={name:[] for name in weights}
for i,influences in enumerate(per_vertex):
    for name,value in influences.items():
        if value>.000001:weights[name].append((i,value))
def xyz(v): return Vector((v[0]*SCALE, -v[2]*SCALE, v[1]*SCALE))
def rgb(hexcode):
    raw = [int(hexcode[i:i+2],16)/255 for i in (0,2,4)]
    return [v/12.92 if v<=0.04045 else ((v+0.055)/1.055)**2.4 for v in raw]
def material(name, color, roughness=.6, metallic=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*rgb(color),1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb(color),1)
    p.inputs['Roughness'].default_value=roughness;p.inputs['Metallic'].default_value=metallic
    return m
skin=material('Skin · warm brown','a66c50',.68)
lips=material('Lips · natural rose brown','8d5248',.56)
inside=material('Mouth interior','351c1b',.88)
shirt=material('Gcina teal · woven uniform','087a73',.86)
trim=material('Collar and cuffs','075e59',.85)
stitch=material('Fine teal stitching','46a29a',.85)
hair=material('Hair · espresso coils','211814',.86)
hair_light=material('Hair · strand highlights','281c17',.86)
whites=material('Eye sclera','e2d9cb',.35)
iris=material('Iris · chestnut','4c3020',.3)
pupil=material('Pupil','111716',.18)
teeth=material('Teeth · ivory','dfd5bc',.42)
gold=material('Warm brushed metal','bfa16c',.3,.65)

arm_data=bpy.data.armatures.new('Gcina anatomical skeleton')
arm=bpy.data.objects.new('GcinaRig',arm_data);bpy.context.collection.objects.link(arm)
bpy.context.view_layer.objects.active=arm;arm.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
for name,b in skel['bones'].items():
    bone=arm_data.edit_bones.new(name);bone.head=xyz(positions[b['head']]);bone.tail=xyz(positions[b['tail']])
    if (bone.tail-bone.head).length < .0001: bone.tail.z+=.01
    plane=skel['planes'].get(b['rotation_plane'])
    if plane:
        a,c,d=[xyz(positions[p]) for p in plane]
        normal=(c-a).cross(d-a)
        if normal.length>.000001: bone.align_roll(normal.normalized())
for name,b in skel['bones'].items():
    if b['parent']: arm_data.edit_bones[name].parent=arm_data.edit_bones[b['parent']]
bpy.ops.object.mode_set(mode='OBJECT');arm.select_set(False)

# A single weighted skin surface prevents cracks at wrists and knuckles. The
# garment is shaped with extra ease over the torso, with a smooth clipped hem.
def garment(v):
    return v.y < 6.05 and (abs(v.x) < 1.65 or (v.y > 3.95 and abs(v.x) < 2.78))
used=sorted({i for f in faces for i in f if vertices[i].y > .38})
allowed=set(used)
selected=[f for f in faces if all(i in allowed for i in f)]
used=sorted({i for f in selected for i in f});remap={v:i for i,v in enumerate(used)}
coords=[]
for i in used:
    v=vertices[i].copy()
    if garment(v):
        v.x*=1.045
        if abs(v.x)<1.72:
            if v.z>.15:
                # Flat fabric front, independent of breast/nipple topology.
                blend=min(1,max(0,(5.65-v.y)/.6))
                blend*=min(1,max(0,(v.z-.15)/.35))
                v.z=v.z*(1-blend)+1.35*math.sqrt(max(.12,1-(v.x/1.95)**2))*blend
            else:v.z-=.09
        else:v.z+=.08 if v.z>.1 else -.08
    if v.y<.7:v.y=.5
    coords.append(xyz(v))
mesh=bpy.data.meshes.new('Continuous anatomical surface');mesh.from_pydata(coords,[],[[remap[i] for i in f] for f in selected]);mesh.update()
body=bpy.data.objects.new('Gcina skin and tailored uniform',mesh);bpy.context.collection.objects.link(body)
for m in [skin,shirt]:mesh.materials.append(m)
for polygon,f in zip(mesh.polygons,selected):
    polygon.use_smooth=True
    polygon.material_index=1 if garment(sum((vertices[i] for i in f),Vector())/len(f)) else 0
for bone,items in weights.items():
    vg=body.vertex_groups.new(name=bone)
    for old,w in items:
        if old in remap:vg.add([remap[old]],w,'REPLACE')
bpy.context.view_layer.objects.active=body;body.select_set(True)
sub=body.modifiers.new('Anatomical smoothing','SUBSURF');sub.levels=1;bpy.ops.object.modifier_apply(modifier=sub.name)
# Decimation preserves joint weights and the smoothed hand silhouettes.
dec=body.modifiers.new('Mobile mesh budget','DECIMATE');dec.ratio=.70;dec.delimit={'MATERIAL'};bpy.ops.object.modifier_apply(modifier=dec.name)
# Cut exact collar/cuff seams across the smoothed mesh. BMesh interpolation
# preserves skinning weights, so no duplicate edge or skin/cloth crack is added.
bm=bmesh.new();bm.from_mesh(body.data)
for point,normal in [((0,0,6.05*SCALE),(0,0,1)),((2.3*SCALE,0,4.45*SCALE),(.65,0,-.76)),((-2.3*SCALE,0,4.45*SCALE),(-.65,0,-.76))]:
    bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.00001,plane_co=point,plane_no=normal)
for f in bm.faces:
    c=f.calc_center_median();x,y,z=c.x/SCALE,c.z/SCALE,-c.y/SCALE
    # The widened hips can extend past the torso cutoff at the hem. Keep the
    # entire lower edge covered while leaving the hands outside the shirt.
    hem=y<.88 and abs(x)<2.4
    uniform=y<6.05 and (abs(x)<1.7 or ((abs(x)-2.3)*.65-(y-4.45)*.76<0))
    f.material_index=1 if hem or uniform else 0
bm.to_mesh(body.data);bm.free()
# Smooth tint across the lip surface, avoiding polygon-shaped material borders.
colors=body.data.color_attributes.new(name='Complexion',type='FLOAT_COLOR',domain='CORNER')
for polygon in body.data.polygons:
    for li in polygon.loop_indices:
        v=body.data.vertices[body.data.loops[li].vertex_index]
        x,y,z=v.co.x/SCALE,v.co.z/SCALE,-v.co.y/SCALE
        lip=math.exp(-((x/.26)**6)-((y-6.84)/.115)**4)*min(1,max(0,(z-1.30)/.09))
        tint=[a*(1-lip*.60)+b*lip*.60 for a,b in zip(rgb('a66c50'),rgb('875143'))] if polygon.material_index==0 else [1,1,1]
        cavity=math.exp(-((x/.29)**8)-((y-6.86)/.115)**8)*min(1,max(0,(1.41-z)/.035))*min(1,max(0,(z-.6)/.2)) if polygon.material_index==0 else 0
        tint=[a*(1-cavity)+b*cavity for a,b in zip(tint,rgb('39201d'))]
        colors.data[li].color=(*tint,1)
nodes=skin.node_tree.nodes;attribute=nodes.new('ShaderNodeVertexColor');attribute.layer_name='Complexion'
skin.node_tree.links.new(attribute.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color'])
bpy.ops.object.vertex_group_limit_total(limit=4)
mod=body.modifiers.new('Skinning','ARMATURE');mod.object=arm;body.parent=arm;body.select_set(False)

# Accessories use single-bone skinning, so exported GLB transforms stay explicit.
def bind(obj,bone):
    vg=obj.vertex_groups.new(name=bone);vg.add(list(range(len(obj.data.vertices))),1,'REPLACE')
    mod=obj.modifiers.new('Skinning','ARMATURE');mod.object=arm;obj.parent=arm
    return obj

def sphere(name, center, scale, mat, bone='head', segments=24, rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=xyz(center))
    obj=bpy.context.object;obj.name=name;obj.scale=(scale[0]*SCALE,scale[2]*SCALE,scale[1]*SCALE)
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    obj.data.materials.append(mat)
    for poly in obj.data.polygons:poly.use_smooth=True
    bind(obj,bone);obj.select_set(False);return obj

def tube(name, points, radius, mat, bone='head'):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=3 if name.startswith('Brow.') else 1
    curve.bevel_depth=radius*SCALE;curve.bevel_resolution=1
    spline=curve.splines.new('NURBS');spline.points.add(len(points)-1)
    for i,(p,v) in enumerate(zip(spline.points,points)):
        p.co=(*xyz(v),1)
        if name.startswith('Brow.'):p.radius=.35 if i in [0,len(points)-1] else 1
    spline.order_u=min(3,len(points));spline.use_endpoint_u=True
    obj=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.convert(target='MESH')
    obj=bpy.context.object;obj.data.materials.append(mat)
    for poly in obj.data.polygons:poly.use_smooth=True
    bind(obj,bone);obj.select_set(False);return obj

body_bvh=BVHTree.FromPolygons([v.co for v in body.data.vertices],[list(p.vertices) for p in body.data.polygons])
def surface_point(x,y,z):
    hit,normal,_,_=body_bvh.find_nearest(xyz((x,y,z)))
    hit+=normal*.002
    return (hit.x/SCALE,hit.z/SCALE,-hit.y/SCALE)

# Real eye globes sit inside the modelled eye sockets; the eyelid bones wrap them.
for side in ['L','R']:
    c=positions[skel['bones'][f'eye.{side}']['head']]
    sphere(f'Eye.{side}',c,(.151,.151,.155),whites,f'eye.{side}')
    sphere(f'Iris.{side}',c+Vector((0,0,.148)),(.063,.063,.010),iris,f'eye.{side}')
    sphere(f'Pupil.{side}',c+Vector((0,0,.157)),(.027,.031,.004),pupil,f'eye.{side}',20,10)
    sphere(f'Catchlight.{side}',c+Vector((-.019,.024,.162)),(.012,.012,.003),whites,f'eye.{side}',12,8)
    # Tapered eyebrow strokes follow the brow ridge, with individual fine hairs.
    s=1 if side=='L' else -1
    points=[(s*x,y,z) for x,y,z in [(.13,7.65,1.28),(.24,7.68,1.29),(.37,7.67,1.235),(.49,7.59,1.15)]]
    points=[surface_point(x,y,z+.25) for x,y,z in points]
    tube(f'Brow.{side}',points,.026,hair,'head')
    for i in range(18):
        a=i/17;x=.14+a*.34;y=7.65+math.sin(a*math.pi)*.035-a*a*.06;z=1.28-a*a*.13
        tube(f'Brow strand.{side}',[surface_point(s*x,y-.013,z+.25),surface_point(s*(x+.015),y+.022,z+.25)],.004,hair_light,'head')
    # Small studs respect the existing character's restrained jewellery.
    sphere(f'Stud.{side}',(s*.75,6.91,.24),(.046,.046,.024),gold,'head',16,10)

# A recessed oral cavity keeps the speaking silhouette dark behind the lips.
sphere('Oral cavity',(0,6.85,1.27),(.25,.15,.11),inside,'jaw',24,12)

# Tooth arcs stay behind the lips and use the jaw/head weights respectively.
for row,bone,y,z in [('Upper','head',6.90,1.27),('Lower','jaw',6.76,1.25)]:
    for i in range(8):
        x=(i-3.5)*.055
        sphere(f'{row} tooth {i}',(x,y,z-abs(x)*.2),(.028,.056,.034),teeth,bone,12,8)

# A continuous, shaped hair cap, with finely displaced coils and a low swept bun.
head_faces=[]
for f in faces:
    center=sum((vertices[i] for i in f),Vector())/len(f)
    threshold=8.0-.10*abs(center.x) if center.z>.8 else (7.8 if center.z>.2 else 7.30)
    if center.y>threshold and (abs(center.x)<.66 or center.y>7.7):head_faces.append(f)
used=sorted({i for f in head_faces for i in f});remap={v:i for i,v in enumerate(used)}
hair_mesh=bpy.data.meshes.new('Coiled hair cap');hair_mesh.from_pydata([xyz(vertices[i]) for i in used],[],[[remap[i] for i in f] for f in head_faces]);hair_mesh.update()
cap=bpy.data.objects.new('Textured swept hair',hair_mesh);bpy.context.collection.objects.link(cap);cap.data.materials.append(hair)
bpy.context.view_layer.objects.active=cap;cap.select_set(True)
sub=cap.modifiers.new('Scalp contour','SUBSURF');sub.levels=1;bpy.ops.object.modifier_apply(modifier=sub.name)
bm=bmesh.new();bm.from_mesh(cap.data)
for _ in range(8):
    moves={}
    for v in bm.verts:
        edges=[e for e in v.link_edges if e.is_boundary]
        if len(edges)==2:moves[v]=v.co.lerp(sum((e.other_vert(v).co for e in edges),Vector())/2,.65)
    for v,co in moves.items():v.co=co
bm.to_mesh(cap.data);bm.free()
for v in cap.data.vertices:
    grain=math.sin(v.co.x*175+math.sin(v.co.z*45))*math.sin(v.co.z*185+v.co.y*45)
    v.co+=v.normal*(.009 + .0012*grain)
for poly in cap.data.polygons:poly.use_smooth=True
bind(cap,'head');cap.select_set(False)
bun=sphere('Low coiled bun',(0,7.52,-.71),(.44,.45,.29),hair,'head',32,20)
for v in bun.data.vertices:
    grain=math.sin(v.co.x*620+v.co.y*410)*math.sin(v.co.z*510)
    v.co+=v.normal*.002*grain
# Swept strands follow the actual scalp surface, so the hair is not a bead helmet.
bvh=BVHTree.FromPolygons([v.co for v in cap.data.vertices],[list(p.vertices) for p in cap.data.polygons])
for i in range(24):
    x=-.69+i/23*1.38;points=[]
    for j in range(17):
        theta=.12+j/16*2.3
        source=Vector((x*(1-.65*j/16)+.008*math.sin(j*2.3+i*.8),7.75+.65*math.sin(theta),.45+.85*math.cos(theta)))
        hit,normal,_,_=bvh.find_nearest(xyz(source))
        if hit is not None:
            hit+=normal*.0018;points.append((hit.x/SCALE,hit.z/SCALE,-hit.y/SCALE))
    tube('Swept hair strand',points,.005,hair_light)
for i in range(12):
    a=i/12*math.tau;points=[]
    for j in range(24):
        b=j/23*math.tau
        points.append((.43*math.sin(b)*math.cos(a),7.52+.43*math.cos(b),-.71+.28*math.sin(b)*math.sin(a)))
    tube('Bun coil',points,.012,hair_light)

# Structured, closed collar and central placket.
for side in [-1,1]:
    tube('Collar edge',[(side*.04,6.05,.44),(side*.26,6.05,.36),(side*.43,6.02,.08),(side*.39,6.03,-.22)],.022,trim,'neck01')
def front_point(x,y):
    hit,normal,_,_=body_bvh.ray_cast(xyz((x,y,3)),Vector((0,1,0)),2)
    hit+=normal*.002
    return Vector((hit.x/SCALE,hit.z/SCALE,-hit.y/SCALE))
tube('Uniform placket',[front_point(0,y) for y in [6.02,5.85,5.65,5.45,5.25]],.022,trim,'spine01')
for y in [5.86,5.57,5.29]:sphere('Uniform button',front_point(0,y)+Vector((0,0,.027)),(.021,.021,.01),gold,'spine01',12,8)
# Gcina's existing two-signature shield, adapted as a small stitched badge.
center=Vector((.88,4.72,1.33));unit=.0065
for side,mat in [(-1,whites),(1,gold)]:
    p=[(side*1,-16),(side*13,-11),(side*13,-2),(side*10,7),(side*1,16)]
    coords=[xyz(center+Vector((x*unit,-y*unit,0))) for x,y in p]
    mesh=bpy.data.meshes.new('Shield half');mesh.from_pydata(coords,[],[list(range(5))]);mesh.materials.append(mat)
    badge=bpy.data.objects.new('Gcina shield',mesh);bpy.context.collection.objects.link(badge);bind(badge,'spine01')
tube('Shield tick',[center+Vector((x*unit,y*unit,.008)) for x,y in [(-6,0),(-1,-5),(8,6)]],.013,trim,'spine01')

# One skinned surface with material primitives shares a single skeleton/bind table.
objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
for obj in objects: obj.select_set(True)
bpy.context.view_layer.objects.active=body
bpy.ops.object.join()
combined=bpy.context.object;combined.name='GcinaDigitalHuman'
unique=[];mapping={}
for i,mat in enumerate(combined.data.materials):
    if mat not in unique:unique.append(mat)
    mapping[i]=unique.index(mat)
indices=[mapping[p.material_index] for p in combined.data.polygons]
combined.data.materials.clear()
for mat in unique:combined.data.materials.append(mat)
for polygon,index in zip(combined.data.polygons,indices):polygon.material_index=index
combined.data.validate();combined.data.update()
arm['asset_license']='MakeHuman graphical inputs: CC0 1.0; see THIRD_PARTY.md'
arm['gcina_revision']='v2'
OUTPUT.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUTPUT),export_format='GLB',export_yup=True,export_animations=False,export_skins=True,export_all_influences=False,export_apply=False,export_extras=True)
print('AVATAR_GLTF',OUTPUT,OUTPUT.stat().st_size)
