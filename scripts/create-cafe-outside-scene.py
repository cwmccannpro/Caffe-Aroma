import bpy, math, os, random
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'assets')
os.makedirs(OUT, exist_ok=True)
random.seed(19)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'

def material(name, color, roughness=.65, metallic=0, emission=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Emission Color'].default_value = (*color, 1)
    bsdf.inputs['Emission Strength'].default_value = emission
    return mat

brick = material('Brick_Elmwood', (.48,.235,.15))
image = bpy.data.images.load(os.path.join(OUT, 'brick.png'))
texture = brick.node_tree.nodes.new('ShaderNodeTexImage')
texture.image = image
bsdf = next(n for n in brick.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
brick.node_tree.links.new(texture.outputs['Color'], bsdf.inputs['Base Color'])
cream = material('Limestone', (.79,.72,.57))
green = material('Awning_Green', (.055,.18,.135))
gold = material('Brass', (.54,.37,.16), .35, .65)
iron = material('Cafe_Iron', (.06,.085,.07), .45, .35)
wood = material('Table_Walnut', (.27,.15,.075))
glass = material('Window_Glow', (.14,.205,.19), .22, .1, .08)
road = material('Street_Slate', (.30,.32,.29))
stone = material('Sidewalk_Stone', (.62,.58,.48))
leaf = material('Tree_Green', (.13,.24,.12), .9)
trunk = material('Tree_Bark', (.24,.14,.08))
coffee = material('Espresso', (.10,.035,.016))
white = material('Porcelain', (.91,.87,.75), .3)
lamp = material('Lamp_Glow', (1,.66,.25), .4, emission=.3)

def cube(name, location, scale, mat, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    o = bpy.context.object; o.name = name; o.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(mat)
    if bevel:
        mod=o.modifiers.new('Soft_edges','BEVEL'); mod.width=bevel; mod.segments=2
        bpy.context.view_layer.objects.active=o
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return o

def cylinder(name, location, radius, depth, mat, vertices=16):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    o=bpy.context.object; o.name=name; o.data.materials.append(mat)
    for p in o.data.polygons: p.use_smooth=True
    return o

def tube(name, points, radius, mat):
    curve=bpy.data.curves.new(name,'CURVE'); curve.dimensions='3D'
    curve.bevel_depth=radius; curve.bevel_resolution=2
    spl=curve.splines.new('POLY'); spl.points.add(len(points)-1)
    for p,co in zip(spl.points,points): p.co=(*co,1)
    o=bpy.data.objects.new(name,curve); scene.collection.objects.link(o); o.data.materials.append(mat)
    return o

def text(name, body, location, size, mat, rotation=(math.pi/2,0,0)):
    curve=bpy.data.curves.new(name,'FONT'); curve.body=body; curve.align_x='CENTER'
    curve.align_y='CENTER'; curve.size=size; curve.extrude=.002; curve.resolution_u=4
    font_path='C:/Windows/Fonts/georgia.ttf'
    if os.path.isfile(font_path): curve.font=bpy.data.fonts.load(font_path)
    o=bpy.data.objects.new(name,curve); scene.collection.objects.link(o)
    o.location=location; o.rotation_euler=rotation; o.data.materials.append(mat)
    return o

footprint=[(-3.25,-1.5),(2.25,-1.5),(3.1,-.65),(3.1,1.8),(-3.25,1.8)]
verts=[(x,y,z) for z in (.36,4.5) for x,y in footprint]
faces=[tuple(range(4,-1,-1)),tuple(range(5,10))]
for i in range(5): faces.append((i,(i+1)%5,(i+1)%5+5,i+5))
mesh=bpy.data.meshes.new('Corner_building'); mesh.from_pydata(verts,[],faces); mesh.update()
o=bpy.data.objects.new('Elmwood_corner',mesh); scene.collection.objects.link(o); o.data.materials.append(brick)
uv=mesh.uv_layers.new(name='Brick_UV')
for poly in mesh.polygons:
    for li in poly.loop_indices:
        v=mesh.vertices[mesh.loops[li].vertex_index].co
        uv.data[li].uv=((v.x+v.y)/3,v.z/3)

base=cube('Diorama_base',(0,-.2,.08),(9.7,7.3,.26),road,.12)
cube('Sidewalk',(0,-.1,.24),(8.5,6.25,.16),stone,.08)
cube('Street_front',(0,-3.8,.07),(9.6,1.0,.10),road,.04)
for x in [-3.8,-2.6,-1.4,-.2,1,2.2,3.4]:
    cube('Sidewalk_joint',(x,-2.3,.324),(.008,1.5,.003),road)
for y in [-2.3,-1.5,-.7,.1,.9,1.7]:
    cube('Sidewalk_joint',(3.7,y,.325),(1.1,.008,.003),road)
for x in [-2.4,0,2.4]: cube('Road_line',(x,-4.03,.13),(1.05,.035,.009),cream,.007)

for height,width in [(4.48,.13),(4.62,.16),(4.78,.11),(2.54,.10)]:
    for i in range(5):
        a=Vector((*footprint[i],height)); b=Vector((*footprint[(i+1)%5],height))
        mid=(a+b)/2; line=cube('Cornice',mid,((b-a).length+.1,width,.13),cream,.025)
        line.rotation_euler.z=math.atan2(b.y-a.y,b.x-a.x)
cube('Roof_top',(-.07,.17,4.60),(6.35,3.35,.11),stone,.035)

def front_window(cx, cy, width, yaw=0):
    objs=[]
    def local_box(n, loc, dims, mat, bevel=.01):
        ob=cube(n,loc,dims,mat,bevel); objs.append(ob); return ob
    local_box('Shop_window',(0,0,1.43),(width,.08,1.9),glass)
    for x in [-width/2,width/2,0]: local_box('Shop_frame',(x,-.065,1.43),(.065,.08,1.92),green)
    local_box('Shop_sill',(0,-.08,.49),(width+.1,.15,.1),cream)
    local_box('Shop_top',(0,-.065,2.4),(width+.1,.12,.12),cream)
    aw=local_box('Green_awning',(0,-.39,2.29),(width+.21,.78,.07),green,.015); aw.rotation_euler.x=math.radians(15)
    local_box('Awning_valance',(0,-.78,2.15),(width+.21,.045,.22),green)
    for x in [-width/2+.04,0,width/2-.04]: local_box('Awning_rib',(x,-.41,2.33),(.018,.73,.024),gold,0).rotation_euler.x=math.radians(15)
    label=text('Awning_lettering','CAFFE  AROMA' if yaw==0 else 'VINO · BEER · COFFEE',(0,-.812,2.155),.11,cream)
    objs.append(label)
    for ob in objs:
        p=ob.location.copy(); ob.location.x=cx+p.x*math.cos(yaw)-p.y*math.sin(yaw)
        ob.location.y=cy+p.x*math.sin(yaw)+p.y*math.cos(yaw); ob.rotation_euler.z+=yaw

for x in [-2.2,-.33,1.48]: front_window(x,-1.555,1.6)
front_window(3.155,.73,1.80,math.pi/2)
front_window(2.725,-1.075,.93,math.pi/4)

def upper_window(cx,cy,yaw=0):
    objs=[]
    for x in [-.27,.27]:
        objs.append(cube('Upper_glass',(x,0,3.48),(.46,.045,1.13),glass,.005))
        for xx in [x-.255,x+.255]: objs.append(cube('Upper_frame',(xx,-.05,3.48),(.045,.08,1.2),cream,.008))
        for z in [2.89,3.48,4.075]: objs.append(cube('Upper_sash',(x,-.05,z),(.53,.08,.045),cream,.008))
        objs.append(cube('Window_mullion',(x,-.05,3.48),(.02,.04,1.13),cream))
    objs.append(cube('Window_sill',(0,-.08,2.86),(1.15,.18,.1),cream,.016))
    objs.append(cube('Window_header',(0,-.06,4.15),(1.17,.16,.1),cream,.016))
    for ob in objs:
        p=ob.location.copy(); ob.location.x=cx+p.x*math.cos(yaw)-p.y*math.sin(yaw)
        ob.location.y=cy+p.x*math.sin(yaw)+p.y*math.cos(yaw); ob.rotation_euler.z+=yaw
for x in [-2.22,-.34,1.54]: upper_window(x,-1.535)
upper_window(3.13,.72,math.pi/2)

for x in [-3.13,-1.28,.59,2.2]: cube('Brick_pilaster',(x,-1.56,3.51),(.13,.1,1.82),cream,.01)
for x in [-2.22,-.34,1.54]:
    cylinder('Round_limestone_detail',(x,-1.57,4.33),.064,.03,cream,16).rotation_euler.x=math.pi/2

text('Corner_sign','CAFFE AROMA',(2.725,-1.105,2.55),.155,cream,(math.pi/2,0,math.pi/4))
text('Open_sign','OPEN',(2.92,-1.40,1.55),.13,lamp,(math.pi/2,0,math.pi/4))
for x in [-2.4,0,2.12]:
    tube('Gooseneck_lamp',[(x,-1.62,2.6),(x,-1.88,2.7),(x,-2.04,2.55)],.025,iron)
    cylinder('Lamp_shade',(x,-2.04,2.54),.09,.055,iron)
    cylinder('Lamp_glow',(x,-2.04,2.50),.066,.012,lamp)

def chair(x,y,rot=0):
    objs=[cylinder('Chair_seat',(0,0,.60),.17,.045,iron,16)]
    for xx in [-.115,.115]:
        for yy in [-.115,.115]: objs.append(tube('Chair_leg',[(xx,yy,.35),(xx,yy,.60)],.013,iron))
        objs.append(tube('Chair_back',[(xx,.13,.57),(xx,.14,.94)],.017,iron))
    objs.append(tube('Chair_back_arch',[(.13*math.cos(a),.14,.94+.10*math.sin(a)) for a in [i*math.pi/10 for i in range(11)]],.017,iron))
    for ob in objs:
        p=ob.location.copy(); ob.location=(x+p.x*math.cos(rot)-p.y*math.sin(rot), y+p.x*math.sin(rot)+p.y*math.cos(rot),p.z); ob.rotation_euler.z+=rot
def table(x,y):
    cylinder('Cafe_table_top',(x,y,.86),.32,.055,wood,24)
    cylinder('Table_stem',(x,y,.59),.035,.52,iron)
    for a in [0,math.pi/2,math.pi,3*math.pi/2]: tube('Table_foot',[(x,y,.39),(x+.21*math.cos(a),y+.21*math.sin(a),.36)],.02,iron)
    cylinder('Porcelain_cup',(x+.10,y,.91),.055,.08,white,16)
    cylinder('Espresso_in_cup',(x+.10,y,.953),.045,.004,coffee,16)
    cylinder('Saucer',(x+.10,y,.89),.08,.013,white,16)
    chair(x-.47,y,math.pi/2); chair(x+.47,y,-math.pi/2)
for x,y in [(-2.4,-2.42),(-.7,-2.42),(1,-2.42),(3.77,.83)]: table(x,y)
for x in [-3.12,-1.1,.9,2.65]: cylinder('Patio_post',(x,-3.05,.65),.022,.60,iron,10)
for z in [.48,.85]: tube('Patio_rail',[(-3.12,-3.05,z),(2.65,-3.05,z)],.022,iron)
for i in range(24): cylinder('Patio_spindle',(-3.12+i*.25,-3.05,.65),.010,.35,iron,8)

def tree(x,y,s):
    cylinder('Tree_planter',(x,y,.52),.31,.37,green,16)
    cylinder('Tree_trunk',(x,y,1.25),.065,.95,trunk,12)
    for j in range(6):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=.46*s,location=(x+random.uniform(-.30,.30)*s,y+random.uniform(-.30,.30)*s,1.85+j*.12))
        obj=bpy.context.object; obj.name='Tree_crown'; obj.scale.z=1.12; obj.data.materials.append(leaf)
tree(-3.86,.15,1.0); tree(3.9,2.35,.85)
cube('Menu_board',(-3.37,-2.23,.87),(.33,.045,.69),iron,.02).rotation_euler.x=-.1
text('Menu_board_text','CAFFE\nESPRESSO\nVINO',(-3.37,-2.268,.92),.08,cream)
cube('Welcome_mat',(2.95,-1.92,.342),(.7,.38,.018),green,.04)

# Convert curves and consolidate by material to keep runtime draw calls low.
bpy.ops.object.select_all(action='DESELECT')
for obj in list(scene.objects):
    if obj.type in {'CURVE','FONT'}:
        obj.select_set(True); bpy.context.view_layer.objects.active=obj
        bpy.ops.object.convert(target='MESH'); obj.select_set(False)
for mat in list(bpy.data.materials):
    objects=[o for o in scene.objects if o.type=='MESH' and len(o.data.materials)==1 and o.data.materials[0]==mat]
    if not objects: continue
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objects: ob.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    if len(objects)>1: bpy.ops.object.join()
    objects[0].name='CAFE_'+mat.name
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'cafe-elmwood.glb'),export_format='GLB',export_cameras=False,export_lights=False,export_yup=True)

def area(name, loc, energy, color, size):
    data=bpy.data.lights.new(name,'AREA'); data.energy=energy; data.color=color; data.shape='DISK'; data.size=size
    ob=bpy.data.objects.new(name,data); scene.collection.objects.link(ob); ob.location=loc
    ob.rotation_euler=(Vector((0,0,1.3))-ob.location).to_track_quat('-Z','Y').to_euler(); return data
key=area('Studio_key',(3,-5,10),1300,(1,.84,.64),7)
fill=area('Studio_fill',(-5,-2,6),800,(.75,.85,1),8)
rim=area('Studio_rim',(1,5,7),1000,(1,.86,.63),5)
bpy.ops.object.camera_add(location=(10,-13,10))
cam=bpy.context.object; cam.name='CAM_Cafe_Editorial'; cam.rotation_euler=(Vector((0,-.1,2.0))-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.type='ORTHO'; cam.data.ortho_scale=13.4; scene.camera=cam
scene.render.engine='CYCLES'; scene.cycles.samples=24; scene.cycles.use_denoising=True
scene.render.resolution_x=1280; scene.render.resolution_y=1100; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.film_transparent=True
scene.world.use_nodes=True; scene.world.node_tree.nodes.get('Background').inputs[0].default_value=(.68,.70,.65,1)
scene.world.node_tree.nodes.get('Background').inputs[1].default_value=.6
scene.view_settings.view_transform='AgX'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'assets-source','cafe-elmwood.blend'))
scene.render.filepath=os.path.join(OUT,'cafe-day.png'); bpy.ops.render.render(write_still=True)
glass_bsdf=next(n for n in glass.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
glass_bsdf.inputs['Base Color'].default_value=(.28,.16,.04,1); glass_bsdf.inputs['Emission Color'].default_value=(1,.39,.08,1); glass_bsdf.inputs['Emission Strength'].default_value=1.4
next(n for n in lamp.node_tree.nodes if n.type=='BSDF_PRINCIPLED').inputs['Emission Strength'].default_value=4
key.energy=170; key.color=(.40,.55,.9); fill.energy=260; fill.color=(.22,.38,.7); rim.energy=500; rim.color=(1,.5,.16)
scene.world.node_tree.nodes.get('Background').inputs[1].default_value=.12
scene.render.filepath=os.path.join(OUT,'cafe-night.png'); bpy.ops.render.render(write_still=True)
print('CAFE_ASSETS_READY',len([o for o in scene.objects if o.type=='MESH']),os.path.getsize(os.path.join(OUT,'cafe-elmwood.glb')))
