"""Run with Blender in background to produce a web-sized, batched campus GLB."""

import bpy
from collections import defaultdict
from pathlib import Path

OUTPUT = str(Path(__file__).resolve().parents[1] / "public/assets/models/huijishan-campus-v1.glb")

groups = defaultdict(lambda: {"vertices": [], "faces": []})
source_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH" and not obj.hide_render]

for obj in source_objects:
    mesh = obj.data
    region = obj.users_collection[0].name if obj.users_collection else "其他"
    transformed = [tuple(obj.matrix_world @ vertex.co) for vertex in mesh.vertices]
    flipped = obj.matrix_world.determinant() < 0
    for material_index in range(max(1, len(mesh.materials))):
        material = mesh.materials[material_index] if material_index < len(mesh.materials) else None
        key = (region, material.name if material else "无材质")
        group = groups[key]
        local_indices = {}
        for polygon in mesh.polygons:
            if polygon.material_index != material_index:
                continue
            face = []
            for index in polygon.vertices:
                if index not in local_indices:
                    local_indices[index] = len(group["vertices"])
                    group["vertices"].append(transformed[index])
                face.append(local_indices[index])
            group["faces"].append(tuple(reversed(face)) if flipped else tuple(face))

web_scene = bpy.data.scenes.new("会稽山园区｜网页合批")
web_collection = bpy.data.collections.new("园区模型")
web_scene.collection.children.link(web_collection)
for (region, material_name), group in groups.items():
    if not group["faces"]:
        continue
    mesh = bpy.data.meshes.new(f"{region}｜{material_name}")
    mesh.from_pydata(group["vertices"], [], group["faces"])
    mesh.update()
    material = bpy.data.materials.get(material_name)
    if material:
        mesh.materials.append(material)
    obj = bpy.data.objects.new(mesh.name, mesh)
    web_collection.objects.link(obj)

bpy.context.window.scene = web_scene
bpy.ops.object.select_all(action="DESELECT")
for obj in web_collection.objects:
    obj.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=OUTPUT,
    export_format="GLB",
    export_yup=True,
    export_cameras=False,
    export_lights=False,
    export_extras=False,
    use_selection=True,
)
print("WEB_EXPORT_DONE", {"objects": len(web_collection.objects), "source_objects": len(source_objects), "path": OUTPUT})
