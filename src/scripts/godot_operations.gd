#!/usr/bin/env -S godot --headless --script
extends SceneTree

# Debug mode flag
var debug_mode = false

func _init():
    var args = OS.get_cmdline_args()
    
    # Check for debug flag
    debug_mode = "--debug-godot" in args
    
    # Find the script argument and determine the positions of operation and params
    var script_index = args.find("--script")
    if script_index == -1:
        log_error("Could not find --script argument")
        quit(1)
    
    # The operation should be 2 positions after the script path (script_index + 1 is the script path itself)
    var operation_index = script_index + 2
    # The params should be 3 positions after the script path
    var params_index = script_index + 3
    
    if args.size() <= params_index:
        log_error("Usage: godot --headless --script godot_operations.gd <operation> <json_params>")
        log_error("Not enough command-line arguments provided.")
        quit(1)
    
    var operation = args[operation_index]
    var params_json = args[params_index]
    var quiet_output = operation == "read_scene_tree" or operation == "get_scene_layout" or operation == "capture_scene_preview" or operation == "dry_run_align_nodes" or operation == "align_nodes" or operation == "dry_run_place_asset_in_scene" or operation == "place_asset_in_scene" or operation == "dry_run_update_node_properties" or operation == "update_node_properties" or operation == "dry_run_scene_patch" or operation == "apply_scene_patch" or operation == "validate_scene" or operation == "get_asset_info" or operation == "dry_run_scene_blueprint" or operation == "create_scene_from_blueprint"

    if quiet_output:
        debug_mode = false

    # Log all arguments for debugging
    log_debug("All arguments: " + str(args))
    log_debug("Script index: " + str(script_index))
    log_debug("Operation index: " + str(operation_index))
    log_debug("Params index: " + str(params_index))

    if not quiet_output:
        log_info("Operation: " + operation)
    log_debug("Params JSON: " + params_json)
    
    # Parse JSON using Godot 4.x API
    var json = JSON.new()
    var error = json.parse(params_json)
    var params = null
    
    if error == OK:
        params = json.get_data()
    else:
        log_error("Failed to parse JSON parameters: " + params_json)
        log_error("JSON Error: " + json.get_error_message() + " at line " + str(json.get_error_line()))
        quit(1)
    
    if not params:
        log_error("Failed to parse JSON parameters: " + params_json)
        quit(1)
    
    if not quiet_output:
        log_info("Executing operation: " + operation)
    
    match operation:
        "read_scene_tree":
            read_scene_tree(params)
        "get_scene_layout":
            get_scene_layout(params)
        "capture_scene_preview":
            await capture_scene_preview(params)
        "dry_run_align_nodes":
            dry_run_align_nodes(params)
        "align_nodes":
            align_nodes(params)
        "dry_run_place_asset_in_scene":
            dry_run_place_asset_in_scene(params)
        "place_asset_in_scene":
            place_asset_in_scene(params)
        "dry_run_update_node_properties":
            dry_run_update_node_properties(params)
        "update_node_properties":
            update_node_properties(params)
        "dry_run_scene_patch":
            dry_run_scene_patch(params)
        "apply_scene_patch":
            apply_scene_patch(params)
        "validate_scene":
            validate_scene(params)
        "get_asset_info":
            get_asset_info(params)
        "dry_run_scene_blueprint":
            dry_run_scene_blueprint(params)
        "create_scene_from_blueprint":
            create_scene_from_blueprint(params)
        "create_scene":
            create_scene(params)
        "add_node":
            add_node(params)
        "load_sprite":
            load_sprite(params)
        "export_mesh_library":
            export_mesh_library(params)
        "save_scene":
            save_scene(params)
        "get_uid":
            get_uid(params)
        "resave_resources":
            resave_resources(params)
        _:
            log_error("Unknown operation: " + operation)
            quit(1)
    
    quit()

# Logging functions
func log_debug(message):
    if debug_mode:
        print("[DEBUG] " + message)

func log_info(message):
    print("[INFO] " + message)

func log_error(message):
    printerr("[ERROR] " + message)

# Get a script by registered class name.
# Only looks up names via the project's global class registry. Raw paths
# (e.g. "res://evil.gd") are intentionally not accepted here to prevent
# arbitrary script instantiation from agent-supplied input.
func get_script_by_name(name_of_class):
    if debug_mode:
        print("Attempting to get script for class: " + name_of_class)

    # Search for it in the global class registry if it's a class name
    var global_classes = ProjectSettings.get_global_class_list()
    if debug_mode:
        print("Searching through " + str(global_classes.size()) + " global classes")
    
    for global_class in global_classes:
        var found_name_of_class = global_class["class"]
        var found_path = global_class["path"]
        
        if found_name_of_class == name_of_class:
            if debug_mode:
                print("Found matching class in registry: " + found_name_of_class + " at path: " + found_path)
            var script = load(found_path) as Script
            if script:
                if debug_mode:
                    print("Successfully loaded script from registry")
                return script
            else:
                printerr("Failed to load script from registry path: " + found_path)
                break
    
    printerr("Could not find script for class: " + name_of_class)
    return null

# Instantiate a class by name
func instantiate_class(name_of_class):
    if name_of_class.is_empty():
        printerr("Cannot instantiate class: name is empty")
        return null
    
    var result = null
    if debug_mode:
        print("Attempting to instantiate class: " + name_of_class)
    
    # Check if it's a built-in class
    if ClassDB.class_exists(name_of_class):
        if debug_mode:
            print("Class exists in ClassDB, using ClassDB.instantiate()")
        if ClassDB.can_instantiate(name_of_class):
            result = ClassDB.instantiate(name_of_class)
            if result == null:
                printerr("ClassDB.instantiate() returned null for class: " + name_of_class)
        else:
            printerr("Class exists but cannot be instantiated: " + name_of_class)
            printerr("This may be an abstract class or interface that cannot be directly instantiated")
    else:
        # Try to get the script
        if debug_mode:
            print("Class not found in ClassDB, trying to get script")
        var script = get_script_by_name(name_of_class)
        if script is GDScript:
            if debug_mode:
                print("Found GDScript, creating instance")
            result = script.new()
        else:
            printerr("Failed to get script for class: " + name_of_class)
            return null
    
    if result == null:
        printerr("Failed to instantiate class: " + name_of_class)
    elif debug_mode:
        print("Successfully instantiated class: " + name_of_class + " of type: " + result.get_class())
    
    return result

func print_json_error(error_code, message):
    print(JSON.stringify({
        "success": false,
        "error": error_code,
        "message": message
    }))

func vector2_to_array(value):
    return [value.x, value.y]

func vector3_to_array(value):
    return [value.x, value.y, value.z]

func normalize_resource_scene_path(scene_path):
    var normalized_path = scene_path
    if not normalized_path.begins_with("res://"):
        normalized_path = "res://" + normalized_path
    return normalized_path

func get_scene_node_path(node, root):
    if node == root:
        return str(root.name)
    return str(root.name) + "/" + str(root.get_path_to(node))

func add_resource_reference(resources, summary, property_name, resource):
    if resource == null or not (resource is Resource):
        return
    if resource.resource_path.is_empty():
        return

    resources.append({
        "property": property_name,
        "type": resource.get_class(),
        "path": resource.resource_path
    })
    summary["resourceReferenceCount"] += 1

func get_script_info(node):
    var script = node.get_script()
    if script == null:
        return null

    var script_class_name = null
    if script.has_method("get_global_name"):
        var global_name = script.get_global_name()
        if str(global_name) != "":
            script_class_name = str(global_name)

    return {
        "path": script.resource_path if not script.resource_path.is_empty() else null,
        "className": script_class_name
    }

func get_node_groups(node):
    var groups = []
    for group_name in node.get_groups():
        var group_string = str(group_name)
        if group_string.begins_with("_"):
            continue
        groups.append(group_string)
    return groups

func get_common_node_properties(node, include_resource_paths):
    var properties = {}

    if node is Node2D:
        properties["position"] = vector2_to_array(node.position)
        properties["rotation"] = node.rotation
        properties["scale"] = vector2_to_array(node.scale)
        properties["visible"] = node.visible
        properties["z_index"] = node.z_index

    if node is Control:
        properties["position"] = vector2_to_array(node.position)
        properties["size"] = vector2_to_array(node.size)
        properties["scale"] = vector2_to_array(node.scale)
        properties["visible"] = node.visible
        properties["anchors"] = {
            "left": node.anchor_left,
            "top": node.anchor_top,
            "right": node.anchor_right,
            "bottom": node.anchor_bottom
        }
        properties["offsets"] = {
            "left": node.offset_left,
            "top": node.offset_top,
            "right": node.offset_right,
            "bottom": node.offset_bottom
        }

    if node is Node3D:
        properties["position"] = vector3_to_array(node.position)
        properties["rotation"] = vector3_to_array(node.rotation)
        properties["scale"] = vector3_to_array(node.scale)
        properties["visible"] = node.visible

    if node is Sprite2D:
        if include_resource_paths and node.texture != null and not node.texture.resource_path.is_empty():
            properties["texture"] = node.texture.resource_path
        properties["centered"] = node.centered
        properties["offset"] = vector2_to_array(node.offset)
        properties["flip_h"] = node.flip_h
        properties["flip_v"] = node.flip_v

    if node is CollisionShape2D:
        properties["disabled"] = node.disabled
        if node.shape != null:
            properties["shapeType"] = node.shape.get_class()
            if include_resource_paths and not node.shape.resource_path.is_empty():
                properties["shape"] = node.shape.resource_path

    if node is Camera2D:
        properties["enabled"] = node.enabled
        properties["zoom"] = vector2_to_array(node.zoom)

    if node is AudioStreamPlayer:
        if include_resource_paths and node.stream != null and not node.stream.resource_path.is_empty():
            properties["stream"] = node.stream.resource_path
        properties["volume_db"] = node.volume_db
        properties["autoplay"] = node.autoplay

    if node is AudioStreamPlayer2D:
        if include_resource_paths and node.stream != null and not node.stream.resource_path.is_empty():
            properties["stream"] = node.stream.resource_path
        properties["volume_db"] = node.volume_db
        properties["autoplay"] = node.autoplay

    return properties

func collect_node_resources(node, summary):
    var resources = []

    if node is Sprite2D:
        add_resource_reference(resources, summary, "texture", node.texture)
    if node is TextureRect:
        add_resource_reference(resources, summary, "texture", node.texture)
    if node is CollisionShape2D:
        add_resource_reference(resources, summary, "shape", node.shape)
    if node is MeshInstance3D:
        add_resource_reference(resources, summary, "mesh", node.mesh)
    if node is AudioStreamPlayer:
        add_resource_reference(resources, summary, "stream", node.stream)
    if node is AudioStreamPlayer2D:
        add_resource_reference(resources, summary, "stream", node.stream)

    return resources

func build_scene_tree_node(node, root, depth, max_depth, options, summary, limits):
    var node_type = node.get_class()
    summary["totalNodes"] += 1
    summary["maxDepthReached"] = max(summary["maxDepthReached"], depth)

    if not summary["nodeTypes"].has(node_type):
        summary["nodeTypes"][node_type] = 0
    summary["nodeTypes"][node_type] += 1

    var script_info = get_script_info(node)
    if script_info != null:
        summary["scriptCount"] += 1

    var node_data = {
        "name": str(node.name),
        "type": node_type,
        "path": get_scene_node_path(node, root),
        "childCount": node.get_child_count(),
        "children": []
    }

    if options["includeScripts"]:
        node_data["script"] = script_info

    if options["includeGroups"]:
        node_data["groups"] = get_node_groups(node)

    if options["includeProperties"]:
        node_data["properties"] = get_common_node_properties(node, options["includeResourcePaths"])

    if options["includeResourcePaths"]:
        node_data["resources"] = collect_node_resources(node, summary)

    if depth >= max_depth:
        if node.get_child_count() > 0:
            limits["depthTruncated"] = true
        return node_data

    for child in node.get_children():
        node_data["children"].append(build_scene_tree_node(child, root, depth + 1, max_depth, options, summary, limits))

    return node_data

func read_scene_tree(params):
    if not params.has("scene_path"):
        print_json_error("MISSING_SCENE_PATH", "scene_path is required.")
        return

    var scene_path = normalize_resource_scene_path(params.scene_path)
    var max_depth = params.max_depth if params.has("max_depth") else 20
    var max_depth_requested = params.max_depth_requested if params.has("max_depth_requested") else null
    var max_depth_clamped = params.max_depth_clamped if params.has("max_depth_clamped") else false

    var options = {
        "includeProperties": params.include_properties if params.has("include_properties") else true,
        "includeScripts": params.include_scripts if params.has("include_scripts") else true,
        "includeGroups": params.include_groups if params.has("include_groups") else true,
        "includeResourcePaths": params.include_resource_paths if params.has("include_resource_paths") else true
    }

    if not FileAccess.file_exists(scene_path):
        print_json_error("SCENE_PATH_NOT_FOUND", "Scene file does not exist: " + scene_path)
        return

    var scene_resource = ResourceLoader.load(scene_path)
    if scene_resource == null or not (scene_resource is PackedScene):
        print_json_error("SCENE_LOAD_FAILED", "Failed to load scene as PackedScene: " + scene_path)
        return

    var scene_root = scene_resource.instantiate()
    if scene_root == null:
        print_json_error("SCENE_INSTANTIATE_FAILED", "Failed to instantiate scene: " + scene_path)
        return

    var summary = {
        "totalNodes": 0,
        "maxDepthReached": 0,
        "nodeTypes": {},
        "scriptCount": 0,
        "resourceReferenceCount": 0
    }
    var limits = {
        "maxDepthRequested": max_depth_requested,
        "maxDepthApplied": max_depth,
        "maxDepthClamped": max_depth_clamped,
        "depthTruncated": false
    }

    var root_data = build_scene_tree_node(scene_root, scene_root, 0, max_depth, options, summary, limits)
    var result = {
        "success": true,
        "projectPath": params.project_path if params.has("project_path") else ProjectSettings.globalize_path("res://"),
        "scenePath": scene_path,
        "root": root_data,
        "summary": summary,
        "limits": limits
    }

    print(JSON.stringify(result))
    scene_root.free()

func layout_add_warning(warnings, code, message):
    warnings.append({
        "code": code,
        "message": message
    })

func layout_empty_bounds(space):
    return {
        "available": false,
        "space": space,
        "position": null,
        "size": null,
        "center": null,
        "min": null,
        "max": null
    }

func layout_bounds_from_arrays(min_values, max_values, space):
    var size_values = []
    var center_values = []
    for index in range(min_values.size()):
        var size_value = max_values[index] - min_values[index]
        size_values.append(size_value)
        center_values.append(min_values[index] + size_value / 2.0)

    return {
        "available": true,
        "space": space,
        "position": min_values,
        "size": size_values,
        "center": center_values,
        "min": min_values,
        "max": max_values
    }

func layout_rect2_to_bounds(rect, space="global"):
    return layout_bounds_from_arrays(
        vector2_to_array(rect.position),
        vector2_to_array(rect.position + rect.size),
        space
    )

func layout_aabb_to_bounds(aabb, space="global"):
    return layout_bounds_from_arrays(
        vector3_to_array(aabb.position),
        vector3_to_array(aabb.position + aabb.size),
        space
    )

func layout_transform2d_bounds(transform, local_min, local_max, space="global"):
    var points = [
        transform * local_min,
        transform * Vector2(local_max.x, local_min.y),
        transform * local_max,
        transform * Vector2(local_min.x, local_max.y)
    ]
    var min_x = points[0].x
    var min_y = points[0].y
    var max_x = points[0].x
    var max_y = points[0].y
    for point in points:
        min_x = min(min_x, point.x)
        min_y = min(min_y, point.y)
        max_x = max(max_x, point.x)
        max_y = max(max_y, point.y)

    return layout_bounds_from_arrays([min_x, min_y], [max_x, max_y], space)

func layout_points2d_bounds(transform, points, space="global"):
    if points.is_empty():
        return layout_empty_bounds(space)

    var first_point = transform * points[0]
    var min_x = first_point.x
    var min_y = first_point.y
    var max_x = first_point.x
    var max_y = first_point.y
    for point in points:
        var transformed = transform * point
        min_x = min(min_x, transformed.x)
        min_y = min(min_y, transformed.y)
        max_x = max(max_x, transformed.x)
        max_y = max(max_y, transformed.y)

    return layout_bounds_from_arrays([min_x, min_y], [max_x, max_y], space)

func layout_transform3d_aabb(transform, aabb, space="global"):
    var min_corner = aabb.position
    var max_corner = aabb.position + aabb.size
    var corners = [
        Vector3(min_corner.x, min_corner.y, min_corner.z),
        Vector3(max_corner.x, min_corner.y, min_corner.z),
        Vector3(min_corner.x, max_corner.y, min_corner.z),
        Vector3(max_corner.x, max_corner.y, min_corner.z),
        Vector3(min_corner.x, min_corner.y, max_corner.z),
        Vector3(max_corner.x, min_corner.y, max_corner.z),
        Vector3(min_corner.x, max_corner.y, max_corner.z),
        Vector3(max_corner.x, max_corner.y, max_corner.z)
    ]

    var first_corner = transform * corners[0]
    var min_x = first_corner.x
    var min_y = first_corner.y
    var min_z = first_corner.z
    var max_x = first_corner.x
    var max_y = first_corner.y
    var max_z = first_corner.z

    for corner in corners:
        var transformed = transform * corner
        min_x = min(min_x, transformed.x)
        min_y = min(min_y, transformed.y)
        min_z = min(min_z, transformed.z)
        max_x = max(max_x, transformed.x)
        max_y = max(max_y, transformed.y)
        max_z = max(max_z, transformed.z)

    return layout_bounds_from_arrays([min_x, min_y, min_z], [max_x, max_y, max_z], space)

func layout_union_bounds(existing, candidate):
    if candidate == null or not candidate.has("available") or not candidate["available"]:
        return existing
    if existing == null or not existing.has("available") or not existing["available"]:
        return candidate.duplicate(true)
    if existing["min"].size() != candidate["min"].size():
        return existing

    var min_values = []
    var max_values = []
    for index in range(existing["min"].size()):
        min_values.append(min(existing["min"][index], candidate["min"][index]))
        max_values.append(max(existing["max"][index], candidate["max"][index]))

    return layout_bounds_from_arrays(min_values, max_values, existing["space"])

func layout_node_visible(node):
    if node is CanvasItem:
        return node.visible
    if node is Node3D:
        return node.visible
    return true

func layout_node_transform(node):
    if node is Control:
        return {
            "localPosition": vector2_to_array(node.position),
            "globalPosition": vector2_to_array(node.global_position),
            "localScale": vector2_to_array(node.scale),
            "size": vector2_to_array(node.size),
            "rotation": node.rotation
        }

    if node is Node2D:
        return {
            "localPosition": vector2_to_array(node.position),
            "globalPosition": vector2_to_array(node.global_position),
            "localScale": vector2_to_array(node.scale),
            "globalScale": vector2_to_array(node.global_scale),
            "rotation": node.rotation,
            "globalRotation": node.global_rotation
        }

    if node is Node3D:
        return {
            "localPosition": vector3_to_array(node.position),
            "globalPosition": vector3_to_array(node.global_position),
            "localScale": vector3_to_array(node.scale),
            "globalScale": vector3_to_array(node.global_transform.basis.get_scale()),
            "rotation": vector3_to_array(node.rotation),
            "globalRotation": vector3_to_array(node.global_rotation)
        }

    return null

func layout_control_rect(node):
    if not (node is Control):
        return null
    var rect = node.get_global_rect()
    return layout_rect2_to_bounds(rect, "global")

func layout_add_resource(resources, property_name, resource):
    if resource == null or not (resource is Resource):
        return
    if resource.resource_path.is_empty():
        return

    resources.append({
        "property": property_name,
        "path": resource.resource_path,
        "type": resource.get_class()
    })

func layout_collect_resources(node):
    var resources = []
    if node is Sprite2D:
        layout_add_resource(resources, "texture", node.texture)
    if node is TextureRect:
        layout_add_resource(resources, "texture", node.texture)
    if node is CollisionShape2D:
        layout_add_resource(resources, "shape", node.shape)
    if node is CollisionShape3D:
        layout_add_resource(resources, "shape", node.shape)
    if node is MeshInstance3D:
        layout_add_resource(resources, "mesh", node.mesh)
    if node is AudioStreamPlayer:
        layout_add_resource(resources, "stream", node.stream)
    if node is AudioStreamPlayer2D:
        layout_add_resource(resources, "stream", node.stream)
    if node is AudioStreamPlayer3D:
        layout_add_resource(resources, "stream", node.stream)
    return resources

func layout_sprite2d_bounds(node, warnings):
    if node.texture == null:
        layout_add_warning(warnings, "MISSING_TEXTURE", "Sprite2D has no texture, so visual bounds are unavailable.")
        return layout_empty_bounds("global")

    var texture_size = node.texture.get_size()
    if node.hframes > 0:
        texture_size.x = texture_size.x / node.hframes
    if node.vframes > 0:
        texture_size.y = texture_size.y / node.vframes

    var local_min = Vector2.ZERO
    if node.centered:
        local_min = -texture_size / 2.0
    local_min += node.offset
    var local_max = local_min + texture_size

    if not is_nearly_zero(node.global_rotation):
        layout_add_warning(warnings, "APPROXIMATE_BOUNDS", "Visual bounds are approximate because rotation is applied.")

    return layout_transform2d_bounds(node.global_transform, local_min, local_max, "global")

func layout_mesh_instance_bounds(node, warnings):
    if node.mesh == null:
        layout_add_warning(warnings, "MISSING_MESH", "MeshInstance3D has no mesh, so visual bounds are unavailable.")
        return layout_empty_bounds("global")

    layout_add_warning(warnings, "APPROXIMATE_3D_BOUNDS", "3D visual bounds are an approximate transformed mesh AABB.")
    return layout_transform3d_aabb(node.global_transform, node.mesh.get_aabb(), "global")

func layout_visual_bounds(node, warnings):
    if node is Sprite2D:
        return layout_sprite2d_bounds(node, warnings)
    if node is TextureRect:
        return layout_control_rect(node)
    if node is MeshInstance3D:
        return layout_mesh_instance_bounds(node, warnings)
    return layout_empty_bounds("global")

func layout_collision_shape2d_bounds(node, warnings):
    if node.shape == null:
        layout_add_warning(warnings, "UNSUPPORTED_COLLISION_SHAPE", "CollisionShape2D has no shape, so collision bounds are unavailable.")
        var missing_bounds = layout_empty_bounds("global")
        missing_bounds["disabled"] = node.disabled
        missing_bounds["shapeType"] = null
        return missing_bounds

    var shape = node.shape
    var bounds = layout_empty_bounds("global")
    if shape is RectangleShape2D:
        var half_size = shape.size / 2.0
        bounds = layout_transform2d_bounds(node.global_transform, -half_size, half_size, "global")
    elif shape is CircleShape2D:
        var radius = shape.radius
        bounds = layout_transform2d_bounds(node.global_transform, Vector2(-radius, -radius), Vector2(radius, radius), "global")
    elif shape is CapsuleShape2D:
        var capsule_half = Vector2(shape.radius, shape.height / 2.0)
        bounds = layout_transform2d_bounds(node.global_transform, -capsule_half, capsule_half, "global")
        layout_add_warning(warnings, "APPROXIMATE_BOUNDS", "CapsuleShape2D bounds are approximate.")
    elif shape is SegmentShape2D:
        bounds = layout_points2d_bounds(node.global_transform, [shape.a, shape.b], "global")
    else:
        layout_add_warning(warnings, "UNSUPPORTED_COLLISION_SHAPE", "CollisionShape2D shape type is not supported for bounds.")

    bounds["disabled"] = node.disabled
    bounds["shapeType"] = shape.get_class()
    return bounds

func layout_collision_polygon2d_bounds(node, warnings):
    if node.polygon.is_empty():
        layout_add_warning(warnings, "UNSUPPORTED_COLLISION_SHAPE", "CollisionPolygon2D has no polygon points.")
        return layout_empty_bounds("global")

    return layout_points2d_bounds(node.global_transform, node.polygon, "global")

func layout_collision_shape3d_bounds(node, warnings):
    if node.shape == null:
        layout_add_warning(warnings, "UNSUPPORTED_COLLISION_SHAPE_3D", "CollisionShape3D has no shape, so collision bounds are unavailable.")
        var missing_bounds = layout_empty_bounds("global")
        missing_bounds["disabled"] = node.disabled
        missing_bounds["shapeType"] = null
        return missing_bounds

    var shape = node.shape
    var bounds = layout_empty_bounds("global")
    if shape is BoxShape3D:
        bounds = layout_transform3d_aabb(node.global_transform, AABB(-shape.size / 2.0, shape.size), "global")
    elif shape is SphereShape3D:
        var sphere_size = Vector3(shape.radius * 2.0, shape.radius * 2.0, shape.radius * 2.0)
        bounds = layout_transform3d_aabb(node.global_transform, AABB(-sphere_size / 2.0, sphere_size), "global")
    elif shape is CapsuleShape3D:
        var capsule_size = Vector3(shape.radius * 2.0, shape.height, shape.radius * 2.0)
        bounds = layout_transform3d_aabb(node.global_transform, AABB(-capsule_size / 2.0, capsule_size), "global")
        layout_add_warning(warnings, "APPROXIMATE_3D_BOUNDS", "CapsuleShape3D bounds are approximate.")
    else:
        layout_add_warning(warnings, "UNSUPPORTED_COLLISION_SHAPE_3D", "CollisionShape3D shape type is not supported for bounds.")

    bounds["disabled"] = node.disabled
    bounds["shapeType"] = shape.get_class()
    return bounds

func layout_collision_bounds(node, warnings):
    if node is CollisionShape2D:
        return layout_collision_shape2d_bounds(node, warnings)
    if node is CollisionPolygon2D:
        return layout_collision_polygon2d_bounds(node, warnings)
    if node is CollisionShape3D:
        return layout_collision_shape3d_bounds(node, warnings)
    return layout_empty_bounds("global")

func layout_update_summary_for_node(node, visible, depth, summary):
    var node_type = node.get_class()
    summary["totalNodes"] += 1
    if visible:
        summary["visibleNodes"] += 1
    else:
        summary["hiddenNodes"] += 1
    summary["maxDepthReached"] = max(summary["maxDepthReached"], depth)
    if not summary["nodeTypes"].has(node_type):
        summary["nodeTypes"][node_type] = 0
    summary["nodeTypes"][node_type] += 1

func layout_parent_path(node, root):
    if node == root or node.get_parent() == null:
        return null
    return get_scene_node_path(node.get_parent(), root)

func collect_scene_layout_node(node, root, depth, max_depth, options, summary, scene_bounds, flat_nodes):
    var visible = layout_node_visible(node)
    if not options["includeHidden"] and not visible:
        return null

    layout_update_summary_for_node(node, visible, depth, summary)

    var warnings = []
    var node_path = get_scene_node_path(node, root)
    var node_data = {
        "path": node_path,
        "name": str(node.name),
        "type": node.get_class(),
        "parentPath": layout_parent_path(node, root),
        "depth": depth,
        "visible": visible,
        "transform": layout_node_transform(node)
    }

    if options["includeVisualBounds"]:
        var visual_bounds = layout_visual_bounds(node, warnings)
        node_data["visualBounds"] = visual_bounds
        if visual_bounds["available"]:
            summary["nodesWithVisualBounds"] += 1
            scene_bounds["visual"] = layout_union_bounds(scene_bounds["visual"], visual_bounds)

    if options["includeCollisionBounds"]:
        var collision_bounds = layout_collision_bounds(node, warnings)
        node_data["collisionBounds"] = collision_bounds
        if collision_bounds["available"]:
            summary["nodesWithCollisionBounds"] += 1
            scene_bounds["collision"] = layout_union_bounds(scene_bounds["collision"], collision_bounds)

    if options["includeControlRects"]:
        var control_rect = layout_control_rect(node)
        node_data["controlRect"] = control_rect
        if control_rect != null and control_rect["available"]:
            summary["nodesWithControlRects"] += 1

    if options["includeResources"]:
        node_data["resources"] = layout_collect_resources(node)

    if options["includeChildren"]:
        node_data["children"] = []

    if depth >= max_depth:
        if node.get_child_count() > 0:
            summary["depthTruncated"] = true
            layout_add_warning(warnings, "DEPTH_TRUNCATED", "Scene layout traversal was truncated by maxDepth.")
        if options["includeWarnings"]:
            node_data["warnings"] = warnings
        flat_nodes.append(node_data)
        return node_data

    flat_nodes.append(node_data)
    for child in node.get_children():
        var child_data = collect_scene_layout_node(child, root, depth + 1, max_depth, options, summary, scene_bounds, flat_nodes)
        if options["includeChildren"] and child_data != null:
            node_data["children"].append(child_data)

    if options["includeWarnings"]:
        node_data["warnings"] = warnings
    return node_data

func get_scene_layout(params):
    if not params.has("scene_path"):
        print_json_error("MISSING_SCENE_PATH", "scene_path is required.")
        return

    var scene_path = normalize_resource_scene_path(params.scene_path)
    var max_depth = params.max_depth if params.has("max_depth") else 100
    var max_depth_requested = params.max_depth_requested if params.has("max_depth_requested") else null
    var max_depth_clamped = params.max_depth_clamped if params.has("max_depth_clamped") else false
    var project_path = params.project_path if params.has("project_path") else ProjectSettings.globalize_path("res://")

    var options = {
        "includeHidden": params.include_hidden if params.has("include_hidden") else true,
        "includeVisualBounds": params.include_visual_bounds if params.has("include_visual_bounds") else true,
        "includeCollisionBounds": params.include_collision_bounds if params.has("include_collision_bounds") else true,
        "includeControlRects": params.include_control_rects if params.has("include_control_rects") else true,
        "includeResources": params.include_resources if params.has("include_resources") else true,
        "includeChildren": params.include_children if params.has("include_children") else false,
        "includeWarnings": params.include_warnings if params.has("include_warnings") else true
    }

    if not FileAccess.file_exists(scene_path):
        print_json_error("SCENE_PATH_NOT_FOUND", "Scene file does not exist: " + scene_path)
        return

    var scene_resource = ResourceLoader.load(scene_path)
    if scene_resource == null or not (scene_resource is PackedScene):
        print_json_error("SCENE_LOAD_FAILED", "Failed to load scene as PackedScene: " + scene_path)
        return

    var scene_root = scene_resource.instantiate()
    if scene_root == null:
        print_json_error("SCENE_INSTANTIATE_FAILED", "Failed to instantiate scene: " + scene_path)
        return

    var summary = {
        "totalNodes": 0,
        "visibleNodes": 0,
        "hiddenNodes": 0,
        "nodesWithVisualBounds": 0,
        "nodesWithCollisionBounds": 0,
        "nodesWithControlRects": 0,
        "maxDepthReached": 0,
        "depthTruncated": false,
        "nodeTypes": {}
    }
    var scene_bounds = {
        "visual": layout_empty_bounds("global"),
        "collision": layout_empty_bounds("global")
    }
    var nodes = []
    collect_scene_layout_node(scene_root, scene_root, 0, max_depth, options, summary, scene_bounds, nodes)

    var result = {
        "success": true,
        "projectPath": project_path,
        "scenePath": scene_path,
        "rootType": scene_root.get_class(),
        "coordinateSpace": "scene",
        "nodes": nodes,
        "summary": summary,
        "sceneBounds": scene_bounds,
        "limits": {
            "maxDepthRequested": max_depth_requested,
            "maxDepthApplied": max_depth,
            "maxDepthClamped": max_depth_clamped
        }
    }

    print(JSON.stringify(result))
    scene_root.free()

func capture_preview_error(error_code, message, warnings=[]):
    return {
        "success": false,
        "error": error_code,
        "message": message,
        "warnings": warnings
    }

func capture_preview_add_warning(warnings, code, message):
    warnings.append({
        "code": code,
        "message": message
    })

func capture_preview_timestamp():
    var datetime = Time.get_datetime_dict_from_system(true)
    return "%04d-%02d-%02dT%02d:%02d:%02dZ" % [
        datetime["year"],
        datetime["month"],
        datetime["day"],
        datetime["hour"],
        datetime["minute"],
        datetime["second"]
    ]

func capture_preview_has_camera(node):
    if node is Camera2D or node is Camera3D:
        return true

    for child in node.get_children():
        if capture_preview_has_camera(child):
            return true

    return false

func capture_preview_file_size(path):
    var file = FileAccess.open(path, FileAccess.READ)
    if file == null:
        return 0
    var size = file.get_length()
    file.close()
    return size

func capture_scene_preview(params):
    if not params.has("scene_path"):
        print(JSON.stringify(capture_preview_error("MISSING_SCENE_PATH", "scene_path is required.")))
        return

    if not params.has("preview_path"):
        print(JSON.stringify(capture_preview_error("CAPTURE_SCENE_PREVIEW_FAILED", "preview_path is required.")))
        return

    var scene_path = normalize_resource_scene_path(params.scene_path)
    var preview_path = normalize_resource_scene_path(params.preview_path)
    var metadata_path = normalize_resource_scene_path(params.metadata_path) if params.has("metadata_path") and params.metadata_path != null else null
    var project_path = params.project_path if params.has("project_path") else ProjectSettings.globalize_path("res://")
    var width = int(params.width) if params.has("width") else 1280
    var height = int(params.height) if params.has("height") else 720
    var transparent = params.transparent if params.has("transparent") else false
    var include_metadata = params.include_metadata if params.has("include_metadata") else true
    var max_wait_frames = int(params.max_wait_frames) if params.has("max_wait_frames") else 3
    var max_wait_frames_requested = params.max_wait_frames_requested if params.has("max_wait_frames_requested") else null
    var max_wait_frames_clamped = params.max_wait_frames_clamped if params.has("max_wait_frames_clamped") else false
    var width_requested = params.width_requested if params.has("width_requested") else null
    var height_requested = params.height_requested if params.has("height_requested") else null
    var width_clamped = params.width_clamped if params.has("width_clamped") else false
    var height_clamped = params.height_clamped if params.has("height_clamped") else false
    var warnings = []

    if not FileAccess.file_exists(scene_path):
        print(JSON.stringify(capture_preview_error("SCENE_PATH_NOT_FOUND", "Scene file does not exist: " + scene_path, warnings)))
        return

    var scene_resource = ResourceLoader.load(scene_path)
    if scene_resource == null or not (scene_resource is PackedScene):
        print(JSON.stringify(capture_preview_error("SCENE_LOAD_FAILED", "Failed to load scene as PackedScene: " + scene_path, warnings)))
        return

    var scene_root = scene_resource.instantiate()
    if scene_root == null:
        print(JSON.stringify(capture_preview_error("SCENE_INSTANTIATE_FAILED", "Failed to instantiate scene: " + scene_path, warnings)))
        return

    if not capture_preview_has_camera(scene_root):
        capture_preview_add_warning(warnings, "NO_CAMERA_FOUND", "No Camera2D or Camera3D was found in the scene.")
        capture_preview_add_warning(warnings, "PREVIEW_MAY_BE_EMPTY", "Preview may be empty or use the default viewport transform.")

    var viewport = SubViewport.new()
    viewport.size = Vector2i(width, height)
    viewport.transparent_bg = transparent
    viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
    viewport.disable_3d = false
    viewport.gui_disable_input = true

    get_root().add_child(viewport)
    viewport.add_child(scene_root)

    for _frame_index in range(max_wait_frames):
        await process_frame

    RenderingServer.force_draw(false)
    await process_frame

    var texture = viewport.get_texture()
    if texture == null:
        viewport.remove_child(scene_root)
        scene_root.free()
        viewport.queue_free()
        print(JSON.stringify(capture_preview_error("VIEWPORT_RENDER_FAILED", "SubViewport did not produce a texture.", warnings)))
        return

    var image = texture.get_image()
    if image == null or image.get_width() <= 0 or image.get_height() <= 0:
        viewport.remove_child(scene_root)
        scene_root.free()
        viewport.queue_free()
        print(JSON.stringify(capture_preview_error("IMAGE_CAPTURE_FAILED", "Failed to capture a preview image from the viewport.", warnings)))
        return

    var save_result = image.save_png(preview_path)
    if save_result != OK:
        viewport.remove_child(scene_root)
        scene_root.free()
        viewport.queue_free()
        print(JSON.stringify(capture_preview_error("PREVIEW_SAVE_FAILED", "Failed to save preview PNG to: " + preview_path, warnings)))
        return

    var captured_at = capture_preview_timestamp()
    var metadata_written = false
    if include_metadata and metadata_path != null:
        var metadata = {
            "scenePath": scene_path,
            "previewPath": preview_path,
            "capturedAt": captured_at,
            "width": width,
            "height": height,
            "transparent": transparent
        }
        var metadata_file = FileAccess.open(metadata_path, FileAccess.WRITE)
        if metadata_file == null:
            capture_preview_add_warning(warnings, "METADATA_WRITE_SKIPPED", "Metadata JSON could not be opened for writing.")
        else:
            metadata_file.store_string(JSON.stringify(metadata, "  "))
            metadata_file.close()
            metadata_written = true

    var result = {
        "success": true,
        "projectPath": project_path,
        "scenePath": scene_path,
        "previewPath": preview_path,
        "metadataPath": metadata_path if metadata_written else null,
        "created": true,
        "width": width,
        "height": height,
        "transparent": transparent,
        "warnings": warnings,
        "summary": {
            "outputSizeBytes": capture_preview_file_size(preview_path),
            "metadataWritten": metadata_written,
            "maxWaitFramesRequested": max_wait_frames_requested,
            "maxWaitFramesApplied": max_wait_frames,
            "maxWaitFramesClamped": max_wait_frames_clamped,
            "widthRequested": width_requested,
            "heightRequested": height_requested,
            "widthClamped": width_clamped,
            "heightClamped": height_clamped
        }
    }

    print(JSON.stringify(result))
    viewport.remove_child(scene_root)
    scene_root.free()
    viewport.queue_free()

func dry_align_error(error_code, message):
    return {
        "success": false,
        "error": error_code,
        "message": message
    }

func dry_align_add_issue(issues, severity, code, message, operation_index=-1, operation_type=null, node_path=null, suggestion=null):
    var issue = {
        "severity": severity,
        "code": code,
        "message": message
    }

    if operation_index != -1:
        issue["operationIndex"] = operation_index
    if operation_type != null:
        issue["operationType"] = operation_type
    if node_path != null:
        issue["nodePath"] = node_path
    if suggestion != null:
        issue["suggestion"] = suggestion

    issues.append(issue)

func dry_align_issue_counts(issues):
    var counts = {
        "errorCount": 0,
        "warningCount": 0,
        "infoCount": 0
    }
    for issue in issues:
        if issue.has("severity") and issue["severity"] == "error":
            counts["errorCount"] += 1
        elif issue.has("severity") and issue["severity"] == "warning":
            counts["warningCount"] += 1
        elif issue.has("severity") and issue["severity"] == "info":
            counts["infoCount"] += 1
    return counts

func dry_align_severity_from_counts(counts):
    if counts["errorCount"] > 0:
        return "error"
    if counts["warningCount"] > 0:
        return "warning"
    if counts["infoCount"] > 0:
        return "info"
    return "ok"

func dry_align_allowed_bounds_source(source):
    return source == "visual" or source == "collision" or source == "control" or source == "transform"

func dry_align_is_number_array_any_size(value, allowed_sizes):
    if typeof(value) != TYPE_ARRAY:
        return false
    if not allowed_sizes.has(value.size()):
        return false
    for item in value:
        if typeof(item) != TYPE_INT and typeof(item) != TYPE_FLOAT:
            return false
    return true

func dry_align_zero_array(size):
    var result = []
    for _index in range(size):
        result.append(0)
    return result

func dry_align_duplicate_array(value):
    var result = []
    for item in value:
        result.append(item)
    return result

func dry_align_array_delta(proposed, current):
    var result = []
    for index in range(proposed.size()):
        result.append(proposed[index] - current[index])
    return result

func dry_align_parse_margin(value):
    if value == null:
        return {"success": true, "value": [0, 0]}
    if typeof(value) == TYPE_INT or typeof(value) == TYPE_FLOAT:
        return {"success": true, "value": [value, value]}
    if dry_align_is_number_array_any_size(value, [2]):
        return {"success": true, "value": [value[0], value[1]]}
    return {"success": false, "message": "margin must be a number or [x, y] array."}

func dry_align_bounds_available(bounds):
    if bounds == null or typeof(bounds) != TYPE_DICTIONARY:
        return false
    if not bounds.has("available") or not bounds["available"]:
        return false
    return bounds.has("min") and bounds.has("max") and bounds.has("center") and typeof(bounds["min"]) == TYPE_ARRAY and typeof(bounds["max"]) == TYPE_ARRAY and typeof(bounds["center"]) == TYPE_ARRAY

func dry_align_transform_bounds(layout_data):
    if layout_data == null or typeof(layout_data) != TYPE_DICTIONARY:
        return layout_empty_bounds("global")
    if not layout_data.has("transform") or layout_data["transform"] == null:
        return layout_empty_bounds("global")

    var transform_data = layout_data["transform"]
    if typeof(transform_data) != TYPE_DICTIONARY or not transform_data.has("globalPosition"):
        return layout_empty_bounds("global")

    var global_position = transform_data["globalPosition"]
    if not dry_align_is_number_array_any_size(global_position, [2, 3]):
        return layout_empty_bounds("global")

    return layout_bounds_from_arrays(global_position, global_position, "global")

func dry_align_get_bounds_by_name(layout_data, source):
    if source == "visual":
        if layout_data.has("visualBounds"):
            return layout_data["visualBounds"]
    elif source == "collision":
        if layout_data.has("collisionBounds"):
            return layout_data["collisionBounds"]
    elif source == "control":
        if layout_data.has("controlRect"):
            return layout_data["controlRect"]
    elif source == "transform":
        return dry_align_transform_bounds(layout_data)
    return null

func dry_align_candidate_sources(source):
    if source == "visual":
        return ["visual", "control", "transform"]
    if source == "collision":
        return ["collision", "visual", "transform"]
    if source == "control":
        return ["control", "visual", "transform"]
    return ["transform"]

func dry_align_select_bounds(layout_data, source, issues, operation_index, operation_type, node_path):
    if not dry_align_allowed_bounds_source(source):
        return {"success": false, "error": "INVALID_BOUNDS_SOURCE", "message": "Bounds source must be visual, collision, control, or transform."}

    for candidate_source in dry_align_candidate_sources(source):
        var bounds = dry_align_get_bounds_by_name(layout_data, candidate_source)
        if dry_align_bounds_available(bounds):
            if candidate_source != source:
                dry_align_add_issue(
                    issues,
                    "warning",
                    "BOUNDS_FALLBACK_USED",
                    "Requested bounds were unavailable; used " + candidate_source + " bounds instead.",
                    operation_index,
                    operation_type,
                    node_path
                )
            return {
                "success": true,
                "bounds": bounds,
                "source": candidate_source
            }

    return {"success": false, "error": "BOUNDS_UNAVAILABLE", "message": "No usable bounds or transform position are available."}

func dry_align_union_bounds_for_source(layout_nodes, source):
    var aggregate = layout_empty_bounds("global")
    for layout_data in layout_nodes:
        var bounds = dry_align_get_bounds_by_name(layout_data, source)
        if dry_align_bounds_available(bounds):
            aggregate = layout_union_bounds(aggregate, bounds)
    return aggregate

func dry_align_select_scene_bounds(scene_bounds, layout_nodes, source, issues, operation_index, operation_type):
    if not dry_align_allowed_bounds_source(source):
        return {"success": false, "error": "INVALID_BOUNDS_SOURCE", "message": "Bounds source must be visual, collision, control, or transform."}

    for candidate_source in dry_align_candidate_sources(source):
        var bounds = null
        if (candidate_source == "visual" or candidate_source == "collision") and scene_bounds.has(candidate_source):
            bounds = scene_bounds[candidate_source]
        else:
            bounds = dry_align_union_bounds_for_source(layout_nodes, candidate_source)

        if dry_align_bounds_available(bounds):
            if candidate_source != source:
                dry_align_add_issue(
                    issues,
                    "warning",
                    "BOUNDS_FALLBACK_USED",
                    "Requested scene bounds were unavailable; used " + candidate_source + " bounds instead.",
                    operation_index,
                    operation_type,
                    null
                )
            return {
                "success": true,
                "bounds": bounds,
                "source": candidate_source
            }

    return {"success": false, "error": "BOUNDS_UNAVAILABLE", "message": "No usable scene bounds are available."}

func dry_align_get_local_position(node):
    if node is Control:
        return vector2_to_array(node.position)
    if node is Node2D:
        return vector2_to_array(node.position)
    if node is Node3D:
        return vector3_to_array(node.position)
    return null

func dry_align_get_global_position(node):
    if node is Control:
        return vector2_to_array(node.global_position)
    if node is Node2D:
        return vector2_to_array(node.global_position)
    if node is Node3D:
        return vector3_to_array(node.global_position)
    return null

func dry_align_array_to_vector2(value):
    return Vector2(value[0], value[1])

func dry_align_array_to_vector3(value):
    return Vector3(value[0], value[1], value[2])

func dry_align_global_to_local_position(node, global_position):
    if not dry_align_is_number_array_any_size(global_position, [2, 3]):
        return null

    if node is Control or node is Node2D:
        if global_position.size() != 2:
            return null
        var parent = node.get_parent()
        if parent is CanvasItem:
            return vector2_to_array(parent.get_global_transform().affine_inverse() * dry_align_array_to_vector2(global_position))
        return [global_position[0], global_position[1]]

    if node is Node3D:
        if global_position.size() != 3:
            return null
        var parent_3d = node.get_parent()
        if parent_3d is Node3D:
            return vector3_to_array(parent_3d.global_transform.affine_inverse() * dry_align_array_to_vector3(global_position))
        return [global_position[0], global_position[1], global_position[2]]

    return null

func dry_align_local_to_global_position(node, local_position):
    if not dry_align_is_number_array_any_size(local_position, [2, 3]):
        return null

    if node is Control or node is Node2D:
        if local_position.size() != 2:
            return null
        var parent = node.get_parent()
        if parent is CanvasItem:
            return vector2_to_array(parent.get_global_transform() * dry_align_array_to_vector2(local_position))
        return [local_position[0], local_position[1]]

    if node is Node3D:
        if local_position.size() != 3:
            return null
        var parent_3d = node.get_parent()
        if parent_3d is Node3D:
            return vector3_to_array(parent_3d.global_transform * dry_align_array_to_vector3(local_position))
        return [local_position[0], local_position[1], local_position[2]]

    return null

func dry_align_append_plan_change(plan, operation_index, operation_type, node_path, current_local, proposed_local, current_global, proposed_global, reason):
    plan.append({
        "operationIndex": operation_index,
        "operationType": operation_type,
        "nodePath": node_path,
        "property": "position",
        "space": "local",
        "currentValue": current_local,
        "proposedValue": proposed_local,
        "delta": dry_align_array_delta(proposed_local, current_local),
        "currentGlobalPosition": current_global,
        "proposedGlobalPosition": proposed_global,
        "reason": reason
    })

func dry_align_plan_global_position(plan, issues, operation_index, operation_type, node_path, node, proposed_global, reason):
    var current_local = dry_align_get_local_position(node)
    var current_global = dry_align_get_global_position(node)
    if current_local == null or current_global == null:
        dry_align_add_issue(issues, "error", "UNSUPPORTED_NODE_DIMENSION", "Node does not expose a supported position property.", operation_index, operation_type, node_path)
        return
    if proposed_global.size() != current_global.size():
        dry_align_add_issue(issues, "error", "UNSUPPORTED_NODE_DIMENSION", "Proposed position dimension does not match the target node.", operation_index, operation_type, node_path)
        return

    var proposed_local = dry_align_global_to_local_position(node, proposed_global)
    if proposed_local == null:
        dry_align_add_issue(issues, "error", "UNSUPPORTED_NODE_DIMENSION", "Could not convert proposed global position to local position.", operation_index, operation_type, node_path)
        return

    dry_align_append_plan_change(plan, operation_index, operation_type, node_path, current_local, proposed_local, current_global, proposed_global, reason)

func dry_align_plan_local_position(plan, issues, operation_index, operation_type, node_path, node, proposed_local, reason):
    var current_local = dry_align_get_local_position(node)
    var current_global = dry_align_get_global_position(node)
    if current_local == null or current_global == null:
        dry_align_add_issue(issues, "error", "UNSUPPORTED_NODE_DIMENSION", "Node does not expose a supported position property.", operation_index, operation_type, node_path)
        return
    if proposed_local.size() != current_local.size():
        dry_align_add_issue(issues, "error", "UNSUPPORTED_NODE_DIMENSION", "Proposed position dimension does not match the target node.", operation_index, operation_type, node_path)
        return

    var proposed_global = dry_align_local_to_global_position(node, proposed_local)
    if proposed_global == null:
        dry_align_add_issue(issues, "error", "UNSUPPORTED_NODE_DIMENSION", "Could not convert proposed local position to global position.", operation_index, operation_type, node_path)
        return

    dry_align_append_plan_change(plan, operation_index, operation_type, node_path, current_local, proposed_local, current_global, proposed_global, reason)

func dry_align_collect_node_map(node, root, max_depth, depth, node_by_path):
    node_by_path[get_scene_node_path(node, root)] = node
    if depth >= max_depth:
        return
    for child in node.get_children():
        dry_align_collect_node_map(child, root, max_depth, depth + 1, node_by_path)

func dry_align_build_layout(scene_root, max_depth):
    var options = {
        "includeHidden": true,
        "includeVisualBounds": true,
        "includeCollisionBounds": true,
        "includeControlRects": true,
        "includeResources": false,
        "includeChildren": false,
        "includeWarnings": true
    }
    var summary = {
        "totalNodes": 0,
        "visibleNodes": 0,
        "hiddenNodes": 0,
        "nodesWithVisualBounds": 0,
        "nodesWithCollisionBounds": 0,
        "nodesWithControlRects": 0,
        "maxDepthReached": 0,
        "depthTruncated": false,
        "nodeTypes": {}
    }
    var scene_bounds = {
        "visual": layout_empty_bounds("global"),
        "collision": layout_empty_bounds("global")
    }
    var nodes = []
    collect_scene_layout_node(scene_root, scene_root, 0, max_depth, options, summary, scene_bounds, nodes)

    var layout_by_path = {}
    for layout_data in nodes:
        layout_by_path[layout_data["path"]] = layout_data

    var node_by_path = {}
    dry_align_collect_node_map(scene_root, scene_root, max_depth, 0, node_by_path)

    return {
        "nodes": nodes,
        "layoutByPath": layout_by_path,
        "nodeByPath": node_by_path,
        "sceneBounds": scene_bounds,
        "summary": summary
    }

func dry_align_normalize_node_path_for_operation(path_value, issues, operation_index, operation_type, code):
    var normalized = dry_run_normalize_scene_node_path(path_value)
    if normalized.has("error"):
        dry_align_add_issue(issues, "error", code, normalized["error"], operation_index, operation_type, str(path_value), "Use read_scene_tree or get_scene_layout to inspect valid node paths.")
        return null
    return normalized["path"]

func dry_align_find_node(path_value, node_by_path, issues, operation_index, operation_type, code):
    var node_path = dry_align_normalize_node_path_for_operation(path_value, issues, operation_index, operation_type, code)
    if node_path == null:
        return {"success": false}
    if not node_by_path.has(node_path):
        var message = "Target node was not found in the scene."
        if code == "REFERENCE_NODE_NOT_FOUND":
            message = "Reference node was not found in the scene."
        dry_align_add_issue(issues, "error", code, message, operation_index, operation_type, node_path, "Use read_scene_tree or get_scene_layout to inspect valid node paths.")
        return {"success": false}
    return {
        "success": true,
        "path": node_path,
        "node": node_by_path[node_path]
    }

func dry_align_get_node_paths(value, issues, operation_index, operation_type):
    if typeof(value) != TYPE_ARRAY or value.is_empty():
        dry_align_add_issue(issues, "error", "INVALID_OPERATION", "nodePaths must be a non-empty array.", operation_index, operation_type)
        return []
    return value

func dry_align_reference_data(operation, bounds_source, layout_by_path, node_by_path, layout_nodes, scene_bounds, issues, operation_index, operation_type):
    var reference = dry_run_get_value(operation, ["reference"], null)
    if typeof(reference) != TYPE_DICTIONARY:
        dry_align_add_issue(issues, "error", "INVALID_OPERATION", "reference is required and must be an object.", operation_index, operation_type)
        return {"success": false}

    var reference_type = dry_run_get_value(reference, ["type"], null)
    if typeof(reference_type) != TYPE_STRING:
        dry_align_add_issue(issues, "error", "INVALID_OPERATION", "reference.type must be node, scene_bounds, or point.", operation_index, operation_type)
        return {"success": false}
    reference_type = reference_type.strip_edges()

    var reference_bounds_source = dry_run_get_value(reference, ["bounds"], bounds_source)
    if typeof(reference_bounds_source) != TYPE_STRING or not dry_align_allowed_bounds_source(reference_bounds_source):
        dry_align_add_issue(issues, "error", "INVALID_BOUNDS_SOURCE", "reference.bounds must be visual, collision, control, or transform.", operation_index, operation_type)
        return {"success": false}

    if reference_type == "node":
        var reference_node_path = dry_run_get_value(reference, ["nodePath", "node_path"], null)
        var found = dry_align_find_node(reference_node_path, node_by_path, issues, operation_index, operation_type, "REFERENCE_NODE_NOT_FOUND")
        if not found["success"]:
            return {"success": false}
        var layout_data = layout_by_path[found["path"]]
        var selected = dry_align_select_bounds(layout_data, reference_bounds_source, issues, operation_index, operation_type, found["path"])
        if not selected["success"]:
            dry_align_add_issue(issues, "error", selected["error"], selected["message"], operation_index, operation_type, found["path"])
            return {"success": false}
        return {
            "success": true,
            "bounds": selected["bounds"],
            "position": dry_align_get_global_position(found["node"]),
            "path": found["path"],
            "type": reference_type
        }

    if reference_type == "scene_bounds":
        var selected_scene = dry_align_select_scene_bounds(scene_bounds, layout_nodes, reference_bounds_source, issues, operation_index, operation_type)
        if not selected_scene["success"]:
            dry_align_add_issue(issues, "error", selected_scene["error"], selected_scene["message"], operation_index, operation_type)
            return {"success": false}
        return {
            "success": true,
            "bounds": selected_scene["bounds"],
            "position": selected_scene["bounds"]["center"],
            "path": null,
            "type": reference_type
        }

    if reference_type == "point":
        var point = dry_run_get_value(reference, ["point"], null)
        if not dry_align_is_number_array_any_size(point, [2, 3]):
            dry_align_add_issue(issues, "error", "INVALID_OPERATION", "reference.point must be a numeric [x, y] or [x, y, z] array.", operation_index, operation_type)
            return {"success": false}
        return {
            "success": true,
            "bounds": layout_bounds_from_arrays(point, point, "global"),
            "position": point,
            "path": null,
            "type": reference_type
        }

    dry_align_add_issue(issues, "error", "INVALID_OPERATION", "reference.type must be node, scene_bounds, or point.", operation_index, operation_type)
    return {"success": false}

func dry_align_require_2d_bounds(bounds, issues, operation_index, operation_type, node_path):
    if not dry_align_bounds_available(bounds) or bounds["center"].size() != 2:
        dry_align_add_issue(issues, "error", "UNSUPPORTED_NODE_DIMENSION", "Bounds-based alignment is supported only for 2D bounds in this version.", operation_index, operation_type, node_path)
        return false
    return true

func dry_align_operation_align(operation, bounds_source, layout_by_path, node_by_path, layout_nodes, scene_bounds, issues, plan, operation_index):
    var operation_type = "align"
    var node_paths = dry_align_get_node_paths(dry_run_get_value(operation, ["nodePaths", "node_paths"], null), issues, operation_index, operation_type)
    if node_paths.is_empty():
        return

    var mode = dry_run_get_value(operation, ["mode"], null)
    var allowed_modes = ["left", "right", "top", "bottom", "center_x", "center_y", "center", "match_position"]
    if typeof(mode) != TYPE_STRING or not allowed_modes.has(mode):
        dry_align_add_issue(issues, "error", "INVALID_OPERATION", "align.mode is not supported.", operation_index, operation_type)
        return

    var margin_result = dry_align_parse_margin(dry_run_get_value(operation, ["margin"], null))
    if not margin_result["success"]:
        dry_align_add_issue(issues, "error", "INVALID_OPERATION", margin_result["message"], operation_index, operation_type)
        return
    var margin = margin_result["value"]

    var reference = dry_align_reference_data(operation, bounds_source, layout_by_path, node_by_path, layout_nodes, scene_bounds, issues, operation_index, operation_type)
    if not reference["success"]:
        return

    for path_value in node_paths:
        var found = dry_align_find_node(path_value, node_by_path, issues, operation_index, operation_type, "NODE_NOT_FOUND")
        if not found["success"]:
            continue

        var target_node = found["node"]
        var target_path = found["path"]
        var current_global = dry_align_get_global_position(target_node)
        if current_global == null:
            dry_align_add_issue(issues, "error", "UNSUPPORTED_NODE_DIMENSION", "Target node does not expose a supported global position.", operation_index, operation_type, target_path)
            continue

        if mode == "match_position":
            if reference["position"] == null or reference["position"].size() != current_global.size():
                dry_align_add_issue(issues, "error", "UNSUPPORTED_NODE_DIMENSION", "Reference position dimension does not match target node.", operation_index, operation_type, target_path)
                continue
            var proposed_match = dry_align_duplicate_array(reference["position"])
            if proposed_match.size() == 2:
                proposed_match[0] += margin[0]
                proposed_match[1] += margin[1]
            dry_align_plan_global_position(plan, issues, operation_index, operation_type, target_path, target_node, proposed_match, "Align " + target_path + " match_position to the reference with margin.")
            continue

        var target_bounds_selected = dry_align_select_bounds(layout_by_path[target_path], bounds_source, issues, operation_index, operation_type, target_path)
        if not target_bounds_selected["success"]:
            dry_align_add_issue(issues, "error", target_bounds_selected["error"], target_bounds_selected["message"], operation_index, operation_type, target_path)
            continue

        var target_bounds = target_bounds_selected["bounds"]
        var reference_bounds = reference["bounds"]
        if not dry_align_require_2d_bounds(target_bounds, issues, operation_index, operation_type, target_path):
            continue
        if not dry_align_require_2d_bounds(reference_bounds, issues, operation_index, operation_type, reference["path"]):
            continue

        var proposed_global = dry_align_duplicate_array(current_global)
        if mode == "left":
            proposed_global[0] += (reference_bounds["min"][0] + margin[0]) - target_bounds["min"][0]
        elif mode == "right":
            proposed_global[0] += (reference_bounds["max"][0] - margin[0]) - target_bounds["max"][0]
        elif mode == "top":
            proposed_global[1] += (reference_bounds["min"][1] + margin[1]) - target_bounds["min"][1]
        elif mode == "bottom":
            proposed_global[1] += (reference_bounds["max"][1] - margin[1]) - target_bounds["max"][1]
        elif mode == "center_x":
            proposed_global[0] += (reference_bounds["center"][0] + margin[0]) - target_bounds["center"][0]
        elif mode == "center_y":
            proposed_global[1] += (reference_bounds["center"][1] + margin[1]) - target_bounds["center"][1]
        elif mode == "center":
            proposed_global[0] += (reference_bounds["center"][0] + margin[0]) - target_bounds["center"][0]
            proposed_global[1] += (reference_bounds["center"][1] + margin[1]) - target_bounds["center"][1]

        dry_align_plan_global_position(plan, issues, operation_index, operation_type, target_path, target_node, proposed_global, "Align " + target_path + " using mode " + mode + ".")

func dry_align_operation_place_relative(operation, bounds_source, layout_by_path, node_by_path, issues, plan, operation_index):
    var operation_type = "place_relative"
    var found_target = dry_align_find_node(dry_run_get_value(operation, ["nodePath", "node_path"], null), node_by_path, issues, operation_index, operation_type, "NODE_NOT_FOUND")
    var found_reference = dry_align_find_node(dry_run_get_value(operation, ["referenceNodePath", "reference_node_path"], null), node_by_path, issues, operation_index, operation_type, "REFERENCE_NODE_NOT_FOUND")
    if not found_target["success"] or not found_reference["success"]:
        return

    var relation = dry_run_get_value(operation, ["relation"], null)
    var allowed_relations = ["left_of", "right_of", "above", "below", "centered_on", "inside_top_left", "inside_top_right", "inside_bottom_left", "inside_bottom_right"]
    if typeof(relation) != TYPE_STRING or not allowed_relations.has(relation):
        dry_align_add_issue(issues, "error", "INVALID_OPERATION", "place_relative.relation is not supported.", operation_index, operation_type, found_target["path"])
        return

    var preserve_axis = dry_run_get_value(operation, ["preserveAxis", "preserve_axis"], null)
    if preserve_axis != null and not (preserve_axis == "x" or preserve_axis == "y"):
        dry_align_add_issue(issues, "error", "INVALID_OPERATION", "preserveAxis must be x, y, or null.", operation_index, operation_type, found_target["path"])
        return

    var margin_result = dry_align_parse_margin(dry_run_get_value(operation, ["margin"], null))
    if not margin_result["success"]:
        dry_align_add_issue(issues, "error", "INVALID_OPERATION", margin_result["message"], operation_index, operation_type, found_target["path"])
        return
    var margin = margin_result["value"]

    var target_bounds_selected = dry_align_select_bounds(layout_by_path[found_target["path"]], bounds_source, issues, operation_index, operation_type, found_target["path"])
    var reference_bounds_selected = dry_align_select_bounds(layout_by_path[found_reference["path"]], bounds_source, issues, operation_index, operation_type, found_reference["path"])
    if not target_bounds_selected["success"]:
        dry_align_add_issue(issues, "error", target_bounds_selected["error"], target_bounds_selected["message"], operation_index, operation_type, found_target["path"])
        return
    if not reference_bounds_selected["success"]:
        dry_align_add_issue(issues, "error", reference_bounds_selected["error"], reference_bounds_selected["message"], operation_index, operation_type, found_reference["path"])
        return

    var target_bounds = target_bounds_selected["bounds"]
    var reference_bounds = reference_bounds_selected["bounds"]
    if not dry_align_require_2d_bounds(target_bounds, issues, operation_index, operation_type, found_target["path"]):
        return
    if not dry_align_require_2d_bounds(reference_bounds, issues, operation_index, operation_type, found_reference["path"]):
        return

    var target_node = found_target["node"]
    var current_global = dry_align_get_global_position(target_node)
    if current_global == null or current_global.size() != 2:
        dry_align_add_issue(issues, "error", "UNSUPPORTED_NODE_DIMENSION", "place_relative supports 2D Node2D/Control targets in this version.", operation_index, operation_type, found_target["path"])
        return

    var proposed_global = dry_align_duplicate_array(current_global)
    var shift_x = 0
    var shift_y = 0
    if relation == "left_of":
        shift_x = (reference_bounds["min"][0] - margin[0]) - target_bounds["max"][0]
    elif relation == "right_of":
        shift_x = (reference_bounds["max"][0] + margin[0]) - target_bounds["min"][0]
    elif relation == "above":
        shift_y = (reference_bounds["min"][1] - margin[1]) - target_bounds["max"][1]
    elif relation == "below":
        shift_y = (reference_bounds["max"][1] + margin[1]) - target_bounds["min"][1]
    elif relation == "centered_on":
        shift_x = (reference_bounds["center"][0] + margin[0]) - target_bounds["center"][0]
        shift_y = (reference_bounds["center"][1] + margin[1]) - target_bounds["center"][1]
    elif relation == "inside_top_left":
        shift_x = (reference_bounds["min"][0] + margin[0]) - target_bounds["min"][0]
        shift_y = (reference_bounds["min"][1] + margin[1]) - target_bounds["min"][1]
    elif relation == "inside_top_right":
        shift_x = (reference_bounds["max"][0] - margin[0]) - target_bounds["max"][0]
        shift_y = (reference_bounds["min"][1] + margin[1]) - target_bounds["min"][1]
    elif relation == "inside_bottom_left":
        shift_x = (reference_bounds["min"][0] + margin[0]) - target_bounds["min"][0]
        shift_y = (reference_bounds["max"][1] - margin[1]) - target_bounds["max"][1]
    elif relation == "inside_bottom_right":
        shift_x = (reference_bounds["max"][0] - margin[0]) - target_bounds["max"][0]
        shift_y = (reference_bounds["max"][1] - margin[1]) - target_bounds["max"][1]

    if preserve_axis != "x":
        proposed_global[0] += shift_x
    if preserve_axis != "y":
        proposed_global[1] += shift_y

    dry_align_plan_global_position(plan, issues, operation_index, operation_type, found_target["path"], target_node, proposed_global, "Place " + found_target["path"] + " " + relation + " " + found_reference["path"] + ".")

func dry_align_snap_value(value, grid_size, origin):
    return origin + round((value - origin) / grid_size) * grid_size

func dry_align_operation_snap_to_grid(operation, bounds_source, layout_by_path, node_by_path, issues, plan, operation_index):
    var operation_type = "snap_to_grid"
    var node_paths = dry_align_get_node_paths(dry_run_get_value(operation, ["nodePaths", "node_paths"], null), issues, operation_index, operation_type)
    if node_paths.is_empty():
        return

    var grid_size = dry_run_get_value(operation, ["gridSize", "grid_size"], null)
    if not dry_align_is_number_array_any_size(grid_size, [2, 3]):
        dry_align_add_issue(issues, "error", "INVALID_OPERATION", "gridSize must be a numeric [x, y] or [x, y, z] array.", operation_index, operation_type)
        return
    for component in grid_size:
        if component <= 0:
            dry_align_add_issue(issues, "error", "INVALID_OPERATION", "gridSize values must be greater than zero.", operation_index, operation_type)
            return

    var origin = dry_run_get_value(operation, ["origin"], null)
    if origin == null:
        origin = dry_align_zero_array(grid_size.size())
    if not dry_align_is_number_array_any_size(origin, [grid_size.size()]):
        dry_align_add_issue(issues, "error", "INVALID_OPERATION", "origin must match the gridSize dimension.", operation_index, operation_type)
        return

    var mode = dry_run_get_value(operation, ["mode"], "position")
    var allowed_modes = ["position", "bounds_min", "bounds_center"]
    if typeof(mode) != TYPE_STRING or not allowed_modes.has(mode):
        dry_align_add_issue(issues, "error", "INVALID_OPERATION", "snap_to_grid.mode must be position, bounds_min, or bounds_center.", operation_index, operation_type)
        return

    for path_value in node_paths:
        var found = dry_align_find_node(path_value, node_by_path, issues, operation_index, operation_type, "NODE_NOT_FOUND")
        if not found["success"]:
            continue

        var node = found["node"]
        var current_global = dry_align_get_global_position(node)
        if current_global == null:
            dry_align_add_issue(issues, "error", "UNSUPPORTED_NODE_DIMENSION", "Node does not expose a supported global position.", operation_index, operation_type, found["path"])
            continue

        var point = current_global
        if mode == "bounds_min" or mode == "bounds_center":
            var selected = dry_align_select_bounds(layout_by_path[found["path"]], bounds_source, issues, operation_index, operation_type, found["path"])
            if not selected["success"]:
                dry_align_add_issue(issues, "error", selected["error"], selected["message"], operation_index, operation_type, found["path"])
                continue
            if selected["bounds"]["center"].size() != 2:
                dry_align_add_issue(issues, "error", "UNSUPPORTED_NODE_DIMENSION", "Bounds-based snap_to_grid supports 2D bounds only in this version.", operation_index, operation_type, found["path"])
                continue
            point = selected["bounds"]["min"] if mode == "bounds_min" else selected["bounds"]["center"]

        if grid_size.size() > point.size():
            dry_align_add_issue(issues, "error", "UNSUPPORTED_NODE_DIMENSION", "gridSize dimension is larger than the target point dimension.", operation_index, operation_type, found["path"])
            continue

        var snapped_point = dry_align_duplicate_array(point)
        for index in range(grid_size.size()):
            snapped_point[index] = dry_align_snap_value(point[index], grid_size[index], origin[index])

        var proposed_global = dry_align_duplicate_array(current_global)
        for index in range(grid_size.size()):
            proposed_global[index] += snapped_point[index] - point[index]

        dry_align_plan_global_position(plan, issues, operation_index, operation_type, found["path"], node, proposed_global, "Snap " + found["path"] + " to grid using " + mode + ".")

func dry_align_operation_distribute(operation, node_by_path, issues, plan, operation_index):
    var operation_type = "distribute"
    var node_paths = dry_align_get_node_paths(dry_run_get_value(operation, ["nodePaths", "node_paths"], null), issues, operation_index, operation_type)
    if node_paths.size() < 3:
        dry_align_add_issue(issues, "error", "INVALID_OPERATION", "distribute.nodePaths must contain at least three nodes.", operation_index, operation_type)
        return

    var axis = dry_run_get_value(operation, ["axis"], null)
    if not (axis == "x" or axis == "y"):
        dry_align_add_issue(issues, "error", "INVALID_OPERATION", "distribute.axis must be x or y.", operation_index, operation_type)
        return
    var axis_index = 0 if axis == "x" else 1

    var spacing = dry_run_get_value(operation, ["spacing"], null)
    if spacing != null and not (typeof(spacing) == TYPE_INT or typeof(spacing) == TYPE_FLOAT):
        dry_align_add_issue(issues, "error", "INVALID_OPERATION", "distribute.spacing must be a number or null.", operation_index, operation_type)
        return

    var found_nodes = []
    for path_value in node_paths:
        var found = dry_align_find_node(path_value, node_by_path, issues, operation_index, operation_type, "NODE_NOT_FOUND")
        if not found["success"]:
            return
        var global_position = dry_align_get_global_position(found["node"])
        if global_position == null or global_position.size() != 2:
            dry_align_add_issue(issues, "error", "UNSUPPORTED_NODE_DIMENSION", "distribute supports 2D Node2D/Control nodes in this version.", operation_index, operation_type, found["path"])
            return
        found["globalPosition"] = global_position
        found_nodes.append(found)

    var anchor_value = found_nodes[0]["globalPosition"][axis_index]
    if spacing == null:
        var last_value = found_nodes[found_nodes.size() - 1]["globalPosition"][axis_index]
        spacing = (last_value - anchor_value) / float(found_nodes.size() - 1)
        for index in range(1, found_nodes.size() - 1):
            var item = found_nodes[index]
            var proposed_global = dry_align_duplicate_array(item["globalPosition"])
            proposed_global[axis_index] = anchor_value + spacing * index
            dry_align_plan_global_position(plan, issues, operation_index, operation_type, item["path"], item["node"], proposed_global, "Distribute " + item["path"] + " along the " + axis + " axis.")
    else:
        for index in range(1, found_nodes.size()):
            var item = found_nodes[index]
            var proposed_global = dry_align_duplicate_array(item["globalPosition"])
            proposed_global[axis_index] = anchor_value + spacing * index
            dry_align_plan_global_position(plan, issues, operation_index, operation_type, item["path"], item["node"], proposed_global, "Distribute " + item["path"] + " along the " + axis + " axis with fixed spacing.")

func dry_align_operation_set_position(operation, node_by_path, issues, plan, operation_index):
    var operation_type = "set_position"
    var node_paths = dry_align_get_node_paths(dry_run_get_value(operation, ["nodePaths", "node_paths"], null), issues, operation_index, operation_type)
    if node_paths.is_empty():
        return

    var position = dry_run_get_value(operation, ["position"], null)
    if not dry_align_is_number_array_any_size(position, [2, 3]):
        dry_align_add_issue(issues, "error", "INVALID_OPERATION", "set_position.position must be a numeric [x, y] or [x, y, z] array.", operation_index, operation_type)
        return

    var space = dry_run_get_value(operation, ["space"], "local")
    if not (space == "local" or space == "global"):
        dry_align_add_issue(issues, "error", "INVALID_OPERATION", "set_position.space must be local or global.", operation_index, operation_type)
        return

    for path_value in node_paths:
        var found = dry_align_find_node(path_value, node_by_path, issues, operation_index, operation_type, "NODE_NOT_FOUND")
        if not found["success"]:
            continue

        if space == "local":
            dry_align_plan_local_position(plan, issues, operation_index, operation_type, found["path"], found["node"], position, "Set " + found["path"] + " local position.")
        else:
            dry_align_plan_global_position(plan, issues, operation_index, operation_type, found["path"], found["node"], position, "Set " + found["path"] + " global position.")

func dry_align_compact_bounds(bounds):
    if not dry_align_bounds_available(bounds):
        return {
            "available": false,
            "position": null,
            "size": null,
            "center": null
        }
    return {
        "available": true,
        "position": bounds["position"],
        "size": bounds["size"],
        "center": bounds["center"],
        "min": bounds["min"],
        "max": bounds["max"]
    }

func dry_align_best_bounds_without_issues(layout_data, bounds_source):
    for candidate_source in dry_align_candidate_sources(bounds_source):
        var bounds = dry_align_get_bounds_by_name(layout_data, candidate_source)
        if dry_align_bounds_available(bounds):
            return bounds
    return layout_empty_bounds("global")

func dry_align_compact_layout_before(layout_nodes, scene_bounds, bounds_source):
    var compact_nodes = []
    for layout_data in layout_nodes:
        var position = null
        if layout_data.has("transform") and layout_data["transform"] != null and layout_data["transform"].has("globalPosition"):
            position = layout_data["transform"]["globalPosition"]
        compact_nodes.append({
            "path": layout_data["path"],
            "type": layout_data["type"],
            "position": position,
            "bounds": dry_align_compact_bounds(dry_align_best_bounds_without_issues(layout_data, bounds_source))
        })

    return {
        "nodes": compact_nodes,
        "sceneBounds": scene_bounds
    }

func dry_align_finish_result(project_path, scene_path, operations, processed_count, issues, plan, include_plan, include_layout_before, layout_data, bounds_source, limits):
    var counts = dry_align_issue_counts(issues)
    var severity = dry_align_severity_from_counts(counts)
    var result = {
        "success": true,
        "projectPath": project_path,
        "scenePath": scene_path,
        "valid": counts["errorCount"] == 0,
        "severity": severity,
        "summary": {
            "operationCount": processed_count,
            "plannedChangeCount": plan.size(),
            "errorCount": counts["errorCount"],
            "warningCount": counts["warningCount"],
            "infoCount": counts["infoCount"]
        },
        "issues": issues,
        "plan": plan if include_plan else [],
        "layoutBefore": dry_align_compact_layout_before(layout_data["nodes"], layout_data["sceneBounds"], bounds_source) if include_layout_before else null,
        "limits": limits
    }
    return result

func dry_align_has_error_issues(issues):
    for issue in issues:
        if issue.has("severity") and issue["severity"] == "error":
            return true
    return false

func dry_run_align_nodes_result(params, provided_scene_root=null):
    if not params.has("scene_path"):
        return dry_align_error("MISSING_SCENE_PATH", "scene_path is required.")
    if not params.has("operations") or typeof(params.operations) != TYPE_ARRAY or params.operations.is_empty():
        return dry_align_error("MISSING_OPERATIONS", "operations must be a non-empty array.")

    var scene_path = normalize_resource_scene_path(params.scene_path)
    var project_path = params.project_path if params.has("project_path") else ProjectSettings.globalize_path("res://")
    var operations = params.operations
    var bounds_source = params.bounds_source if params.has("bounds_source") else "visual"
    var include_plan = params.include_plan if params.has("include_plan") else true
    var include_layout_before = params.include_layout_before if params.has("include_layout_before") else false
    var max_operations = int(params.max_operations) if params.has("max_operations") else 50
    var max_depth = int(params.max_depth) if params.has("max_depth") else 100
    var limits = {
        "maxOperationsRequested": params.max_operations_requested if params.has("max_operations_requested") else null,
        "maxOperationsApplied": max_operations,
        "maxOperationsClamped": params.max_operations_clamped if params.has("max_operations_clamped") else false,
        "maxDepthRequested": params.max_depth_requested if params.has("max_depth_requested") else null,
        "maxDepthApplied": max_depth,
        "maxDepthClamped": params.max_depth_clamped if params.has("max_depth_clamped") else false
    }

    var scene_root = provided_scene_root
    var owns_scene_root = false
    if scene_root == null:
        if not FileAccess.file_exists(scene_path):
            return dry_align_error("SCENE_PATH_NOT_FOUND", "Scene file does not exist: " + scene_path)

        var scene_resource = ResourceLoader.load(scene_path)
        if scene_resource == null or not (scene_resource is PackedScene):
            return dry_align_error("SCENE_LOAD_FAILED", "Failed to load scene as PackedScene: " + scene_path)

        scene_root = scene_resource.instantiate()
        if scene_root == null:
            return dry_align_error("SCENE_INSTANTIATE_FAILED", "Failed to instantiate scene: " + scene_path)
        owns_scene_root = true

    var issues = []
    var plan = []
    var layout_data = dry_align_build_layout(scene_root, max_depth)
    var layout_summary = layout_data["summary"]
    if layout_summary.has("depthTruncated") and layout_summary["depthTruncated"]:
        dry_align_add_issue(issues, "warning", "DEPTH_TRUNCATED", "Scene tree traversal was truncated by maxDepth.", -1, null, str(scene_root.name), "Increase maxDepth if deeper nodes should be available to the alignment planner.")

    var processed_count = min(operations.size(), max_operations)
    if operations.size() > max_operations:
        dry_align_add_issue(issues, "warning", "OPERATIONS_TRUNCATED", "Only the first maxOperations operations were evaluated.", -1, null, null, "Increase maxOperations up to 500 if more operations should be planned.")

    var layout_by_path = layout_data["layoutByPath"]
    var node_by_path = layout_data["nodeByPath"]
    var layout_nodes = layout_data["nodes"]
    var scene_bounds = layout_data["sceneBounds"]

    for operation_index in range(processed_count):
        var operation = operations[operation_index]
        if typeof(operation) != TYPE_DICTIONARY:
            dry_align_add_issue(issues, "error", "INVALID_OPERATION", "Each operation must be an object.", operation_index, null)
            continue

        var operation_type = dry_run_get_value(operation, ["type"], null)
        if typeof(operation_type) != TYPE_STRING:
            dry_align_add_issue(issues, "error", "UNKNOWN_OPERATION_TYPE", "Operation type is required.", operation_index, null)
            continue
        operation_type = operation_type.strip_edges()

        if operation_type == "align":
            dry_align_operation_align(operation, bounds_source, layout_by_path, node_by_path, layout_nodes, scene_bounds, issues, plan, operation_index)
        elif operation_type == "place_relative":
            dry_align_operation_place_relative(operation, bounds_source, layout_by_path, node_by_path, issues, plan, operation_index)
        elif operation_type == "snap_to_grid":
            dry_align_operation_snap_to_grid(operation, bounds_source, layout_by_path, node_by_path, issues, plan, operation_index)
        elif operation_type == "distribute":
            dry_align_operation_distribute(operation, node_by_path, issues, plan, operation_index)
        elif operation_type == "set_position":
            dry_align_operation_set_position(operation, node_by_path, issues, plan, operation_index)
        else:
            dry_align_add_issue(issues, "error", "UNKNOWN_OPERATION_TYPE", "Operation type is not supported: " + operation_type, operation_index, operation_type)

    var result = dry_align_finish_result(project_path, scene_path, operations, processed_count, issues, plan, include_plan, include_layout_before, layout_data, bounds_source, limits)
    if owns_scene_root:
        scene_root.free()
    return result

func dry_run_align_nodes(params):
    print(JSON.stringify(dry_run_align_nodes_result(params)))

func align_nodes_error(error_code, message, issues=[]):
    return {
        "success": false,
        "error": error_code,
        "message": message,
        "issues": issues
    }

func align_nodes_array_close(a, b, epsilon=0.001):
    if typeof(a) != TYPE_ARRAY or typeof(b) != TYPE_ARRAY:
        return false
    if a.size() != b.size():
        return false
    for index in range(a.size()):
        if abs(a[index] - b[index]) > epsilon:
            return false
    return true

func align_nodes_set_local_position(node, value):
    if node is Control or node is Node2D:
        if not dry_align_is_number_array_any_size(value, [2]):
            return {"success": false, "error": "UNSUPPORTED_NODE_DIMENSION", "message": "2D nodes require a [x, y] position."}
        node.position = Vector2(value[0], value[1])
        return {"success": true}

    if node is Node3D:
        if not dry_align_is_number_array_any_size(value, [3]):
            return {"success": false, "error": "UNSUPPORTED_NODE_DIMENSION", "message": "3D nodes require a [x, y, z] position."}
        node.position = Vector3(value[0], value[1], value[2])
        return {"success": true}

    return {"success": false, "error": "UNSUPPORTED_NODE_DIMENSION", "message": "Node does not support local position assignment."}

func align_nodes_apply_plan(scene_root, max_depth, plan, issues):
    var node_by_path = {}
    dry_align_collect_node_map(scene_root, scene_root, max_depth, 0, node_by_path)
    var applied_changes = []

    for plan_item in plan:
        if typeof(plan_item) != TYPE_DICTIONARY:
            dry_align_add_issue(issues, "warning", "UNSUPPORTED_PLANNED_CHANGE", "Planned change was skipped because it was not an object.")
            continue

        var node_path = plan_item["nodePath"] if plan_item.has("nodePath") else null
        var property_name = plan_item["property"] if plan_item.has("property") else null
        var proposed_value = plan_item["proposedValue"] if plan_item.has("proposedValue") else null
        var space = plan_item["space"] if plan_item.has("space") else null

        if property_name != "position" or space != "local" or typeof(proposed_value) != TYPE_ARRAY:
            dry_align_add_issue(issues, "warning", "UNSUPPORTED_PLANNED_CHANGE", "Only local position changes are applied by align_nodes.", plan_item["operationIndex"] if plan_item.has("operationIndex") else -1, plan_item["operationType"] if plan_item.has("operationType") else null, node_path)
            continue

        if node_path == null or not node_by_path.has(node_path):
            dry_align_add_issue(issues, "error", "NODE_NOT_FOUND", "Planned target node was not found in the scene.", plan_item["operationIndex"] if plan_item.has("operationIndex") else -1, plan_item["operationType"] if plan_item.has("operationType") else null, node_path, "Run read_scene_tree or get_scene_layout to inspect current node paths.")
            return {"success": false, "error": "NODE_NOT_FOUND", "message": "A planned target node was not found.", "appliedChanges": applied_changes}

        var node = node_by_path[node_path]
        var old_value = dry_align_get_local_position(node)
        if old_value == null:
            dry_align_add_issue(issues, "error", "UNSUPPORTED_NODE_DIMENSION", "Node does not expose a supported local position.", plan_item["operationIndex"] if plan_item.has("operationIndex") else -1, plan_item["operationType"] if plan_item.has("operationType") else null, node_path)
            return {"success": false, "error": "UNSUPPORTED_NODE_DIMENSION", "message": "A planned target node cannot be positioned.", "appliedChanges": applied_changes}

        var set_result = align_nodes_set_local_position(node, proposed_value)
        if not set_result["success"]:
            dry_align_add_issue(issues, "error", set_result["error"], set_result["message"], plan_item["operationIndex"] if plan_item.has("operationIndex") else -1, plan_item["operationType"] if plan_item.has("operationType") else null, node_path)
            return {"success": false, "error": set_result["error"], "message": set_result["message"], "appliedChanges": applied_changes}

        applied_changes.append({
            "nodePath": node_path,
            "property": "position",
            "oldValue": old_value,
            "newValue": dry_align_duplicate_array(proposed_value),
            "delta": dry_align_array_delta(proposed_value, old_value)
        })

    return {
        "success": true,
        "appliedChanges": applied_changes
    }

func align_nodes_post_validate(scene_path, applied_changes, max_depth):
    var scene_resource = ResourceLoader.load(scene_path, "", ResourceLoader.CACHE_MODE_IGNORE)
    if scene_resource == null or not (scene_resource is PackedScene):
        return {
            "success": false,
            "message": "Saved scene could not be loaded as a PackedScene.",
            "postValidation": {
                "loadable": false,
                "instantiable": false,
                "positionChecksPassed": false,
                "checkedNodes": 0
            }
        }

    var scene_root = scene_resource.instantiate()
    if scene_root == null:
        return {
            "success": false,
            "message": "Saved scene could not be instantiated.",
            "postValidation": {
                "loadable": true,
                "instantiable": false,
                "positionChecksPassed": false,
                "checkedNodes": 0
            }
        }

    var node_by_path = {}
    dry_align_collect_node_map(scene_root, scene_root, max_depth, 0, node_by_path)
    var checked_nodes = 0
    var position_checks_passed = true

    for change in applied_changes:
        var node_path = change["nodePath"]
        if not node_by_path.has(node_path):
            position_checks_passed = false
            continue
        var node = node_by_path[node_path]
        var local_position = dry_align_get_local_position(node)
        if local_position == null or not align_nodes_array_close(local_position, change["newValue"]):
            position_checks_passed = false
        checked_nodes += 1

    scene_root.free()
    return {
        "success": position_checks_passed,
        "message": "Saved scene positions did not match the planned values." if not position_checks_passed else "Post-validation passed.",
        "postValidation": {
            "loadable": true,
            "instantiable": true,
            "positionChecksPassed": position_checks_passed,
            "checkedNodes": checked_nodes
        }
    }

func align_nodes_result(project_path, scene_path, dry_run_result, issues, plan, applied_changes, save_error, bytes_written, post_validation, layout_after, include_plan, applied, saved):
    var counts = dry_align_issue_counts(issues)
    var summary = dry_run_result["summary"].duplicate(true)
    summary["appliedChangeCount"] = applied_changes.size()
    summary["errorCount"] = counts["errorCount"]
    summary["warningCount"] = counts["warningCount"]
    summary["infoCount"] = counts["infoCount"]

    return {
        "success": true,
        "projectPath": project_path,
        "scenePath": scene_path,
        "applied": applied,
        "saved": saved,
        "valid": counts["errorCount"] == 0,
        "severity": dry_align_severity_from_counts(counts),
        "summary": summary,
        "issues": issues,
        "plan": plan if include_plan else [],
        "appliedChanges": applied_changes,
        "write": {
            "saved": saved,
            "resourceSaverCode": save_error,
            "bytesWritten": bytes_written
        },
        "postValidation": post_validation,
        "layoutBefore": dry_run_result["layoutBefore"] if dry_run_result.has("layoutBefore") else null,
        "layoutAfter": layout_after,
        "limits": dry_run_result["limits"]
    }

func align_nodes(params):
    if not params.has("scene_path"):
        print(JSON.stringify(align_nodes_error("MISSING_SCENE_PATH", "scene_path is required.")))
        return
    if not params.has("operations") or typeof(params.operations) != TYPE_ARRAY or params.operations.is_empty():
        print(JSON.stringify(align_nodes_error("MISSING_OPERATIONS", "operations must be a non-empty array.")))
        return

    var scene_path = normalize_resource_scene_path(params.scene_path)
    var project_path = params.project_path if params.has("project_path") else ProjectSettings.globalize_path("res://")
    var max_depth = int(params.max_depth) if params.has("max_depth") else 100
    var include_plan = params.include_plan if params.has("include_plan") else true
    var include_layout_after = params.include_layout_after if params.has("include_layout_after") else false
    var validate_after_write = params.validate_after_write if params.has("validate_after_write") else true

    if not FileAccess.file_exists(scene_path):
        print(JSON.stringify(align_nodes_error("SCENE_PATH_NOT_FOUND", "Scene file does not exist: " + scene_path)))
        return

    var scene_resource = ResourceLoader.load(scene_path)
    if scene_resource == null or not (scene_resource is PackedScene):
        print(JSON.stringify(align_nodes_error("SCENE_LOAD_FAILED", "Failed to load scene as PackedScene: " + scene_path)))
        return

    var scene_root = scene_resource.instantiate()
    if scene_root == null:
        print(JSON.stringify(align_nodes_error("SCENE_INSTANTIATE_FAILED", "Failed to instantiate scene: " + scene_path)))
        return

    var dry_run_params = params.duplicate(true)
    dry_run_params["scene_path"] = scene_path
    dry_run_params["include_plan"] = true
    var dry_run_result = dry_run_align_nodes_result(dry_run_params, scene_root)
    if not dry_run_result.has("success") or not dry_run_result["success"]:
        scene_root.free()
        print(JSON.stringify(align_nodes_error(
            dry_run_result["error"] if dry_run_result.has("error") else "ALIGN_NODES_FAILED",
            dry_run_result["message"] if dry_run_result.has("message") else "Alignment dry-run failed."
        )))
        return

    var issues = dry_run_result["issues"].duplicate(true)
    var plan = dry_run_result["plan"].duplicate(true)
    if dry_align_has_error_issues(issues):
        scene_root.free()
        var validation_error = align_nodes_error("DRY_RUN_VALIDATION_FAILED", "Alignment dry-run validation failed; scene was not written.", issues)
        validation_error["plan"] = plan if include_plan else []
        validation_error["layoutBefore"] = dry_run_result["layoutBefore"] if dry_run_result.has("layoutBefore") else null
        validation_error["limits"] = dry_run_result["limits"]
        print(JSON.stringify(validation_error))
        return

    if plan.is_empty():
        dry_align_add_issue(issues, "info", "NO_CHANGES_PLANNED", "Dry-run produced no applicable position changes.")
        scene_root.free()
        var no_change_result = align_nodes_result(project_path, scene_path, dry_run_result, issues, plan, [], null, 0, null, null, include_plan, false, false)
        print(JSON.stringify(no_change_result))
        return

    var apply_result = align_nodes_apply_plan(scene_root, max_depth, plan, issues)
    if not apply_result["success"] or dry_align_has_error_issues(issues):
        scene_root.free()
        var apply_error = align_nodes_error(apply_result["error"] if apply_result.has("error") else "APPLY_ALIGNMENT_FAILED", apply_result["message"] if apply_result.has("message") else "Failed to apply planned alignment changes.", issues)
        apply_error["plan"] = plan if include_plan else []
        apply_error["appliedChanges"] = apply_result["appliedChanges"] if apply_result.has("appliedChanges") else []
        apply_error["layoutBefore"] = dry_run_result["layoutBefore"] if dry_run_result.has("layoutBefore") else null
        apply_error["limits"] = dry_run_result["limits"]
        print(JSON.stringify(apply_error))
        return

    var applied_changes = apply_result["appliedChanges"]
    if applied_changes.is_empty():
        dry_align_add_issue(issues, "info", "NO_CHANGES_PLANNED", "No supported planned changes were applicable.")
        scene_root.free()
        var no_applicable_result = align_nodes_result(project_path, scene_path, dry_run_result, issues, plan, applied_changes, null, 0, null, null, include_plan, false, false)
        print(JSON.stringify(no_applicable_result))
        return

    var layout_after = null
    if include_layout_after:
        var layout_after_data = dry_align_build_layout(scene_root, max_depth)
        var bounds_source = params.bounds_source if params.has("bounds_source") else "visual"
        layout_after = dry_align_compact_layout_before(layout_after_data["nodes"], layout_after_data["sceneBounds"], bounds_source)

    var packed_scene = PackedScene.new()
    var pack_result = packed_scene.pack(scene_root)
    if pack_result != OK:
        scene_root.free()
        print(JSON.stringify(align_nodes_error("PACK_SCENE_FAILED", "Failed to pack the aligned scene; scene was not written.", issues)))
        return

    var save_error = ResourceSaver.save(packed_scene, scene_path)
    if save_error != OK:
        scene_root.free()
        print(JSON.stringify(align_nodes_error("SAVE_SCENE_FAILED", "Failed to save the aligned scene.", issues)))
        return

    var bytes_written = 0
    var file = FileAccess.open(scene_path, FileAccess.READ)
    if file != null:
        bytes_written = file.get_length()
        file.close()

    var post_validation = null
    if validate_after_write:
        var post_result = align_nodes_post_validate(scene_path, applied_changes, max_depth)
        post_validation = post_result["postValidation"]
        if not post_result["success"]:
            scene_root.free()
            var post_error = align_nodes_error("POST_VALIDATE_FAILED", post_result["message"], issues)
            post_error["plan"] = plan if include_plan else []
            post_error["appliedChanges"] = applied_changes
            post_error["write"] = {
                "saved": true,
                "resourceSaverCode": save_error,
                "bytesWritten": bytes_written
            }
            post_error["postValidation"] = post_validation
            post_error["layoutBefore"] = dry_run_result["layoutBefore"] if dry_run_result.has("layoutBefore") else null
            post_error["layoutAfter"] = layout_after
            post_error["limits"] = dry_run_result["limits"]
            print(JSON.stringify(post_error))
            return

    scene_root.free()
    var result = align_nodes_result(project_path, scene_path, dry_run_result, issues, plan, applied_changes, save_error, bytes_written, post_validation, layout_after, include_plan, true, true)
    print(JSON.stringify(result))

func place_asset_error(error_code, message):
    return {
        "success": false,
        "error": error_code,
        "message": message
    }

func place_asset_add_issue(issues, severity, code, message, node_path=null, asset_path=null, prop_name=null, suggestion=null):
    var issue = {
        "severity": severity,
        "code": code,
        "message": message
    }
    if node_path != null:
        issue["nodePath"] = node_path
    if asset_path != null:
        issue["asset"] = asset_path
    if prop_name != null:
        issue["property"] = prop_name
    if suggestion != null:
        issue["suggestion"] = suggestion
    issues.append(issue)

func place_asset_safe_node_name_from_asset(asset_path):
    var base_name = asset_path.get_file().get_basename()
    var safe_name = ""
    var capitalize_next = true
    var allowed = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

    for index in range(base_name.length()):
        var character = base_name.substr(index, 1)
        if allowed.contains(character):
            if capitalize_next:
                safe_name += character.to_upper()
                capitalize_next = false
            else:
                safe_name += character
        else:
            capitalize_next = true

    if safe_name.is_empty():
        safe_name = "Asset"
    var first_character = safe_name.substr(0, 1)
    if "0123456789".contains(first_character):
        safe_name = "Asset" + safe_name
    return safe_name

func place_asset_validate_node_type(node_type, proposed_path, issues):
    if typeof(node_type) != TYPE_STRING or node_type.strip_edges().is_empty():
        place_asset_add_issue(issues, "error", "INVALID_NODE_TYPE", "Node type must be a non-empty Godot class name.", proposed_path, null, "nodeType", "Use a built-in node type such as Sprite2D, TextureRect, MeshInstance3D, AudioStreamPlayer2D, or Label.")
        return false

    var clean_type = node_type.strip_edges()
    if clean_type.contains("/") or clean_type.contains("\\") or clean_type.contains("://") or clean_type.get_extension().to_lower() == "gd":
        place_asset_add_issue(issues, "error", "INVALID_NODE_TYPE", "Node type must be a Godot class name, not a script or filesystem path.", proposed_path, null, "nodeType", "Use built-in node types; script classes are not supported by this dry-run.")
        return false

    if not ClassDB.class_exists(clean_type):
        place_asset_add_issue(issues, "error", "INVALID_NODE_TYPE", "Node type does not exist or custom script classes are not supported.", proposed_path, null, "nodeType", "Use a concrete built-in Godot node type.")
        return false

    if not ClassDB.can_instantiate(clean_type):
        place_asset_add_issue(issues, "error", "INVALID_NODE_TYPE", "Node type exists but cannot be instantiated.", proposed_path, null, "nodeType", "Use a concrete Godot node type.")
        return false

    return true

func place_asset_scene_dimension(root, parent):
    if parent is Node3D:
        return 3
    if parent is CanvasItem:
        return 2
    if root is Node3D:
        return 3
    return 2

func place_asset_infer_node_type(asset_type, asset_info, root, parent):
    var dimension = place_asset_scene_dimension(root, parent)
    if asset_type == "texture":
        return "Sprite2D"
    if asset_type == "scene":
        return "Node"
    if asset_type == "model":
        if asset_info.has("resourceType") and (asset_info["resourceType"] == "Mesh" or asset_info["resourceType"] == "ArrayMesh"):
            return "MeshInstance3D"
        return "Node3D"
    if asset_type == "audio":
        if dimension == 3:
            return "AudioStreamPlayer3D"
        if dimension == 2:
            return "AudioStreamPlayer2D"
        return "AudioStreamPlayer"
    if asset_type == "font":
        return "Label"
    return null

func place_asset_infer_asset_property(asset_type, node_type, asset_info, explicit_property, issues, proposed_path, asset_path):
    if explicit_property != null:
        if typeof(explicit_property) != TYPE_STRING or explicit_property.strip_edges().is_empty():
            place_asset_add_issue(issues, "error", "UNSUPPORTED_ASSET_NODE_COMBINATION", "assetProperty must be a non-empty string when provided.", proposed_path, asset_path, "assetProperty", "Use texture, stream, mesh, instance, font, or a supported explicit resource property.")
            return null
        return explicit_property.strip_edges()

    if asset_type == "texture" and (dry_run_class_is_or_inherits(node_type, "Sprite2D") or dry_run_class_is_or_inherits(node_type, "TextureRect")):
        return "texture"
    if asset_type == "audio" and (node_type == "AudioStreamPlayer" or node_type == "AudioStreamPlayer2D" or node_type == "AudioStreamPlayer3D"):
        return "stream"
    if asset_type == "scene":
        return "instance"
    if asset_type == "model":
        if dry_run_class_is_or_inherits(node_type, "MeshInstance3D") and asset_info.has("resourceType") and asset_info["resourceType"] != "PackedScene":
            return "mesh"
        return "instance"
    if asset_type == "font" and dry_run_class_is_or_inherits(node_type, "Label"):
        place_asset_add_issue(issues, "warning", "FONT_ASSIGNMENT_LIMITED", "Font assignment is represented as a future safe theme override plan.", proposed_path, asset_path, "assetProperty", "Review font assignment before applying a future write operation.")
        return "font"
    return null

func place_asset_validate_asset_combination(asset_type, node_type, asset_property, proposed_path, asset_path, issues):
    if asset_type == "script":
        place_asset_add_issue(issues, "error", "UNSUPPORTED_ASSET_TYPE", "Script assets are not supported for placement and will not be attached.", proposed_path, asset_path, "assetPath", "Use a non-script asset; attach scripts in a later explicit tool.")
        return false
    if asset_type == "data":
        place_asset_add_issue(issues, "error", "UNSUPPORTED_ASSET_TYPE", "JSON and CFG data files are not supported for scene placement in this version.", proposed_path, asset_path, "assetPath", "Use a texture, scene, model, audio, font, or resource asset.")
        return false
    if asset_type == "unknown":
        place_asset_add_issue(issues, "error", "UNSUPPORTED_ASSET_TYPE", "Asset type is not supported for placement.", proposed_path, asset_path, "assetPath", "Use a supported Godot asset type.")
        return false

    var compatible = false
    if asset_type == "texture":
        compatible = asset_property == "texture" and (dry_run_class_is_or_inherits(node_type, "Sprite2D") or dry_run_class_is_or_inherits(node_type, "TextureRect"))
    elif asset_type == "scene":
        compatible = asset_property == "instance"
    elif asset_type == "model":
        compatible = (asset_property == "mesh" and dry_run_class_is_or_inherits(node_type, "MeshInstance3D")) or asset_property == "instance"
    elif asset_type == "audio":
        compatible = asset_property == "stream" and (node_type == "AudioStreamPlayer" or node_type == "AudioStreamPlayer2D" or node_type == "AudioStreamPlayer3D")
    elif asset_type == "font":
        compatible = asset_property == "font" and dry_run_class_is_or_inherits(node_type, "Label")
    elif asset_type == "resource":
        compatible = asset_property != null and not str(asset_property).strip_edges().is_empty()

    if not compatible:
        place_asset_add_issue(issues, "error", "UNSUPPORTED_ASSET_NODE_COMBINATION", "Asset type, node type, and assetProperty are not a supported placement combination.", proposed_path, asset_path, "assetProperty", "Use a compatible node type or set assetProperty explicitly.")
        return false
    return true

func place_asset_sanitize_properties(raw_properties, node_type, proposed_path, issues):
    var sanitized = {}
    if raw_properties == null:
        return sanitized

    var allowlist = create_scene_blueprint_safe_properties()
    for property_name in raw_properties.keys():
        var value = raw_properties[property_name]
        if not allowlist.has(property_name):
            place_asset_add_issue(issues, "warning", "UNKNOWN_PROPERTY_SKIPPED", "Unknown property was skipped by the placement planner.", proposed_path, null, property_name, "Only common safe properties are included in the dry-run plan.")
            continue

        if property_name == "position" or property_name == "scale":
            var expected_size = dry_run_expected_vector_size(node_type, property_name)
            var valid_vector = false
            if expected_size == 0:
                valid_vector = dry_run_is_number_array(value, 2) or dry_run_is_number_array(value, 3)
            else:
                valid_vector = dry_run_is_number_array(value, expected_size)
            if not valid_vector:
                place_asset_add_issue(issues, "error", "INVALID_PLACEMENT", property_name + " must be a numeric array with the expected vector size.", proposed_path, null, property_name, "Use [x, y] for 2D nodes or [x, y, z] for 3D nodes.")
                continue
        elif property_name == "offset" or property_name == "zoom" or property_name == "size":
            if not dry_run_is_number_array(value, 2):
                place_asset_add_issue(issues, "error", "INVALID_PLACEMENT", property_name + " must be a numeric [x, y] array.", proposed_path, null, property_name, "Use a numeric array with two values.")
                continue
        elif property_name == "rotation" or property_name == "rotation_degrees" or property_name == "z_index" or property_name == "volume_db":
            if not dry_run_is_number_value(value):
                place_asset_add_issue(issues, "error", "INVALID_PLACEMENT", property_name + " must be a number.", proposed_path, null, property_name, "Use a numeric value.")
                continue
        elif property_name == "visible" or property_name == "disabled" or property_name == "enabled" or property_name == "centered" or property_name == "flip_h" or property_name == "flip_v" or property_name == "autoplay":
            if typeof(value) != TYPE_BOOL:
                place_asset_add_issue(issues, "error", "INVALID_PLACEMENT", property_name + " must be a boolean.", proposed_path, null, property_name, "Use true or false.")
                continue
        elif property_name == "text":
            if typeof(value) != TYPE_STRING:
                place_asset_add_issue(issues, "error", "INVALID_PLACEMENT", "text must be a string.", proposed_path, null, property_name, "Use a string value.")
                continue

        sanitized[property_name] = value
    return sanitized

func place_asset_texture_size(asset_info):
    if asset_info.has("metadata") and typeof(asset_info["metadata"]) == TYPE_DICTIONARY:
        var metadata = asset_info["metadata"]
        if metadata.has("width") and metadata.has("height"):
            return [metadata["width"], metadata["height"]]
        if metadata.has("size") and dry_align_is_number_array_any_size(metadata["size"], [2]):
            return metadata["size"]
    return null

func place_asset_estimated_bounds(asset_info, node_type, properties, global_position, issues, proposed_path):
    if global_position == null or not dry_align_is_number_array_any_size(global_position, [2]):
        place_asset_add_issue(issues, "warning", "ESTIMATED_BOUNDS_UNAVAILABLE", "Estimated bounds are unavailable for non-2D placement.", proposed_path)
        return layout_empty_bounds("global")

    var asset_type = asset_info["assetType"] if asset_info.has("assetType") else "unknown"
    if asset_type != "texture":
        var code = "SCENE_INSTANCE_BOUNDS_UNKNOWN" if asset_type == "scene" else "ESTIMATED_BOUNDS_UNAVAILABLE"
        place_asset_add_issue(issues, "warning", code, "Estimated bounds are unavailable for this asset type.", proposed_path, asset_info["path"] if asset_info.has("path") else null)
        return layout_empty_bounds("global")

    var texture_size = place_asset_texture_size(asset_info)
    if texture_size == null:
        place_asset_add_issue(issues, "warning", "ESTIMATED_BOUNDS_UNAVAILABLE", "Texture dimensions are unavailable, so estimated bounds are unavailable.", proposed_path, asset_info["path"] if asset_info.has("path") else null)
        return layout_empty_bounds("global")

    var scale = [1, 1]
    if properties.has("scale") and dry_align_is_number_array_any_size(properties["scale"], [2]):
        scale = properties["scale"]

    var texture_width = texture_size.get(0)
    var texture_height = texture_size.get(1)
    var size = [abs(texture_width * scale[0]), abs(texture_height * scale[1])]
    if dry_run_class_is_or_inherits(node_type, "TextureRect"):
        if properties.has("size") and dry_align_is_number_array_any_size(properties["size"], [2]):
            size = [abs(properties["size"][0] * scale[0]), abs(properties["size"][1] * scale[1])]
        return layout_bounds_from_arrays(global_position, [global_position[0] + size[0], global_position[1] + size[1]], "global")

    var centered = true
    if properties.has("centered") and typeof(properties["centered"]) == TYPE_BOOL:
        centered = properties["centered"]
    var offset = [0, 0]
    if properties.has("offset") and dry_align_is_number_array_any_size(properties["offset"], [2]):
        offset = properties["offset"]

    var min_values = [global_position[0] + offset[0], global_position[1] + offset[1]]
    if centered:
        min_values = [global_position[0] - size[0] / 2.0 + offset[0], global_position[1] - size[1] / 2.0 + offset[1]]
    var max_values = [min_values[0] + size[0], min_values[1] + size[1]]
    return layout_bounds_from_arrays(min_values, max_values, "global")

func place_asset_global_to_local(parent, global_position):
    if not dry_align_is_number_array_any_size(global_position, [2, 3]):
        return null
    if parent is CanvasItem:
        if global_position.size() != 2:
            return null
        return vector2_to_array(parent.get_global_transform().affine_inverse() * Vector2(global_position[0], global_position[1]))
    if parent is Node3D:
        if global_position.size() != 3:
            return null
        return vector3_to_array(parent.global_transform.affine_inverse() * Vector3(global_position[0], global_position[1], global_position[2]))
    return dry_align_duplicate_array(global_position)

func place_asset_local_to_global(parent, local_position):
    if not dry_align_is_number_array_any_size(local_position, [2, 3]):
        return null
    if parent is CanvasItem:
        if local_position.size() != 2:
            return null
        return vector2_to_array(parent.get_global_transform() * Vector2(local_position[0], local_position[1]))
    if parent is Node3D:
        if local_position.size() != 3:
            return null
        return vector3_to_array(parent.global_transform * Vector3(local_position[0], local_position[1], local_position[2]))
    return dry_align_duplicate_array(local_position)

func place_asset_snap_global_position(global_position, bounds, snap_to_grid, issues, proposed_path):
    if typeof(snap_to_grid) != TYPE_DICTIONARY:
        place_asset_add_issue(issues, "error", "INVALID_PLACEMENT", "snapToGrid must be an object.", proposed_path, null, "snapToGrid")
        return global_position

    var grid_size = dry_run_get_value(snap_to_grid, ["gridSize", "grid_size"], null)
    if not dry_align_is_number_array_any_size(grid_size, [2]):
        place_asset_add_issue(issues, "error", "INVALID_PLACEMENT", "snapToGrid.gridSize must be a numeric [x, y] array.", proposed_path, null, "snapToGrid")
        return global_position
    if grid_size[0] <= 0 or grid_size[1] <= 0:
        place_asset_add_issue(issues, "error", "INVALID_PLACEMENT", "snapToGrid.gridSize values must be greater than zero.", proposed_path, null, "snapToGrid")
        return global_position

    var origin = dry_run_get_value(snap_to_grid, ["origin"], [0, 0])
    if not dry_align_is_number_array_any_size(origin, [2]):
        place_asset_add_issue(issues, "error", "INVALID_PLACEMENT", "snapToGrid.origin must be a numeric [x, y] array.", proposed_path, null, "snapToGrid")
        return global_position

    var mode = dry_run_get_value(snap_to_grid, ["mode"], "position")
    if not ["position", "bounds_min", "bounds_center"].has(mode):
        place_asset_add_issue(issues, "error", "INVALID_PLACEMENT", "snapToGrid.mode must be position, bounds_min, or bounds_center.", proposed_path, null, "snapToGrid")
        return global_position

    var point = global_position
    if mode == "bounds_min" or mode == "bounds_center":
        if not dry_align_bounds_available(bounds):
            place_asset_add_issue(issues, "error", "BOUNDS_UNAVAILABLE", "Estimated bounds are required for this snapToGrid mode.", proposed_path, null, "snapToGrid")
            return global_position
        point = bounds["min"] if mode == "bounds_min" else bounds["center"]

    var snapped = dry_align_duplicate_array(point)
    snapped[0] = dry_align_snap_value(point[0], grid_size[0], origin[0])
    snapped[1] = dry_align_snap_value(point[1], grid_size[1], origin[1])
    return [
        global_position[0] + snapped[0] - point[0],
        global_position[1] + snapped[1] - point[1]
    ]

func place_asset_calculate_position(placement, parent, layout_by_path, node_by_path, layout_nodes, scene_bounds, bounds_source, asset_info, node_type, properties, proposed_path, issues):
    if placement == null:
        place_asset_add_issue(issues, "info", "DEFAULT_PLACEMENT_USED", "No placement was provided; defaulting to parent origin.", proposed_path)
        var default_dimension = 3 if parent is Node3D else 2
        var default_local = dry_align_zero_array(default_dimension)
        return {
            "success": true,
            "local": default_local,
            "global": place_asset_local_to_global(parent, default_local)
        }

    var mode = dry_run_get_value(placement, ["mode"], null)
    if typeof(mode) != TYPE_STRING:
        place_asset_add_issue(issues, "error", "INVALID_PLACEMENT", "placement.mode is required.", proposed_path, null, "placement")
        return {"success": false}

    var margin_result = dry_align_parse_margin(dry_run_get_value(placement, ["margin"], null))
    if not margin_result["success"]:
        place_asset_add_issue(issues, "error", "INVALID_PLACEMENT", margin_result["message"], proposed_path, null, "placement.margin")
        return {"success": false}
    var margin = margin_result["value"]
    var proposed_global = null

    if mode == "position":
        var position = dry_run_get_value(placement, ["position"], null)
        if not dry_align_is_number_array_any_size(position, [2, 3]):
            place_asset_add_issue(issues, "error", "INVALID_PLACEMENT", "placement.position must be a numeric [x, y] or [x, y, z] array.", proposed_path, null, "placement.position")
            return {"success": false}
        var space = dry_run_get_value(placement, ["space"], "local")
        if not (space == "local" or space == "global"):
            place_asset_add_issue(issues, "error", "INVALID_PLACEMENT", "placement.space must be local or global.", proposed_path, null, "placement.space")
            return {"success": false}
        if space == "local":
            proposed_global = place_asset_local_to_global(parent, position)
            if proposed_global == null:
                place_asset_add_issue(issues, "error", "INVALID_PLACEMENT", "Could not convert local placement position to global coordinates.", proposed_path, null, "placement.position")
                return {"success": false}
        else:
            proposed_global = position

    elif mode == "relative":
        var reference_path_value = dry_run_get_value(placement, ["referenceNodePath", "reference_node_path"], null)
        var reference_path_result = dry_run_normalize_scene_node_path(reference_path_value)
        if reference_path_result.has("error"):
            place_asset_add_issue(issues, "error", "INVALID_PLACEMENT", reference_path_result["error"], proposed_path, null, "placement.referenceNodePath")
            return {"success": false}
        var reference_path = reference_path_result["path"]
        if not node_by_path.has(reference_path):
            place_asset_add_issue(issues, "error", "PARENT_NODE_NOT_FOUND", "Reference node was not found in the scene.", reference_path, null, "placement.referenceNodePath", "Use get_scene_layout to inspect valid node paths.")
            return {"success": false}

        var relation = dry_run_get_value(placement, ["relation"], null)
        var allowed_relations = ["left_of", "right_of", "above", "below", "centered_on", "inside_top_left", "inside_top_right", "inside_bottom_left", "inside_bottom_right"]
        if typeof(relation) != TYPE_STRING or not allowed_relations.has(relation):
            place_asset_add_issue(issues, "error", "INVALID_PLACEMENT", "placement.relation is not supported.", proposed_path, null, "placement.relation")
            return {"success": false}

        var selected_reference = dry_align_select_bounds(layout_by_path[reference_path], bounds_source, issues, -1, "dry_run_place_asset_in_scene", reference_path)
        if not selected_reference["success"]:
            place_asset_add_issue(issues, "error", selected_reference["error"], selected_reference["message"], reference_path, null, "boundsSource")
            return {"success": false}

        var reference_bounds = selected_reference["bounds"]
        if not dry_align_bounds_available(reference_bounds) or reference_bounds["center"].size() != 2:
            place_asset_add_issue(issues, "error", "BOUNDS_UNAVAILABLE", "Relative placement requires 2D reference bounds.", reference_path, null, "boundsSource")
            return {"success": false}

        var base_bounds = place_asset_estimated_bounds(asset_info, node_type, properties, [0, 0], issues, proposed_path)
        if not dry_align_bounds_available(base_bounds):
            place_asset_add_issue(issues, "error", "BOUNDS_UNAVAILABLE", "Relative placement requires estimated bounds for the new asset.", proposed_path, asset_info["path"] if asset_info.has("path") else null)
            return {"success": false}

        proposed_global = [0, 0]
        if relation == "left_of":
            proposed_global[0] += (reference_bounds["min"][0] - margin[0]) - base_bounds["max"][0]
        elif relation == "right_of":
            proposed_global[0] += (reference_bounds["max"][0] + margin[0]) - base_bounds["min"][0]
        elif relation == "above":
            proposed_global[1] += (reference_bounds["min"][1] - margin[1]) - base_bounds["max"][1]
        elif relation == "below":
            proposed_global[1] += (reference_bounds["max"][1] + margin[1]) - base_bounds["min"][1]
        elif relation == "centered_on":
            proposed_global[0] += (reference_bounds["center"][0] + margin[0]) - base_bounds["center"][0]
            proposed_global[1] += (reference_bounds["center"][1] + margin[1]) - base_bounds["center"][1]
        elif relation == "inside_top_left":
            proposed_global[0] += (reference_bounds["min"][0] + margin[0]) - base_bounds["min"][0]
            proposed_global[1] += (reference_bounds["min"][1] + margin[1]) - base_bounds["min"][1]
        elif relation == "inside_top_right":
            proposed_global[0] += (reference_bounds["max"][0] - margin[0]) - base_bounds["max"][0]
            proposed_global[1] += (reference_bounds["min"][1] + margin[1]) - base_bounds["min"][1]
        elif relation == "inside_bottom_left":
            proposed_global[0] += (reference_bounds["min"][0] + margin[0]) - base_bounds["min"][0]
            proposed_global[1] += (reference_bounds["max"][1] - margin[1]) - base_bounds["max"][1]
        elif relation == "inside_bottom_right":
            proposed_global[0] += (reference_bounds["max"][0] - margin[0]) - base_bounds["max"][0]
            proposed_global[1] += (reference_bounds["max"][1] - margin[1]) - base_bounds["max"][1]

    elif mode == "scene_bounds":
        var alignment = dry_run_get_value(placement, ["alignment"], null)
        var allowed_alignments = ["left", "right", "top", "bottom", "center_x", "center_y", "center"]
        if typeof(alignment) != TYPE_STRING or not allowed_alignments.has(alignment):
            place_asset_add_issue(issues, "error", "INVALID_PLACEMENT", "placement.alignment is not supported.", proposed_path, null, "placement.alignment")
            return {"success": false}

        var selected_scene = dry_align_select_scene_bounds(scene_bounds, layout_nodes, bounds_source, issues, -1, "dry_run_place_asset_in_scene")
        if not selected_scene["success"]:
            place_asset_add_issue(issues, "error", selected_scene["error"], selected_scene["message"], proposed_path, null, "boundsSource")
            return {"success": false}

        var scene_bounds_value = selected_scene["bounds"]
        var scene_base_bounds = place_asset_estimated_bounds(asset_info, node_type, properties, [0, 0], issues, proposed_path)
        if not dry_align_bounds_available(scene_base_bounds):
            place_asset_add_issue(issues, "error", "BOUNDS_UNAVAILABLE", "Scene bounds placement requires estimated bounds for the new asset.", proposed_path, asset_info["path"] if asset_info.has("path") else null)
            return {"success": false}

        proposed_global = [0, 0]
        if alignment == "left":
            proposed_global[0] += (scene_bounds_value["min"][0] + margin[0]) - scene_base_bounds["min"][0]
        elif alignment == "right":
            proposed_global[0] += (scene_bounds_value["max"][0] - margin[0]) - scene_base_bounds["max"][0]
        elif alignment == "top":
            proposed_global[1] += (scene_bounds_value["min"][1] + margin[1]) - scene_base_bounds["min"][1]
        elif alignment == "bottom":
            proposed_global[1] += (scene_bounds_value["max"][1] - margin[1]) - scene_base_bounds["max"][1]
        elif alignment == "center_x":
            proposed_global[0] += (scene_bounds_value["center"][0] + margin[0]) - scene_base_bounds["center"][0]
        elif alignment == "center_y":
            proposed_global[1] += (scene_bounds_value["center"][1] + margin[1]) - scene_base_bounds["center"][1]
        elif alignment == "center":
            proposed_global[0] += (scene_bounds_value["center"][0] + margin[0]) - scene_base_bounds["center"][0]
            proposed_global[1] += (scene_bounds_value["center"][1] + margin[1]) - scene_base_bounds["center"][1]
    else:
        place_asset_add_issue(issues, "error", "INVALID_PLACEMENT", "placement.mode must be position, relative, or scene_bounds.", proposed_path, null, "placement.mode")
        return {"success": false}

    if proposed_global == null:
        place_asset_add_issue(issues, "error", "INVALID_PLACEMENT", "Could not calculate a proposed placement position.", proposed_path, null, "placement")
        return {"success": false}

    var estimated_bounds = place_asset_estimated_bounds(asset_info, node_type, properties, proposed_global, issues, proposed_path)
    var snap_to_grid = dry_run_get_value(placement, ["snapToGrid", "snap_to_grid"], null)
    if snap_to_grid != null:
        proposed_global = place_asset_snap_global_position(proposed_global, estimated_bounds, snap_to_grid, issues, proposed_path)
        estimated_bounds = place_asset_estimated_bounds(asset_info, node_type, properties, proposed_global, issues, proposed_path)

    var proposed_local = place_asset_global_to_local(parent, proposed_global)
    if proposed_local == null:
        place_asset_add_issue(issues, "error", "INVALID_PLACEMENT", "Could not convert proposed global position to local parent coordinates.", proposed_path, null, "placement")
        return {"success": false}

    return {
        "success": true,
        "local": proposed_local,
        "global": proposed_global,
        "bounds": estimated_bounds
    }

func place_asset_compact_asset_info(asset_info):
    if asset_info == null or typeof(asset_info) != TYPE_DICTIONARY:
        return null
    var compact = {
        "assetType": asset_info["assetType"] if asset_info.has("assetType") else "unknown",
        "resourceType": asset_info["resourceType"] if asset_info.has("resourceType") else null
    }
    if asset_info.has("metadata") and typeof(asset_info["metadata"]) == TYPE_DICTIONARY:
        var metadata = asset_info["metadata"]
        if metadata.has("width"):
            compact["width"] = metadata["width"]
        if metadata.has("height"):
            compact["height"] = metadata["height"]
        if metadata.has("size"):
            compact["size"] = metadata["size"]
    return compact

func place_asset_finish_result(project_path, scene_path, asset_path, asset_info, include_asset_info, include_plan, include_layout_before, layout_data, bounds_source, issues, plan, proposed_node, summary, limits):
    var counts = dry_align_issue_counts(issues)
    var severity = dry_align_severity_from_counts(counts)
    summary["errorCount"] = counts["errorCount"]
    summary["warningCount"] = counts["warningCount"]
    summary["infoCount"] = counts["infoCount"]

    return {
        "success": true,
        "projectPath": project_path,
        "scenePath": scene_path,
        "assetPath": asset_path,
        "valid": counts["errorCount"] == 0,
        "severity": severity,
        "summary": summary,
        "issues": issues,
        "assetInfo": place_asset_compact_asset_info(asset_info) if include_asset_info else null,
        "plan": plan if include_plan else [],
        "proposedNode": proposed_node,
        "layoutBefore": dry_align_compact_layout_before(layout_data["nodes"], layout_data["sceneBounds"], bounds_source) if include_layout_before else null,
        "limits": limits
    }

# Shared planning logic for dry_run_place_asset_in_scene and place_asset_in_scene.
# Loads + instantiates the scene unless an external root is provided, builds the
# placement plan, and returns the full planning context. Callers only free
# scene_root when owns_scene_root is true.
func place_asset_plan(params, provided_scene_root=null):
    if not params.has("scene_path"):
        return {"fatal": {"error": "MISSING_SCENE_PATH", "message": "scene_path is required."}}
    if not params.has("asset_path"):
        return {"fatal": {"error": "MISSING_ASSET_PATH", "message": "asset_path is required."}}

    var scene_path = normalize_resource_scene_path(params.scene_path)
    var asset_path = normalize_resource_scene_path(params.asset_path)
    var project_path = params.project_path if params.has("project_path") else ProjectSettings.globalize_path("res://")
    var bounds_source = params.bounds_source if params.has("bounds_source") else "visual"
    var include_plan = params.include_plan if params.has("include_plan") else true
    var include_layout_before = params.include_layout_before if params.has("include_layout_before") else false
    var include_asset_info = params.include_asset_info if params.has("include_asset_info") else true
    var max_depth = int(params.max_depth) if params.has("max_depth") else 100
    var limits = {
        "maxDepthRequested": params.max_depth_requested if params.has("max_depth_requested") else null,
        "maxDepthApplied": max_depth,
        "maxDepthClamped": params.max_depth_clamped if params.has("max_depth_clamped") else false
    }

    if not FileAccess.file_exists(scene_path):
        return {"fatal": {"error": "SCENE_PATH_NOT_FOUND", "message": "Scene file does not exist: " + scene_path}}
    if not FileAccess.file_exists(asset_path):
        return {"fatal": {"error": "ASSET_PATH_NOT_FOUND", "message": "Asset file does not exist: " + asset_path}}

    var scene_root = provided_scene_root
    var owns_scene_root = false
    if scene_root == null:
        var scene_resource = ResourceLoader.load(scene_path)
        if scene_resource == null or not (scene_resource is PackedScene):
            return {"fatal": {"error": "SCENE_LOAD_FAILED", "message": "Failed to load scene as PackedScene: " + scene_path}}

        scene_root = scene_resource.instantiate()
        if scene_root == null:
            return {"fatal": {"error": "SCENE_INSTANTIATE_FAILED", "message": "Failed to instantiate scene: " + scene_path}}
        owns_scene_root = true

    var issues = []
    var plan = []
    var layout_data = dry_align_build_layout(scene_root, max_depth)
    var layout_by_path = layout_data["layoutByPath"]
    var node_by_path = layout_data["nodeByPath"]
    var layout_nodes = layout_data["nodes"]
    var scene_bounds = layout_data["sceneBounds"]
    var root_path = get_scene_node_path(scene_root, scene_root)

    var parent_path = root_path
    if params.has("parent_path") and params.parent_path != null:
        var normalized_parent = dry_run_normalize_scene_node_path(params.parent_path)
        if normalized_parent.has("error"):
            place_asset_add_issue(issues, "error", "PARENT_NODE_NOT_FOUND", normalized_parent["error"], str(params.parent_path), null, "parentPath", "Use get_scene_layout to inspect valid parent paths.")
        else:
            parent_path = normalized_parent["path"]
    if not node_by_path.has(parent_path):
        place_asset_add_issue(issues, "error", "PARENT_NODE_NOT_FOUND", "Parent node was not found in the scene.", parent_path, null, "parentPath", "Use get_scene_layout to inspect valid parent paths.")

    var parent_node = node_by_path[parent_path] if node_by_path.has(parent_path) else scene_root
    var asset_info = inspect_asset(asset_path, {
        "includeDependencies": false,
        "includeScenePreview": false,
        "includePlacementHints": false
    })
    if not asset_info.has("success") or not asset_info["success"]:
        if owns_scene_root:
            scene_root.free()
        return {"fatal": {
            "error": asset_info["error"] if asset_info.has("error") else "ASSET_LOAD_FAILED",
            "message": asset_info["message"] if asset_info.has("message") else "Asset could not be inspected."
        }}

    var asset_type = asset_info["assetType"]
    var node_name = params.node_name if params.has("node_name") and params.node_name != null else place_asset_safe_node_name_from_asset(asset_path)
    var name_error = dry_run_validate_node_name(node_name)
    if name_error != null:
        place_asset_add_issue(issues, "error", "INVALID_NODE_NAME", name_error, str(node_name), asset_path, "nodeName", "Use a simple node name without slashes, traversal, or null bytes.")
        node_name = str(node_name).strip_edges()

    var node_type = params.node_type.strip_edges() if params.has("node_type") and typeof(params.node_type) == TYPE_STRING else null
    if node_type == null:
        node_type = place_asset_infer_node_type(asset_type, asset_info, scene_root, parent_node)

    var proposed_path = parent_path + "/" + str(node_name)
    if node_type != null:
        place_asset_validate_node_type(node_type, proposed_path, issues)
    elif not ["script", "data", "unknown"].has(asset_type):
        place_asset_add_issue(issues, "error", "UNSUPPORTED_ASSET_TYPE", "Could not infer a node type for this asset; provide nodeType if this asset is placeable.", proposed_path, asset_path, "nodeType", "Use a supported asset type or provide a compatible nodeType.")

    if node_by_path.has(proposed_path):
        place_asset_add_issue(issues, "error", "NODE_PATH_CONFLICT", "A node with the proposed name already exists under the selected parent.", proposed_path, asset_path, "nodeName", "Use a different nodeName such as " + str(node_name) + "2.")

    var asset_property = place_asset_infer_asset_property(asset_type, node_type, asset_info, params.asset_property if params.has("asset_property") else null, issues, proposed_path, asset_path)
    place_asset_validate_asset_combination(asset_type, node_type, asset_property, proposed_path, asset_path, issues)

    var properties = place_asset_sanitize_properties(params.properties if params.has("properties") else null, node_type if node_type != null else "Node", proposed_path, issues)
    var placement_result = {"success": false}
    if not dry_align_has_error_issues(issues):
        placement_result = place_asset_calculate_position(params.placement if params.has("placement") else null, parent_node, layout_by_path, node_by_path, layout_nodes, scene_bounds, bounds_source, asset_info, node_type, properties, proposed_path, issues)
        if placement_result.has("success") and placement_result["success"]:
            properties["position"] = placement_result["local"]

    var estimated_bounds = placement_result["bounds"] if placement_result.has("bounds") else layout_empty_bounds("global")
    var proposed_node = {
        "path": proposed_path,
        "name": str(node_name),
        "type": node_type,
        "parentPath": parent_path,
        "asset": asset_path,
        "assetProperty": asset_property,
        "properties": properties,
        "estimatedBounds": estimated_bounds
    }

    if not dry_align_has_error_issues(issues):
        plan.append({
            "action": "add_node",
            "path": proposed_path,
            "parentPath": parent_path,
            "type": node_type,
            "name": str(node_name)
        })
        plan.append({
            "action": "assign_asset",
            "path": proposed_path,
            "asset": asset_path,
            "assetProperty": asset_property
        })
        if properties.size() > 0:
            plan.append({
                "action": "set_properties",
                "path": proposed_path,
                "properties": properties
            })

    return {
        "scene_root": scene_root,
        "project_path": project_path,
        "scene_path": scene_path,
        "asset_path": asset_path,
        "asset_info": asset_info,
        "asset_type": asset_type,
        "node_name": str(node_name),
        "node_type": node_type,
        "asset_property": asset_property,
        "properties": properties,
        "proposed_path": proposed_path,
        "parent_path": parent_path,
        "parent_node": parent_node,
        "proposed_node": proposed_node,
        "plan": plan,
        "issues": issues,
        "layout_data": layout_data,
        "owns_scene_root": owns_scene_root,
        "bounds_source": bounds_source,
        "include_plan": include_plan,
        "include_layout_before": include_layout_before,
        "include_asset_info": include_asset_info,
        "max_depth": max_depth,
        "limits": limits
    }

func dry_run_place_asset_in_scene(params):
    var planned = place_asset_plan(params)
    if planned.has("fatal"):
        print(JSON.stringify(place_asset_error(planned["fatal"]["error"], planned["fatal"]["message"])))
        return

    var summary = {
        "errorCount": 0,
        "warningCount": 0,
        "infoCount": 0,
        "assetType": planned["asset_type"],
        "nodeType": planned["node_type"],
        "assetProperty": planned["asset_property"],
        "parentPath": planned["parent_path"],
        "proposedNodePath": planned["proposed_path"]
    }
    var result = place_asset_finish_result(planned["project_path"], planned["scene_path"], planned["asset_path"], planned["asset_info"], planned["include_asset_info"], planned["include_plan"], planned["include_layout_before"], planned["layout_data"], planned["bounds_source"], planned["issues"], planned["plan"], planned["proposed_node"], summary, planned["limits"])
    print(JSON.stringify(result))
    planned["scene_root"].free()

func place_asset_write_error(error_code, message, issues=[]):
    return {
        "success": false,
        "error": error_code,
        "message": message,
        "issues": issues
    }

# Reports how a resource assignment was verified. A standalone res:// path proves
# provenance and is matched exactly. Embedded sub-resources ("res://scene.tscn::Id")
# and runtime resources ("") carry no provenance, so presence is the check.
# Returns {assigned, check, message, warning}.
func place_asset_resource_assignment(resource, asset_path):
    if resource == null:
        return {"assigned": false, "check": "missing", "message": "No resource was assigned to the node.", "warning": null}
    var path = resource.resource_path
    if path.begins_with("res://") and not path.contains("::"):
        if path == asset_path:
            return {"assigned": true, "check": "standalone_resource_path_match", "message": "Resource path matched the requested asset.", "warning": null}
        return {"assigned": false, "check": "standalone_resource_path_match", "message": "Assigned resource path '" + path + "' did not match the requested asset.", "warning": null}
    return {"assigned": true, "check": "embedded_or_runtime_resource_presence", "message": "Assigned resource is embedded or runtime; validated by presence.", "warning": "POST_VALIDATION_PRESENCE_ONLY"}

# Verifies the asset assignment on the saved node.
# Returns {assigned, check, message, warning, failHard}. failHard marks an
# assignment whose absence is a hard post-validation failure; soft cases (font
# limitations, instance provenance) report assigned/warning without hard failing.
func place_asset_check_assignment(node, asset_path, asset_property, asset_type):
    if asset_type == "texture":
        if (node is Sprite2D or node is TextureRect) and node.texture != null:
            var r = place_asset_resource_assignment(node.texture, asset_path)
            r["failHard"] = true
            return r
        return {"assigned": false, "check": "missing", "message": "Texture node has no texture assigned.", "warning": null, "failHard": true}
    if asset_type == "audio":
        if (node is AudioStreamPlayer or node is AudioStreamPlayer2D or node is AudioStreamPlayer3D) and node.stream != null:
            var r = place_asset_resource_assignment(node.stream, asset_path)
            r["failHard"] = true
            return r
        return {"assigned": false, "check": "missing", "message": "Audio node has no stream assigned.", "warning": null, "failHard": true}
    if asset_type == "model":
        if asset_property == "mesh":
            if node is MeshInstance3D and node.mesh != null:
                var r = place_asset_resource_assignment(node.mesh, asset_path)
                r["failHard"] = true
                return r
            return {"assigned": false, "check": "missing", "message": "MeshInstance3D has no mesh assigned.", "warning": null, "failHard": true}
        return {"assigned": true, "check": "model_instance_node_exists", "message": "Model instance validated by node existence.", "warning": "ASSIGNMENT_PROVENANCE_LIMITED", "failHard": false}
    if asset_type == "scene":
        return {"assigned": true, "check": "scene_instance_node_exists", "message": "Scene instance validated by node existence.", "warning": "ASSIGNMENT_PROVENANCE_LIMITED", "failHard": false}
    if asset_type == "font":
        if node is Label and node.has_theme_font_override("font"):
            var font_res = node.get_theme_font("font")
            var font_path = font_res.resource_path if font_res != null else ""
            if font_path.begins_with("res://") and not font_path.contains("::") and font_path == asset_path:
                return {"assigned": true, "check": "font_override_present", "message": "Label font override matched the requested asset.", "warning": null, "failHard": true}
            return {"assigned": true, "check": "font_override_present", "message": "Label font override is present (provenance unverified).", "warning": "ASSIGNMENT_PROVENANCE_LIMITED", "failHard": true}
        return {"assigned": false, "check": "skipped", "message": "Label font override was not applied; font assignment is limited in this environment.", "warning": "FONT_ASSIGNMENT_LIMITED", "failHard": false}
    if asset_type == "resource":
        if asset_property != null and create_scene_blueprint_node_has_property(node, asset_property):
            var val = node.get(asset_property)
            if val == null:
                return {"assigned": false, "check": "missing", "message": "Resource property '" + str(asset_property) + "' is null after assignment.", "warning": null, "failHard": true}
            if val is Resource:
                var r = place_asset_resource_assignment(val, asset_path)
                r["failHard"] = true
                return r
            return {"assigned": true, "check": "embedded_or_runtime_resource_presence", "message": "Resource property is set to a non-resource value; validated by presence.", "warning": "POST_VALIDATION_PRESENCE_ONLY", "failHard": false}
        return {"assigned": true, "check": "skipped", "message": "Resource assignment was skipped; no explicit assetProperty applied.", "warning": "ASSIGNMENT_PROVENANCE_LIMITED", "failHard": false}
    return {"assigned": true, "check": "skipped", "message": "No assignment check applies to this asset type.", "warning": null, "failHard": false}

# Verifies the planned local position on the saved node. Returns {matches, message}.
# Unsupported node/dimension combinations fail rather than silently passing.
func place_asset_check_position(node, expected_position):
    if expected_position == null:
        return {"matches": true, "message": "No position was planned."}
    var eps = 0.001
    if expected_position.size() == 3:
        if node is Node3D:
            var p3 = node.position
            if abs(p3.x - expected_position[0]) <= eps and abs(p3.y - expected_position[1]) <= eps and abs(p3.z - expected_position[2]) <= eps:
                return {"matches": true, "message": "Position matched within epsilon."}
            return {"matches": false, "message": "Node3D position did not match the planned position."}
        return {"matches": false, "message": "A 3D position was planned but the node is not a Node3D."}
    if expected_position.size() == 2:
        if node is Node2D or node is Control:
            var p2 = node.position
            if abs(p2.x - expected_position[0]) <= eps and abs(p2.y - expected_position[1]) <= eps:
                return {"matches": true, "message": "Position matched within epsilon."}
            return {"matches": false, "message": "Position did not match the planned position."}
        return {"matches": false, "message": "A 2D position was planned but the node is not a Node2D or Control."}
    return {"matches": false, "message": "Planned position has an unsupported dimension."}

func place_asset_empty_post_validation():
    return {
        "loadable": null,
        "instantiable": null,
        "nodeExists": null,
        "assetAssigned": null,
        "positionMatches": null,
        "details": {
            "assignmentCheck": null,
            "assignmentMessage": null,
            "positionMessage": null
        }
    }

func place_asset_post_validate(scene_path, new_node_path, asset_path, asset_property, asset_type, expected_position):
    var post = place_asset_empty_post_validation()
    post["loadable"] = false
    post["instantiable"] = false
    post["nodeExists"] = false
    post["assetAssigned"] = false
    post["positionMatches"] = false
    var warnings = []

    var scene_resource = ResourceLoader.load(scene_path, "", ResourceLoader.CACHE_MODE_IGNORE)
    if scene_resource == null or not (scene_resource is PackedScene):
        return {"success": false, "message": "Saved scene could not be loaded as a PackedScene.", "postValidation": post, "warnings": warnings}
    post["loadable"] = true

    var root = scene_resource.instantiate()
    if root == null:
        return {"success": false, "message": "Saved scene could not be instantiated.", "postValidation": post, "warnings": warnings}
    post["instantiable"] = true

    var rel = new_node_path
    var slash = new_node_path.find("/")
    if slash >= 0:
        rel = new_node_path.substr(slash + 1)
    var node = root.get_node_or_null(NodePath(rel))
    if node == null:
        root.free()
        return {"success": false, "message": "New node was not found in the saved scene.", "postValidation": post, "warnings": warnings}
    post["nodeExists"] = true

    var assignment = place_asset_check_assignment(node, asset_path, asset_property, asset_type)
    var position = place_asset_check_position(node, expected_position)
    root.free()

    post["assetAssigned"] = assignment["assigned"]
    post["positionMatches"] = position["matches"]
    post["details"]["assignmentCheck"] = assignment["check"]
    post["details"]["assignmentMessage"] = assignment["message"]
    post["details"]["positionMessage"] = position["message"]

    if assignment.has("warning") and assignment["warning"] != null:
        warnings.append({"code": assignment["warning"], "message": assignment["message"]})

    var assignment_failed = (not assignment["assigned"]) and assignment.get("failHard", true)
    if assignment_failed:
        return {"success": false, "message": assignment["message"], "postValidation": post, "warnings": warnings}
    if not position["matches"]:
        return {"success": false, "message": position["message"], "postValidation": post, "warnings": warnings}
    return {"success": true, "message": "", "postValidation": post, "warnings": warnings}

func place_asset_in_scene(params):
    var validate_before_write = params.validate_before_write if params.has("validate_before_write") else true
    var validate_after_write = params.validate_after_write if params.has("validate_after_write") else true
    var include_layout_after = params.include_layout_after if params.has("include_layout_after") else false

    var planned = place_asset_plan(params)
    if planned.has("fatal"):
        print(JSON.stringify(place_asset_write_error(planned["fatal"]["error"], planned["fatal"]["message"])))
        return

    var scene_root = planned["scene_root"]
    var issues = planned["issues"]
    var max_depth = planned["max_depth"]

    # Abort before writing when the dry-run plan has any error issues.
    if validate_before_write and dry_align_has_error_issues(issues):
        scene_root.free()
        print(JSON.stringify(place_asset_write_error("DRY_RUN_VALIDATION_FAILED", "Placement dry-run validation failed; scene was not modified.", issues)))
        return

    # The plan only contains an add_node action when planning produced no errors.
    var has_add_node = false
    for action in planned["plan"]:
        if action.has("action") and action["action"] == "add_node":
            has_add_node = true
            break
    if not has_add_node:
        scene_root.free()
        print(JSON.stringify(place_asset_write_error("NO_PLACEMENT_PLAN", "No add_node action was planned; scene was not modified.", issues)))
        return

    var parent_node = planned["parent_node"]
    if parent_node == null:
        scene_root.free()
        print(JSON.stringify(place_asset_write_error("PARENT_NODE_NOT_FOUND", "Parent node was not found; scene was not modified.", issues)))
        return

    # Build a node spec compatible with the create_scene_from_blueprint writers so
    # node creation, asset assignment and property application stay shared/safe.
    var spec = {
        "path": planned["proposed_path"],
        "name": planned["node_name"],
        "type": planned["node_type"],
        "asset": planned["asset_path"],
        "assetProperty": planned["asset_property"],
        "assetType": planned["asset_type"],
        "properties": planned["properties"]
    }

    var new_node = create_scene_blueprint_create_node_from_spec(spec, issues)
    if new_node == null:
        scene_root.free()
        print(JSON.stringify(place_asset_write_error("CREATE_NODE_FAILED", "Failed to create the new node; scene was not modified.", issues)))
        return

    new_node.name = planned["node_name"]
    parent_node.add_child(new_node)
    create_scene_blueprint_set_owner_recursive(new_node, scene_root)

    if not create_scene_blueprint_apply_properties(new_node, spec, issues):
        scene_root.free()
        print(JSON.stringify(place_asset_write_error("SET_PROPERTY_FAILED", "Failed to set node properties; scene was not modified.", issues)))
        return

    if not create_scene_blueprint_assign_asset(new_node, spec, issues):
        scene_root.free()
        print(JSON.stringify(place_asset_write_error("ASSIGN_ASSET_FAILED", "Failed to assign the asset; scene was not modified.", issues)))
        return

    if dry_align_has_error_issues(issues):
        scene_root.free()
        print(JSON.stringify(place_asset_write_error("PLACE_ASSET_IN_SCENE_FAILED", "Placement produced errors before saving; scene was not modified.", issues)))
        return

    var layout_after = null
    if include_layout_after:
        var layout_after_data = dry_align_build_layout(scene_root, max_depth)
        layout_after = dry_align_compact_layout_before(layout_after_data["nodes"], layout_after_data["sceneBounds"], planned["bounds_source"])

    var packed_scene = PackedScene.new()
    var pack_result = packed_scene.pack(scene_root)
    if pack_result != OK:
        scene_root.free()
        print(JSON.stringify(place_asset_write_error("PACK_SCENE_FAILED", "Failed to pack the modified scene; scene was not saved.", issues)))
        return

    var save_error = ResourceSaver.save(packed_scene, planned["scene_path"])
    if save_error != OK:
        scene_root.free()
        print(JSON.stringify(place_asset_write_error("SAVE_SCENE_FAILED", "Failed to save the modified scene.", issues)))
        return

    var bytes_written = 0
    var file = FileAccess.open(planned["scene_path"], FileAccess.READ)
    if file != null:
        bytes_written = file.get_length()
        file.close()

    var post_validation = place_asset_empty_post_validation()
    if validate_after_write:
        var expected_position = planned["properties"]["position"] if planned["properties"].has("position") else null
        var post_result = place_asset_post_validate(planned["scene_path"], planned["proposed_path"], planned["asset_path"], planned["asset_property"], planned["asset_type"], expected_position)
        post_validation = post_result["postValidation"]
        if not post_result["success"]:
            scene_root.free()
            var post_error = place_asset_write_error("POST_VALIDATE_FAILED", post_result["message"], issues)
            post_error["postValidation"] = post_validation
            print(JSON.stringify(post_error))
            return
        # Surface non-fatal provenance/font limitations as warnings rather than hiding them.
        for w in post_result["warnings"]:
            place_asset_add_issue(issues, "warning", w["code"], w["message"], planned["proposed_path"], planned["asset_path"], "assetProperty", "Asset was placed but exact assignment provenance could not be fully verified.")

    scene_root.free()

    var counts = dry_align_issue_counts(issues)
    var severity = dry_align_severity_from_counts(counts)
    var summary = {
        "errorCount": counts["errorCount"],
        "warningCount": counts["warningCount"],
        "infoCount": counts["infoCount"],
        "assetType": planned["asset_type"],
        "nodeType": planned["node_type"],
        "assetProperty": planned["asset_property"],
        "parentPath": planned["parent_path"],
        "newNodePath": planned["proposed_path"]
    }

    var created_node = {
        "path": planned["proposed_path"],
        "name": planned["node_name"],
        "type": planned["node_type"],
        "parentPath": planned["parent_path"],
        "asset": planned["asset_path"],
        "assetProperty": planned["asset_property"],
        "properties": planned["properties"]
    }

    var layout_before = null
    if planned["include_layout_before"]:
        layout_before = dry_align_compact_layout_before(planned["layout_data"]["nodes"], planned["layout_data"]["sceneBounds"], planned["bounds_source"])

    var result = {
        "success": true,
        "projectPath": planned["project_path"],
        "scenePath": planned["scene_path"],
        "assetPath": planned["asset_path"],
        "placed": true,
        "saved": true,
        "valid": counts["errorCount"] == 0,
        "severity": severity,
        "summary": summary,
        "issues": issues,
        "assetInfo": place_asset_compact_asset_info(planned["asset_info"]) if planned["include_asset_info"] else null,
        "plan": planned["plan"] if planned["include_plan"] else [],
        "createdNode": created_node,
        "write": {
            "saved": true,
            "resourceSaverCode": save_error,
            "bytesWritten": bytes_written
        },
        "postValidation": post_validation,
        "layoutBefore": layout_before,
        "layoutAfter": layout_after,
        "limits": planned["limits"]
    }
    print(JSON.stringify(result))

func update_node_properties_error(error_code, message):
    return {
        "success": false,
        "error": error_code,
        "message": message
    }

func update_node_properties_add_issue(issues, severity, code, message, update_index=-1, node_path=null, node_type=null, property_name=null, suggestion=null):
    var issue = {
        "severity": severity,
        "code": code,
        "message": message
    }

    if update_index != -1:
        issue["updateIndex"] = update_index
    if node_path != null:
        issue["nodePath"] = node_path
    if node_type != null:
        issue["nodeType"] = node_type
    if property_name != null:
        issue["property"] = property_name
    if suggestion != null:
        issue["suggestion"] = suggestion

    issues.append(issue)

func update_node_properties_safe_properties():
    return [
        "position",
        "scale",
        "rotation",
        "rotation_degrees",
        "z_index",
        "visible",
        "size",
        "text",
        "disabled",
        "enabled",
        "centered",
        "flip_h",
        "flip_v",
        "offset",
        "zoom",
        "volume_db",
        "autoplay",
        "modulate",
        "self_modulate"
    ]

func update_node_properties_dangerous_properties():
    return [
        "script",
        "owner",
        "name",
        "groups",
        "signals",
        "metadata",
        "process_mode",
        "pause_mode",
        "texture",
        "stream",
        "mesh",
        "font"
    ]

func update_node_properties_convert_current_value(value):
    var value_type = typeof(value)
    if value_type == TYPE_NIL:
        return {"success": true, "value": null}
    if value_type == TYPE_VECTOR2:
        return {"success": true, "value": [value.x, value.y]}
    if value_type == TYPE_VECTOR3:
        return {"success": true, "value": [value.x, value.y, value.z]}
    if value_type == TYPE_COLOR:
        return {"success": true, "value": [value.r, value.g, value.b, value.a]}
    if value_type == TYPE_INT or value_type == TYPE_FLOAT or value_type == TYPE_BOOL or value_type == TYPE_STRING:
        return {"success": true, "value": value}
    return {"success": false, "value": null}

func update_node_properties_color_array(value):
    if not dry_align_is_number_array_any_size(value, [3, 4]):
        return null
    if value.size() == 3:
        return [value[0], value[1], value[2], 1]
    return [value[0], value[1], value[2], value[3]]

func update_node_properties_validate_value(node, property_name, value):
    if property_name == "position" or property_name == "scale":
        if node is Node3D:
            if dry_run_is_number_array(value, 3):
                return {"success": true, "value": [value[0], value[1], value[2]], "valueType": "Vector3"}
            return {"success": false, "message": "Property " + property_name + " expects a 3D vector array.", "suggestion": "Use [x, y, z] for Node3D nodes."}
        if node is Node2D or node is Control:
            if dry_run_is_number_array(value, 2):
                return {"success": true, "value": [value[0], value[1]], "valueType": "Vector2"}
            return {"success": false, "message": "Property " + property_name + " expects a 2D vector array.", "suggestion": "Use [x, y] for Node2D or Control nodes."}
        return {"success": false, "message": "Property " + property_name + " is only supported for Node2D, Control, or Node3D nodes.", "suggestion": "Use a node with a supported transform property."}

    if property_name == "rotation":
        if node is Node2D or node is Control:
            if dry_run_is_number_value(value):
                return {"success": true, "value": value, "valueType": "number"}
            return {"success": false, "message": "Property rotation expects a number for 2D nodes.", "suggestion": "Use a numeric radians value."}
        if node is Node3D:
            return {"success": false, "message": "Property rotation is not supported for Node3D in this dry-run because it is vector-valued.", "suggestion": "Use rotation_degrees with [x, y, z] for Node3D nodes."}
        return {"success": false, "message": "Property rotation is only supported for Node2D or Control nodes.", "suggestion": "Use a 2D node or Control node."}

    if property_name == "rotation_degrees":
        if node is Node3D:
            if dry_run_is_number_array(value, 3):
                return {"success": true, "value": [value[0], value[1], value[2]], "valueType": "Vector3"}
            return {"success": false, "message": "Property rotation_degrees expects a 3D vector array for Node3D nodes.", "suggestion": "Use [x, y, z] degrees for Node3D nodes."}
        if node is Node2D or node is Control:
            if dry_run_is_number_value(value):
                return {"success": true, "value": value, "valueType": "number"}
            return {"success": false, "message": "Property rotation_degrees expects a number for 2D nodes.", "suggestion": "Use a numeric degrees value."}
        return {"success": false, "message": "Property rotation_degrees is only supported for Node2D, Control, or Node3D nodes.", "suggestion": "Use a node with a supported rotation property."}

    if property_name == "z_index":
        if not (node is CanvasItem):
            return {"success": false, "message": "Property z_index is only supported for CanvasItem nodes.", "suggestion": "Use z_index only on Node2D, Control, or other CanvasItem nodes."}
        if dry_run_is_number_value(value):
            return {"success": true, "value": value, "valueType": "number"}
        return {"success": false, "message": "Property z_index expects a number.", "suggestion": "Use a numeric value."}

    if property_name == "visible":
        if typeof(value) == TYPE_BOOL:
            return {"success": true, "value": value, "valueType": "boolean"}
        return {"success": false, "message": "Property visible expects a boolean.", "suggestion": "Use true or false."}

    if property_name == "size":
        if not (node is Control):
            return {"success": false, "message": "Property size is only supported for Control nodes in this dry-run.", "suggestion": "Use [x, y] size on Control-like nodes."}
        if dry_run_is_number_array(value, 2):
            return {"success": true, "value": [value[0], value[1]], "valueType": "Vector2"}
        return {"success": false, "message": "Property size expects a 2D vector array.", "suggestion": "Use [x, y]."}

    if property_name == "text":
        if typeof(value) == TYPE_STRING:
            return {"success": true, "value": value, "valueType": "string"}
        return {"success": false, "message": "Property text expects a string.", "suggestion": "Use a string value."}

    if property_name == "disabled" or property_name == "enabled" or property_name == "centered" or property_name == "flip_h" or property_name == "flip_v" or property_name == "autoplay":
        if typeof(value) == TYPE_BOOL:
            return {"success": true, "value": value, "valueType": "boolean"}
        return {"success": false, "message": "Property " + property_name + " expects a boolean.", "suggestion": "Use true or false."}

    if property_name == "offset" or property_name == "zoom":
        if dry_run_is_number_array(value, 2):
            return {"success": true, "value": [value[0], value[1]], "valueType": "Vector2"}
        return {"success": false, "message": "Property " + property_name + " expects a 2D vector array.", "suggestion": "Use [x, y]."}

    if property_name == "volume_db":
        if dry_run_is_number_value(value):
            return {"success": true, "value": value, "valueType": "number"}
        return {"success": false, "message": "Property volume_db expects a number.", "suggestion": "Use a numeric decibel value."}

    if property_name == "modulate" or property_name == "self_modulate":
        if not (node is CanvasItem):
            return {"success": false, "message": "Property " + property_name + " is only supported for CanvasItem nodes.", "suggestion": "Use color modulation only on Node2D, Control, or other CanvasItem nodes."}
        var color_value = update_node_properties_color_array(value)
        if color_value != null:
            return {"success": true, "value": color_value, "valueType": "Color"}
        return {"success": false, "message": "Property " + property_name + " expects a color array.", "suggestion": "Use [r, g, b] or [r, g, b, a]."}

    return {"success": false, "message": "Property is not supported by this dry-run.", "suggestion": "Use one of the documented safe properties."}

func update_node_properties_values_equal(a, b):
    if typeof(a) == TYPE_ARRAY and typeof(b) == TYPE_ARRAY:
        if a.size() != b.size():
            return false
        for index in range(a.size()):
            if not update_node_properties_values_equal(a[index], b[index]):
                return false
        return true
    if dry_run_is_number_value(a) and dry_run_is_number_value(b):
        return abs(float(a) - float(b)) <= 0.000001
    return a == b

func update_node_properties_finish_result(project_path, scene_path, update_count, issues, plan, include_plan, include_layout_before, layout_data, limits):
    var counts = dry_align_issue_counts(issues)
    var severity = dry_align_severity_from_counts(counts)
    return {
        "success": true,
        "projectPath": project_path,
        "scenePath": scene_path,
        "valid": counts["errorCount"] == 0,
        "severity": severity,
        "summary": {
            "updateCount": update_count,
            "plannedChangeCount": plan.size(),
            "errorCount": counts["errorCount"],
            "warningCount": counts["warningCount"],
            "infoCount": counts["infoCount"]
        },
        "issues": issues,
        "plan": plan if include_plan else [],
        "layoutBefore": dry_align_compact_layout_before(layout_data["nodes"], layout_data["sceneBounds"], "visual") if include_layout_before else null,
        "limits": limits
    }

func update_node_properties_plan(params, provided_scene_root=null):
    if not params.has("scene_path"):
        return {"fatal": {"error": "MISSING_SCENE_PATH", "message": "scene_path is required."}}
    if not params.has("updates") or typeof(params.updates) != TYPE_ARRAY or params.updates.is_empty():
        return {"fatal": {"error": "INVALID_UPDATE", "message": "updates must be a non-empty array."}}

    var scene_path = normalize_resource_scene_path(params.scene_path)
    var project_path = params.project_path if params.has("project_path") else ProjectSettings.globalize_path("res://")
    var updates = params.updates
    var include_plan = params.include_plan if params.has("include_plan") else true
    var include_current_values = params.include_current_values if params.has("include_current_values") else true
    var include_layout_before = params.include_layout_before if params.has("include_layout_before") else false
    var validate_properties = params.validate_properties if params.has("validate_properties") else true
    var max_updates = int(params.max_updates) if params.has("max_updates") else 100
    var max_depth = int(params.max_depth) if params.has("max_depth") else 100
    var max_updates_requested = params.max_updates_requested if params.has("max_updates_requested") else null
    var max_updates_clamped = params.max_updates_clamped if params.has("max_updates_clamped") else false
    var max_depth_requested = params.max_depth_requested if params.has("max_depth_requested") else null
    var max_depth_clamped = params.max_depth_clamped if params.has("max_depth_clamped") else false

    if max_updates < 1:
        return {"fatal": {"error": "INVALID_MAX_UPDATES", "message": "maxUpdates must be a number between 1 and 1000."}}
    if max_depth < 1:
        return {"fatal": {"error": "INVALID_MAX_DEPTH", "message": "maxDepth must be a number between 1 and 200."}}
    if max_updates > 1000:
        max_updates = 1000
        max_updates_clamped = true
    if max_depth > 200:
        max_depth = 200
        max_depth_clamped = true

    var limits = {
        "maxUpdatesRequested": max_updates_requested,
        "maxUpdatesApplied": max_updates,
        "maxUpdatesClamped": max_updates_clamped,
        "maxDepthRequested": max_depth_requested,
        "maxDepthApplied": max_depth,
        "maxDepthClamped": max_depth_clamped
    }

    if not FileAccess.file_exists(scene_path):
        return {"fatal": {"error": "SCENE_PATH_NOT_FOUND", "message": "Scene file does not exist: " + scene_path}}

    var scene_root = provided_scene_root
    var owns_scene_root = false
    if scene_root == null:
        var scene_resource = ResourceLoader.load(scene_path)
        if scene_resource == null or not (scene_resource is PackedScene):
            return {"fatal": {"error": "SCENE_LOAD_FAILED", "message": "Failed to load scene as PackedScene: " + scene_path}}

        scene_root = scene_resource.instantiate()
        if scene_root == null:
            return {"fatal": {"error": "SCENE_INSTANTIATE_FAILED", "message": "Failed to instantiate scene: " + scene_path}}
        owns_scene_root = true

    var issues = []
    var plan = []
    var plan_index_by_key = {}
    var seen_update_keys = {}
    var layout_data = dry_align_build_layout(scene_root, max_depth)
    var node_by_path = layout_data["nodeByPath"]
    var safe_properties = update_node_properties_safe_properties()
    var dangerous_properties = update_node_properties_dangerous_properties()

    if updates.size() > max_updates:
        update_node_properties_add_issue(
            issues,
            "error",
            "UPDATE_TOO_LARGE",
            "Number of update objects exceeds maxUpdates.",
            -1,
            null,
            null,
            null,
            "Reduce updates or increase maxUpdates up to the supported cap."
        )

    var process_count = min(updates.size(), max_updates)
    for update_index in range(process_count):
        var update = updates[update_index]
        if typeof(update) != TYPE_DICTIONARY:
            update_node_properties_add_issue(issues, "error", "INVALID_UPDATE", "Each update must be an object.", update_index)
            continue

        var raw_node_path = dry_run_get_value(update, ["nodePath", "node_path"], null)
        var normalized_node_path = dry_run_normalize_scene_node_path(raw_node_path)
        if normalized_node_path.has("error"):
            update_node_properties_add_issue(issues, "error", "INVALID_NODE_PATH", normalized_node_path["error"], update_index, str(raw_node_path), null, null, "Use read_scene_tree or get_scene_layout to inspect valid node paths.")
            continue

        var node_path = normalized_node_path["path"]
        if not node_by_path.has(node_path):
            update_node_properties_add_issue(issues, "error", "NODE_NOT_FOUND", "Target node was not found in the scene.", update_index, node_path, null, null, "Use read_scene_tree or get_scene_layout to inspect valid node paths.")
            continue

        var node = node_by_path[node_path]
        var node_type = node.get_class()
        var properties = dry_run_get_value(update, ["properties"], null)
        if typeof(properties) != TYPE_DICTIONARY:
            update_node_properties_add_issue(issues, "error", "INVALID_UPDATE", "properties is required and must be an object.", update_index, node_path, node_type)
            continue
        if properties.is_empty():
            update_node_properties_add_issue(issues, "error", "INVALID_UPDATE", "properties must not be empty.", update_index, node_path, node_type)
            continue

        for raw_property_name in properties.keys():
            var property_name = str(raw_property_name).strip_edges()
            var value = properties[raw_property_name]
            if property_name.is_empty():
                update_node_properties_add_issue(issues, "warning", "UNKNOWN_PROPERTY", "Empty property name was skipped.", update_index, node_path, node_type, property_name, "Use a documented safe property name.")
                continue

            if dangerous_properties.has(property_name):
                update_node_properties_add_issue(issues, "error", "UNSUPPORTED_PROPERTY", "Property " + property_name + " is not supported by this dry-run.", update_index, node_path, node_type, property_name, "Use explicit future tools for scripts, resources, ownership, groups, signals, metadata, or process settings.")
                continue

            if not safe_properties.has(property_name):
                update_node_properties_add_issue(issues, "warning", "UNKNOWN_PROPERTY", "Unknown property was skipped by the update planner.", update_index, node_path, node_type, property_name, "Only the documented safe property allowlist is planned.")
                continue

            var has_property = create_scene_blueprint_node_has_property(node, property_name)
            if validate_properties and not has_property:
                update_node_properties_add_issue(issues, "error", "PROPERTY_NOT_AVAILABLE_ON_NODE", "Property is not available on this node.", update_index, node_path, node_type, property_name, "Use properties supported by the target node type.")
                continue

            var validated = update_node_properties_validate_value(node, property_name, value)
            if not validated["success"]:
                update_node_properties_add_issue(issues, "error", "INVALID_PROPERTY_VALUE", validated["message"], update_index, node_path, node_type, property_name, validated["suggestion"] if validated.has("suggestion") else null)
                continue

            var current_value = null
            var current_value_available = false
            if include_current_values:
                if has_property:
                    var converted_current = update_node_properties_convert_current_value(node.get(property_name))
                    current_value = converted_current["value"]
                    current_value_available = converted_current["success"]
                    if not current_value_available:
                        update_node_properties_add_issue(issues, "warning", "CURRENT_VALUE_UNAVAILABLE", "Current property value could not be converted safely.", update_index, node_path, node_type, property_name, "The proposed value is still included in the plan.")
                else:
                    update_node_properties_add_issue(issues, "warning", "CURRENT_VALUE_UNAVAILABLE", "Current property value is unavailable because the property was not found on the node.", update_index, node_path, node_type, property_name, "Enable validateProperties to reject unavailable properties.")

            var proposed_value = validated["value"]
            if include_current_values and current_value_available and update_node_properties_values_equal(current_value, proposed_value):
                update_node_properties_add_issue(issues, "info", "NO_OP_PROPERTY_UPDATE", "Proposed value matches the current value; no change was planned.", update_index, node_path, node_type, property_name)
                continue

            var key = node_path + "\u001f" + property_name
            if seen_update_keys.has(key):
                update_node_properties_add_issue(issues, "warning", "DUPLICATE_PROPERTY_UPDATE", "The same node/property was updated multiple times; the last proposed value is kept in the final plan.", update_index, node_path, node_type, property_name)
            seen_update_keys[key] = true

            var plan_entry = {
                "updateIndex": update_index,
                "nodePath": node_path,
                "nodeType": node_type,
                "property": property_name,
                "proposedValue": proposed_value,
                "valueType": validated["valueType"],
                "reason": "Safe property update planned."
            }
            if include_current_values:
                plan_entry["currentValue"] = current_value

            if plan_index_by_key.has(key):
                plan[plan_index_by_key[key]] = plan_entry
            else:
                plan_index_by_key[key] = plan.size()
                plan.append(plan_entry)

    return {
        "scene_root": scene_root,
        "project_path": project_path,
        "scene_path": scene_path,
        "updates": updates,
        "update_count": updates.size(),
        "issues": issues,
        "plan": plan,
        "include_plan": include_plan,
        "include_current_values": include_current_values,
        "include_layout_before": include_layout_before,
        "validate_properties": validate_properties,
        "max_updates": max_updates,
        "max_depth": max_depth,
        "layout_data": layout_data,
        "owns_scene_root": owns_scene_root,
        "limits": limits
    }

func dry_run_update_node_properties(params):
    var planned = update_node_properties_plan(params)
    if planned.has("fatal"):
        print(JSON.stringify(update_node_properties_error(planned["fatal"]["error"], planned["fatal"]["message"])))
        return

    var result = update_node_properties_finish_result(planned["project_path"], planned["scene_path"], planned["update_count"], planned["issues"], planned["plan"], planned["include_plan"], planned["include_layout_before"], planned["layout_data"], planned["limits"])
    print(JSON.stringify(result))
    planned["scene_root"].free()

func scene_patch_error(error_code, message):
    return {
        "success": false,
        "error": error_code,
        "message": message
    }

func scene_patch_add_issue(issues, severity, code, message, step_index=-1, step_type=null, node_path=null, suggestion=null, property_name=null):
    var issue = {
        "severity": severity,
        "code": code,
        "message": message
    }
    if step_index != -1:
        issue["stepIndex"] = step_index
    if step_type != null:
        issue["stepType"] = step_type
    if node_path != null:
        issue["nodePath"] = node_path
    if suggestion != null:
        issue["suggestion"] = suggestion
    if property_name != null:
        issue["property"] = property_name
    issues.append(issue)

func scene_patch_wrap_issue(issue, step_index, step_type):
    var wrapped = issue.duplicate(true) if typeof(issue) == TYPE_DICTIONARY else {
        "severity": "error",
        "code": "INVALID_STEP",
        "message": "Nested planner returned a non-object issue."
    }
    wrapped["stepIndex"] = step_index
    wrapped["stepType"] = step_type
    return wrapped

func scene_patch_issue_counts(issues):
    return dry_align_issue_counts(issues)

func scene_patch_severity(issues):
    return dry_align_severity_from_counts(scene_patch_issue_counts(issues))

func scene_patch_step_result(step_index, step_type, issues, plan, include_plan, extra={}):
    var counts = scene_patch_issue_counts(issues)
    var result = {
        "stepIndex": step_index,
        "type": step_type,
        "valid": counts["errorCount"] == 0,
        "severity": dry_align_severity_from_counts(counts),
        "plan": plan if include_plan else [],
        "issues": issues,
        "summary": {
            "plannedActionCount": plan.size(),
            "errorCount": counts["errorCount"],
            "warningCount": counts["warningCount"],
            "infoCount": counts["infoCount"]
        }
    }
    for key in extra.keys():
        result[key] = extra[key]
    return result

func scene_patch_sanitize_checkpoint_name(checkpoint_name):
    if checkpoint_name == null:
        return {"name": "checkpoint"}
    if typeof(checkpoint_name) != TYPE_STRING:
        return {"error": "checkpointName must be a string when provided."}
    if checkpoint_name.contains("\u0000"):
        return {"error": "checkpointName must not contain null bytes."}

    var raw = checkpoint_name.strip_edges().to_lower()
    var result = ""
    var previous_underscore = false
    for index in range(raw.length()):
        var code = raw.unicode_at(index)
        var is_alpha = code >= 97 and code <= 122
        var is_digit = code >= 48 and code <= 57
        var is_separator = code == 32 or code == 45 or code == 95
        if is_alpha or is_digit:
            result += raw.substr(index, 1)
            previous_underscore = false
        elif is_separator or not previous_underscore:
            result += "_"
            previous_underscore = true

    result = result.strip_edges()
    while result.begins_with("_"):
        result = result.substr(1)
    while result.ends_with("_"):
        result = result.substr(0, result.length() - 1)
    if result.length() > 64:
        result = result.substr(0, 64)
    while result.ends_with("_"):
        result = result.substr(0, result.length() - 1)
    if result.is_empty():
        result = "checkpoint"
    return {"name": result}

func scene_patch_normalized_node_path(path_value):
    if typeof(path_value) != TYPE_STRING:
        return null
    var normalized = dry_run_normalize_scene_node_path(path_value)
    if normalized.has("path"):
        return normalized["path"]
    return null

func scene_patch_path_is_planned(path_value, planned_node_paths):
    var normalized = scene_patch_normalized_node_path(path_value)
    return normalized != null and planned_node_paths.has(normalized)

func scene_patch_collect_operation_paths(operation):
    var paths = []
    if typeof(operation) != TYPE_DICTIONARY:
        return paths

    var node_path = dry_run_get_value(operation, ["nodePath", "node_path"], null)
    if node_path != null:
        paths.append(node_path)

    var reference_node_path = dry_run_get_value(operation, ["referenceNodePath", "reference_node_path"], null)
    if reference_node_path != null:
        paths.append(reference_node_path)

    var node_paths = dry_run_get_value(operation, ["nodePaths", "node_paths"], null)
    if typeof(node_paths) == TYPE_ARRAY:
        for path_value in node_paths:
            paths.append(path_value)

    var reference = dry_run_get_value(operation, ["reference"], null)
    if typeof(reference) == TYPE_DICTIONARY:
        var reference_path = dry_run_get_value(reference, ["nodePath", "node_path"], null)
        if reference_path != null:
            paths.append(reference_path)

    return paths

func scene_patch_first_planned_reference(step, step_type, planned_node_paths):
    if step_type == "place_asset":
        var parent_path = dry_run_get_value(step, ["parentPath", "parent_path"], null)
        if parent_path != null and scene_patch_path_is_planned(parent_path, planned_node_paths):
            return scene_patch_normalized_node_path(parent_path)

    if step_type == "align_nodes":
        var operations = dry_run_get_value(step, ["operations"], [])
        if typeof(operations) == TYPE_ARRAY:
            for operation in operations:
                for path_value in scene_patch_collect_operation_paths(operation):
                    if scene_patch_path_is_planned(path_value, planned_node_paths):
                        return scene_patch_normalized_node_path(path_value)

    if step_type == "update_node_properties":
        var updates = dry_run_get_value(step, ["updates"], [])
        if typeof(updates) == TYPE_ARRAY:
            for update in updates:
                if typeof(update) != TYPE_DICTIONARY:
                    continue
                var node_path = dry_run_get_value(update, ["nodePath", "node_path"], null)
                if scene_patch_path_is_planned(node_path, planned_node_paths):
                    return scene_patch_normalized_node_path(node_path)

    return null

func scene_patch_wrap_step_issues(step_issues, top_issues, step_index, step_type):
    var wrapped = []
    for issue in step_issues:
        var item = scene_patch_wrap_issue(issue, step_index, step_type)
        wrapped.append(item)
        top_issues.append(item.duplicate(true))
    return wrapped

func scene_patch_add_plan_entries(flattened_plan, step_plan, step_index):
    for plan_item in step_plan:
        if typeof(plan_item) != TYPE_DICTIONARY:
            continue
        var flattened_item = plan_item.duplicate(true)
        flattened_item["stepIndex"] = step_index
        flattened_plan.append(flattened_item)

func scene_patch_track_created_nodes(step_plan, planned_node_paths):
    for plan_item in step_plan:
        if typeof(plan_item) != TYPE_DICTIONARY:
            continue
        if plan_item.get("action", "") == "add_node" and plan_item.has("path"):
            planned_node_paths[str(plan_item["path"])] = true

func scene_patch_release_planned_scene_root(planned):
    if planned.has("owns_scene_root") and planned["owns_scene_root"] and planned.has("scene_root") and planned["scene_root"] != null:
        planned["scene_root"].free()

func scene_patch_apply_place_asset_plan_to_root(scene_root, planned, issues):
    var add_action = null
    var assign_action = null
    var properties_action = null
    for plan_item in planned["plan"]:
        if typeof(plan_item) != TYPE_DICTIONARY or not plan_item.has("action"):
            continue
        if plan_item["action"] == "add_node":
            add_action = plan_item
        elif plan_item["action"] == "assign_asset":
            assign_action = plan_item
        elif plan_item["action"] == "set_properties":
            properties_action = plan_item

    if add_action == null:
        scene_patch_add_issue(issues, "error", "SIMULATION_UNSUPPORTED_ACTION", "Placement plan did not contain an add_node action.")
        return {"success": false, "simulatedNodePath": null, "simulatedActionCount": 0}

    var parent_path = add_action["parentPath"] if add_action.has("parentPath") else null
    var parent_node = update_node_properties_find_node(scene_root, parent_path)
    if parent_node == null:
        scene_patch_add_issue(issues, "error", "SIMULATION_PARENT_NOT_FOUND", "Simulated parent node was not found.", -1, "place_asset", parent_path, "Use an existing parent path or place the parent in an earlier simulated step.")
        return {"success": false, "simulatedNodePath": add_action["path"] if add_action.has("path") else null, "simulatedActionCount": 0}

    var spec = {
        "path": add_action["path"] if add_action.has("path") else planned["proposed_path"],
        "name": add_action["name"] if add_action.has("name") else planned["node_name"],
        "type": add_action["type"] if add_action.has("type") else planned["node_type"],
        "asset": assign_action["asset"] if assign_action != null and assign_action.has("asset") else planned["asset_path"],
        "assetProperty": assign_action["assetProperty"] if assign_action != null and assign_action.has("assetProperty") else planned["asset_property"],
        "assetType": planned["asset_type"],
        "properties": properties_action["properties"] if properties_action != null and properties_action.has("properties") and typeof(properties_action["properties"]) == TYPE_DICTIONARY else {}
    }

    var new_node = create_scene_blueprint_create_node_from_spec(spec, issues)
    if new_node == null:
        scene_patch_add_issue(issues, "error", "SIMULATION_APPLY_FAILED", "Failed to create the simulated node from the normalized placement plan.", -1, "place_asset", spec["path"])
        return {"success": false, "simulatedNodePath": spec["path"], "simulatedActionCount": 0}

    new_node.name = spec["name"]
    parent_node.add_child(new_node)
    create_scene_blueprint_set_owner_recursive(new_node, scene_root)

    if not create_scene_blueprint_apply_properties(new_node, spec, issues):
        scene_patch_add_issue(issues, "error", "SIMULATION_PROPERTY_APPLY_FAILED", "Failed to apply simulated placement properties.", -1, "place_asset", spec["path"])
        return {"success": false, "simulatedNodePath": spec["path"], "simulatedActionCount": 1}

    if not create_scene_blueprint_assign_asset(new_node, spec, issues):
        scene_patch_add_issue(issues, "error", "SIMULATION_ASSET_ASSIGNMENT_FAILED", "Failed to assign the simulated asset.", -1, "place_asset", spec["path"])
        return {"success": false, "simulatedNodePath": spec["path"], "simulatedActionCount": 1}

    return {
        "success": true,
        "simulatedNodePath": spec["path"],
        "simulatedActionCount": planned["plan"].size()
    }

func scene_patch_apply_alignment_plan_to_root(scene_root, max_depth, plan, issues):
    var apply_result = align_nodes_apply_plan(scene_root, max_depth, plan, issues)
    if not apply_result.has("success") or not apply_result["success"]:
        scene_patch_add_issue(issues, "error", "SIMULATION_ALIGNMENT_APPLY_FAILED", apply_result["message"] if apply_result.has("message") else "Failed to apply simulated alignment plan.")
        return {"success": false, "simulatedChangeCount": apply_result["appliedChanges"].size() if apply_result.has("appliedChanges") else 0}
    return {
        "success": true,
        "simulatedChangeCount": apply_result["appliedChanges"].size() if apply_result.has("appliedChanges") else 0,
        "appliedChanges": apply_result["appliedChanges"] if apply_result.has("appliedChanges") else []
    }

func scene_patch_apply_property_plan_to_root(scene_root, max_depth, plan, issues):
    var layout_data = dry_align_build_layout(scene_root, max_depth)
    var node_by_path = layout_data["nodeByPath"]
    var applied_changes = []

    for entry in plan:
        if typeof(entry) != TYPE_DICTIONARY or not entry.has("nodePath") or not entry.has("property") or not entry.has("proposedValue") or not entry.has("valueType"):
            scene_patch_add_issue(issues, "warning", "SIMULATION_UNSUPPORTED_ACTION", "Planned property change was skipped because it was missing required fields.")
            continue

        var node_path = entry["nodePath"]
        var property_name = entry["property"]
        if not node_by_path.has(node_path):
            scene_patch_add_issue(issues, "error", "SIMULATION_NODE_NOT_FOUND", "Simulated target node was not found.", -1, "update_node_properties", node_path, "Use a node path that exists in the current simulated scene state.", property_name)
            return {"success": false, "simulatedChangeCount": applied_changes.size(), "appliedChanges": applied_changes}

        var node = node_by_path[node_path]
        var node_type = node.get_class()
        if not update_node_properties_safe_properties().has(property_name) or update_node_properties_dangerous_properties().has(property_name):
            scene_patch_add_issue(issues, "warning", "SIMULATION_UNSUPPORTED_PROPERTY", "Planned property is not in the safe allowlist and was skipped.", -1, "update_node_properties", node_path, null, property_name)
            continue

        if not create_scene_blueprint_node_has_property(node, property_name):
            scene_patch_add_issue(issues, "error", "SIMULATION_PROPERTY_APPLY_FAILED", "Property is not available on the simulated target node.", -1, "update_node_properties", node_path, "Use a property supported by the selected node type.", property_name)
            return {"success": false, "simulatedChangeCount": applied_changes.size(), "appliedChanges": applied_changes}

        var converted = update_node_properties_convert_plan_value(entry)
        if not converted["success"]:
            scene_patch_add_issue(issues, "error", "SIMULATION_PROPERTY_APPLY_FAILED", converted["message"], -1, "update_node_properties", node_path, null, property_name)
            return {"success": false, "simulatedChangeCount": applied_changes.size(), "appliedChanges": applied_changes}

        var old_value = null
        var converted_old = update_node_properties_convert_current_value(node.get(property_name))
        if converted_old["success"]:
            old_value = converted_old["value"]
        node.set(property_name, converted["value"])
        applied_changes.append({
            "nodePath": node_path,
            "nodeType": node_type,
            "property": property_name,
            "oldValue": old_value,
            "newValue": entry["proposedValue"],
            "valueType": entry["valueType"]
        })

    return {
        "success": true,
        "simulatedChangeCount": applied_changes.size(),
        "appliedChanges": applied_changes
    }

func scene_patch_validation_result(project_path, scene_path, scene_root, source_params, max_depth, max_depth_requested, max_depth_clamped, validation_scope="pre_patch_current_scene"):
    var options = {
        "includeInfo": dry_run_get_value(source_params, ["includeInfo", "include_info"], true),
        "checkResources": dry_run_get_value(source_params, ["checkResources", "check_resources"], true),
        "checkScripts": dry_run_get_value(source_params, ["checkScripts", "check_scripts"], true),
        "checkNodeBasics": dry_run_get_value(source_params, ["checkNodeBasics", "check_node_basics"], true),
        "checkCollisions": dry_run_get_value(source_params, ["checkCollisions", "check_collisions"], true),
        "checkRendering": dry_run_get_value(source_params, ["checkRendering", "check_rendering"], true),
        "checkAudio": dry_run_get_value(source_params, ["checkAudio", "check_audio"], true),
        "checkControls": dry_run_get_value(source_params, ["checkControls", "check_controls"], true),
        "checkOwnership": dry_run_get_value(source_params, ["checkOwnership", "check_ownership"], true)
    }
    var issues = []
    var summary = {
        "totalNodes": 0,
        "errorCount": 0,
        "warningCount": 0,
        "infoCount": 0,
        "maxDepthReached": 0,
        "depthTruncated": false,
        "nodeTypes": {}
    }
    var limits = {
        "maxDepthRequested": max_depth_requested,
        "maxDepthApplied": max_depth,
        "maxDepthClamped": max_depth_clamped
    }
    traverse_validate_scene(scene_root, scene_root, 0, max_depth, options, summary, issues)
    var result = finish_validation_result(project_path, scene_path, scene_root, issues, summary, limits, options)
    result["validationScope"] = validation_scope
    return result

func scene_patch_place_asset_step(step, project_path, scene_path, simulation_root, max_depth, max_depth_requested, max_depth_clamped, include_plan, simulate_cumulative, step_index, top_issues, planned_node_paths):
    var step_type = "place_asset"
    var step_issues = []
    var step_plan = []

    var cumulative_path = scene_patch_first_planned_reference(step, step_type, planned_node_paths)
    if not simulate_cumulative and cumulative_path != null:
        scene_patch_add_issue(step_issues, "error", "CUMULATIVE_SIMULATION_UNSUPPORTED", "This step references a node planned by an earlier step, but cumulative simulation is not supported yet.", step_index, step_type, cumulative_path, "Apply the earlier placement first, then run a new dry-run for dependent placement.")
        var wrapped_cumulative = scene_patch_wrap_step_issues(step_issues, top_issues, step_index, step_type)
        return scene_patch_step_result(step_index, step_type, wrapped_cumulative, step_plan, include_plan)

    var asset_path = dry_run_get_value(step, ["assetPath", "asset_path"], null)
    var sub_params = {
        "project_path": project_path,
        "scene_path": scene_path,
        "asset_path": asset_path,
        "parent_path": dry_run_get_value(step, ["parentPath", "parent_path"], null),
        "node_name": dry_run_get_value(step, ["nodeName", "node_name"], null),
        "node_type": dry_run_get_value(step, ["nodeType", "node_type"], null),
        "asset_property": dry_run_get_value(step, ["assetProperty", "asset_property"], null),
        "placement": dry_run_get_value(step, ["placement"], null),
        "properties": dry_run_get_value(step, ["properties"], null),
        "bounds_source": dry_run_get_value(step, ["boundsSource", "bounds_source"], "visual"),
        "include_plan": true,
        "include_layout_before": false,
        "include_asset_info": true,
        "max_depth": max_depth,
        "max_depth_requested": max_depth_requested,
        "max_depth_clamped": max_depth_clamped
    }

    var planned = place_asset_plan(sub_params, simulation_root if simulate_cumulative else null)
    if planned.has("fatal"):
        scene_patch_add_issue(step_issues, "error", planned["fatal"]["error"], planned["fatal"]["message"], step_index, step_type)
        var wrapped_fatal = scene_patch_wrap_step_issues(step_issues, top_issues, step_index, step_type)
        return scene_patch_step_result(step_index, step_type, wrapped_fatal, step_plan, include_plan)

    step_plan = planned["plan"]
    var summary = {
        "assetType": planned["asset_type"],
        "nodeType": planned["node_type"],
        "assetProperty": planned["asset_property"],
        "parentPath": planned["parent_path"],
        "proposedNodePath": planned["proposed_path"]
    }
    var wrapped_issues = scene_patch_wrap_step_issues(planned["issues"], top_issues, step_index, step_type)
    var extra = {
        "assetPath": planned["asset_path"],
        "proposedNode": planned["proposed_node"],
        "plannerSummary": summary,
        "simulated": false
    }
    if not dry_align_has_error_issues(planned["issues"]) and simulate_cumulative:
        var simulation_issues = []
        var simulation_result = scene_patch_apply_place_asset_plan_to_root(simulation_root, planned, simulation_issues)
        var wrapped_simulation_issues = scene_patch_wrap_step_issues(simulation_issues, top_issues, step_index, step_type)
        wrapped_issues.append_array(wrapped_simulation_issues)
        extra["simulated"] = simulation_result["success"]
        extra["simulationOnly"] = true
        extra["simulatedNodePath"] = simulation_result["simulatedNodePath"] if simulation_result.has("simulatedNodePath") else planned["proposed_path"]
        extra["simulatedActionCount"] = simulation_result["simulatedActionCount"] if simulation_result.has("simulatedActionCount") else 0
        var simulated_changes = [{
            "action": "add_node",
            "path": extra["simulatedNodePath"],
            "nodePath": extra["simulatedNodePath"],
            "nodeType": planned["node_type"],
            "assetPath": planned["asset_path"],
            "assetType": planned["asset_type"],
            "assetProperty": planned["asset_property"]
        }, {
            "action": "assign_asset",
            "path": extra["simulatedNodePath"],
            "nodePath": extra["simulatedNodePath"],
            "nodeType": planned["node_type"],
            "assetPath": planned["asset_path"],
            "assetType": planned["asset_type"],
            "assetProperty": planned["asset_property"]
        }]
        if planned.has("properties") and typeof(planned["properties"]) == TYPE_DICTIONARY and planned["properties"].size() > 0:
            simulated_changes.append({
                "action": "set_properties",
                "path": extra["simulatedNodePath"],
                "nodePath": extra["simulatedNodePath"],
                "nodeType": planned["node_type"],
                "properties": planned["properties"].duplicate(true)
            })
        extra["simulatedChanges"] = simulated_changes
    elif not dry_align_has_error_issues(planned["issues"]):
        scene_patch_track_created_nodes(step_plan, planned_node_paths)

    var result = scene_patch_step_result(step_index, step_type, wrapped_issues, step_plan, include_plan, extra)
    scene_patch_release_planned_scene_root(planned)
    return result

func scene_patch_align_nodes_step(step, project_path, scene_path, scene_root, max_depth, max_depth_requested, max_depth_clamped, include_plan, simulate_cumulative, step_index, top_issues, planned_node_paths):
    var step_type = "align_nodes"
    var step_issues = []
    var step_plan = []
    var cumulative_path = scene_patch_first_planned_reference(step, step_type, planned_node_paths)
    if not simulate_cumulative and cumulative_path != null:
        scene_patch_add_issue(step_issues, "error", "CUMULATIVE_SIMULATION_UNSUPPORTED", "This step references a node planned by an earlier step, but cumulative simulation is not supported yet.", step_index, step_type, cumulative_path, "Apply the asset placement first, then run a new dry-run for alignment.")
        var wrapped_cumulative = scene_patch_wrap_step_issues(step_issues, top_issues, step_index, step_type)
        return scene_patch_step_result(step_index, step_type, wrapped_cumulative, step_plan, include_plan)

    var operations = dry_run_get_value(step, ["operations"], null)
    var operation_count = operations.size() if typeof(operations) == TYPE_ARRAY else 0
    var sub_params = {
        "project_path": project_path,
        "scene_path": scene_path,
        "operations": operations,
        "bounds_source": dry_run_get_value(step, ["boundsSource", "bounds_source"], "visual"),
        "include_plan": true,
        "include_layout_before": false,
        "max_operations": operation_count,
        "max_operations_requested": null,
        "max_operations_clamped": false,
        "max_depth": max_depth,
        "max_depth_requested": max_depth_requested,
        "max_depth_clamped": max_depth_clamped
    }
    var result = dry_run_align_nodes_result(sub_params, scene_root)
    if result.has("success") and result["success"] == false:
        scene_patch_add_issue(step_issues, "error", result["error"], result["message"], step_index, step_type)
        var wrapped_fatal = scene_patch_wrap_step_issues(step_issues, top_issues, step_index, step_type)
        return scene_patch_step_result(step_index, step_type, wrapped_fatal, step_plan, include_plan)

    step_plan = result["plan"] if result.has("plan") else []
    var wrapped_issues = scene_patch_wrap_step_issues(result["issues"] if result.has("issues") else [], top_issues, step_index, step_type)
    var extra = {
        "plannerSummary": result["summary"] if result.has("summary") else {},
        "simulated": false
    }
    if not dry_align_has_error_issues(result["issues"] if result.has("issues") else []) and simulate_cumulative:
        var simulation_issues = []
        var simulation_result = scene_patch_apply_alignment_plan_to_root(scene_root, max_depth, step_plan, simulation_issues)
        var wrapped_simulation_issues = scene_patch_wrap_step_issues(simulation_issues, top_issues, step_index, step_type)
        wrapped_issues.append_array(wrapped_simulation_issues)
        extra["simulated"] = simulation_result["success"]
        extra["simulationOnly"] = true
        extra["simulatedChangeCount"] = simulation_result["simulatedChangeCount"] if simulation_result.has("simulatedChangeCount") else 0
        var simulated_changes = []
        var applied_changes = simulation_result["appliedChanges"] if simulation_result.has("appliedChanges") else []
        for change in applied_changes:
            var simulated_change = change.duplicate(true)
            simulated_change["action"] = "set_position"
            simulated_change["expectedValue"] = simulated_change["newValue"] if simulated_change.has("newValue") else null
            simulated_change["valueType"] = "Vector3" if simulated_change.has("newValue") and typeof(simulated_change["newValue"]) == TYPE_ARRAY and simulated_change["newValue"].size() == 3 else "Vector2"
            simulated_changes.append(simulated_change)
        extra["simulatedChanges"] = simulated_changes
    return scene_patch_step_result(step_index, step_type, wrapped_issues, step_plan, include_plan, extra)

func scene_patch_update_properties_step(step, project_path, scene_path, simulation_root, max_depth, max_depth_requested, max_depth_clamped, include_plan, simulate_cumulative, step_index, top_issues, planned_node_paths):
    var step_type = "update_node_properties"
    var step_issues = []
    var step_plan = []
    var cumulative_path = scene_patch_first_planned_reference(step, step_type, planned_node_paths)
    if not simulate_cumulative and cumulative_path != null:
        scene_patch_add_issue(step_issues, "error", "CUMULATIVE_SIMULATION_UNSUPPORTED", "This step references a node planned by an earlier step, but cumulative simulation is not supported yet.", step_index, step_type, cumulative_path, "Apply the asset placement first, then run a new dry-run for property updates.")
        var wrapped_cumulative = scene_patch_wrap_step_issues(step_issues, top_issues, step_index, step_type)
        return scene_patch_step_result(step_index, step_type, wrapped_cumulative, step_plan, include_plan)

    var updates = dry_run_get_value(step, ["updates"], null)
    var update_count = updates.size() if typeof(updates) == TYPE_ARRAY else 0
    var sub_params = {
        "project_path": project_path,
        "scene_path": scene_path,
        "updates": updates,
        "include_plan": true,
        "include_current_values": true,
        "include_layout_before": false,
        "validate_properties": true,
        "max_updates": update_count,
        "max_updates_requested": null,
        "max_updates_clamped": false,
        "max_depth": max_depth,
        "max_depth_requested": max_depth_requested,
        "max_depth_clamped": max_depth_clamped
    }
    var planned = update_node_properties_plan(sub_params, simulation_root if simulate_cumulative else null)
    if planned.has("fatal"):
        scene_patch_add_issue(step_issues, "error", planned["fatal"]["error"], planned["fatal"]["message"], step_index, step_type)
        var wrapped_fatal = scene_patch_wrap_step_issues(step_issues, top_issues, step_index, step_type)
        return scene_patch_step_result(step_index, step_type, wrapped_fatal, step_plan, include_plan)

    step_plan = planned["plan"]
    var wrapped_issues = scene_patch_wrap_step_issues(planned["issues"], top_issues, step_index, step_type)
    var extra = {
        "plannerSummary": {
            "updateCount": planned["update_count"],
            "plannedChangeCount": step_plan.size()
        },
        "simulated": false
    }
    if not dry_align_has_error_issues(planned["issues"]) and simulate_cumulative:
        var simulation_issues = []
        var simulation_result = scene_patch_apply_property_plan_to_root(simulation_root, max_depth, step_plan, simulation_issues)
        var wrapped_simulation_issues = scene_patch_wrap_step_issues(simulation_issues, top_issues, step_index, step_type)
        wrapped_issues.append_array(wrapped_simulation_issues)
        extra["simulated"] = simulation_result["success"]
        extra["simulationOnly"] = true
        extra["simulatedChangeCount"] = simulation_result["simulatedChangeCount"] if simulation_result.has("simulatedChangeCount") else 0
        var simulated_changes = []
        var applied_changes = simulation_result["appliedChanges"] if simulation_result.has("appliedChanges") else []
        for change in applied_changes:
            var simulated_change = change.duplicate(true)
            simulated_change["action"] = "set_property"
            simulated_change["expectedValue"] = simulated_change["newValue"] if simulated_change.has("newValue") else null
            simulated_changes.append(simulated_change)
        extra["simulatedChanges"] = simulated_changes

    var result = scene_patch_step_result(step_index, step_type, wrapped_issues, step_plan, include_plan, extra)
    scene_patch_release_planned_scene_root(planned)
    return result

func scene_patch_validate_step(step, project_path, scene_path, scene_root, max_depth, max_depth_requested, max_depth_clamped, include_plan, simulate_cumulative, step_index, top_issues):
    var step_type = "validate_scene"
    var validation_scope = "simulated_patch_state" if simulate_cumulative else "pre_patch_current_scene"
    var validation = scene_patch_validation_result(project_path, scene_path, scene_root, step, max_depth, max_depth_requested, max_depth_clamped, validation_scope)
    var step_plan = [{
        "action": "validate_scene",
        "scenePath": scene_path,
        "validationScope": validation_scope
    }]
    var wrapped_issues = scene_patch_wrap_step_issues(validation["issues"], top_issues, step_index, step_type)
    return scene_patch_step_result(step_index, step_type, wrapped_issues, step_plan, include_plan, {
        "validationScope": validation_scope,
        "validation": validation
    })

func scene_patch_checkpoint_step(step, scene_path, include_checkpoints, include_plan, step_index, top_issues):
    var step_type = "create_checkpoint"
    var step_issues = []
    var step_plan = []
    var checkpoint_name_result = scene_patch_sanitize_checkpoint_name(dry_run_get_value(step, ["checkpointName", "checkpoint_name"], "checkpoint"))
    if checkpoint_name_result.has("error"):
        scene_patch_add_issue(step_issues, "error", "INVALID_CHECKPOINT_NAME", checkpoint_name_result["error"], step_index, step_type)
    elif not include_checkpoints:
        scene_patch_add_issue(step_issues, "info", "CHECKPOINT_STEP_SKIPPED", "Checkpoint planning is disabled by includeCheckpoints=false.", step_index, step_type)
    else:
        step_plan.append({
            "action": "create_checkpoint",
            "scenePath": scene_path,
            "checkpointName": checkpoint_name_result["name"]
        })

    var wrapped_issues = scene_patch_wrap_step_issues(step_issues, top_issues, step_index, step_type)
    return scene_patch_step_result(step_index, step_type, wrapped_issues, step_plan, include_plan)

func scene_patch_plan_result(params):
    if not params.has("scene_path"):
        return {"fatal": scene_patch_error("MISSING_SCENE_PATH", "scene_path is required.")}
    if not params.has("steps") or typeof(params.steps) != TYPE_ARRAY or params.steps.is_empty():
        return {"fatal": scene_patch_error("INVALID_STEP", "steps must be a non-empty array.")}

    var scene_path = normalize_resource_scene_path(params.scene_path)
    var project_path = params.project_path if params.has("project_path") else ProjectSettings.globalize_path("res://")
    var steps = params.steps
    var include_plan = params.include_plan if params.has("include_plan") else true
    var include_layout_before = params.include_layout_before if params.has("include_layout_before") else false
    var include_layout_after = params.include_layout_after if params.has("include_layout_after") else false
    var include_validation_before = params.include_validation_before if params.has("include_validation_before") else false
    var include_validation_after = params.include_validation_after if params.has("include_validation_after") else false
    var simulate_cumulative = params.simulate_cumulative if params.has("simulate_cumulative") else true
    var include_checkpoints = params.include_checkpoints if params.has("include_checkpoints") else true
    var max_steps = int(params.max_steps) if params.has("max_steps") else 20
    var max_depth = int(params.max_depth) if params.has("max_depth") else 100
    var max_steps_requested = params.max_steps_requested if params.has("max_steps_requested") else null
    var max_steps_clamped = params.max_steps_clamped if params.has("max_steps_clamped") else false
    var max_depth_requested = params.max_depth_requested if params.has("max_depth_requested") else null
    var max_depth_clamped = params.max_depth_clamped if params.has("max_depth_clamped") else false

    if not FileAccess.file_exists(scene_path):
        return {"fatal": scene_patch_error("SCENE_PATH_NOT_FOUND", "Scene file does not exist: " + scene_path)}

    var scene_resource = ResourceLoader.load(scene_path)
    if scene_resource == null or not (scene_resource is PackedScene):
        return {"fatal": scene_patch_error("SCENE_LOAD_FAILED", "Failed to load scene as PackedScene: " + scene_path)}

    var scene_root = scene_resource.instantiate()
    if scene_root == null:
        return {"fatal": scene_patch_error("SCENE_INSTANTIATE_FAILED", "Failed to instantiate scene: " + scene_path)}

    var issues = []
    var step_results = []
    var flattened_plan = []
    var planned_action_count = 0
    var simulated_action_count = 0
    var planned_node_paths = {}
    var contains_writes_if_applied = false
    var layout_data = dry_align_build_layout(scene_root, max_depth)
    var validation_before = null
    if include_validation_before:
        validation_before = scene_patch_validation_result(project_path, scene_path, scene_root, params, max_depth, max_depth_requested, max_depth_clamped, "pre_patch_current_scene")

    var processed_count = min(steps.size(), max_steps)
    if steps.size() > max_steps:
        scene_patch_add_issue(issues, "error", "STEP_TOO_LARGE", "Number of patch steps exceeds maxSteps.", -1, null, null, "Reduce steps or increase maxSteps up to the supported cap.")

    for step_index in range(processed_count):
        var step = steps[step_index]
        if typeof(step) != TYPE_DICTIONARY:
            var invalid_issues = []
            scene_patch_add_issue(invalid_issues, "error", "INVALID_STEP", "Each patch step must be an object.", step_index, null)
            var wrapped_invalid = scene_patch_wrap_step_issues(invalid_issues, issues, step_index, null)
            step_results.append(scene_patch_step_result(step_index, "unknown", wrapped_invalid, [], include_plan))
            continue

        var step_type = dry_run_get_value(step, ["type"], null)
        if typeof(step_type) != TYPE_STRING:
            var missing_type_issues = []
            scene_patch_add_issue(missing_type_issues, "error", "INVALID_STEP", "Patch step type is required.", step_index, null)
            var wrapped_missing_type = scene_patch_wrap_step_issues(missing_type_issues, issues, step_index, null)
            step_results.append(scene_patch_step_result(step_index, "unknown", wrapped_missing_type, [], include_plan))
            continue

        step_type = step_type.strip_edges()
        var step_result = null
        if step_type == "place_asset":
            contains_writes_if_applied = true
            step_result = scene_patch_place_asset_step(step, project_path, scene_path, scene_root, max_depth, max_depth_requested, max_depth_clamped, include_plan, simulate_cumulative, step_index, issues, planned_node_paths)
        elif step_type == "align_nodes":
            contains_writes_if_applied = true
            step_result = scene_patch_align_nodes_step(step, project_path, scene_path, scene_root, max_depth, max_depth_requested, max_depth_clamped, include_plan, simulate_cumulative, step_index, issues, planned_node_paths)
        elif step_type == "update_node_properties":
            contains_writes_if_applied = true
            step_result = scene_patch_update_properties_step(step, project_path, scene_path, scene_root, max_depth, max_depth_requested, max_depth_clamped, include_plan, simulate_cumulative, step_index, issues, planned_node_paths)
        elif step_type == "validate_scene":
            step_result = scene_patch_validate_step(step, project_path, scene_path, scene_root, max_depth, max_depth_requested, max_depth_clamped, include_plan, simulate_cumulative, step_index, issues)
        elif step_type == "create_checkpoint":
            if include_checkpoints:
                contains_writes_if_applied = true
            step_result = scene_patch_checkpoint_step(step, scene_path, include_checkpoints, include_plan, step_index, issues)
        else:
            var unknown_issues = []
            scene_patch_add_issue(unknown_issues, "error", "UNKNOWN_STEP_TYPE", "Patch step type is not supported: " + step_type, step_index, step_type)
            var wrapped_unknown = scene_patch_wrap_step_issues(unknown_issues, issues, step_index, step_type)
            step_result = scene_patch_step_result(step_index, step_type, wrapped_unknown, [], include_plan)

        step_results.append(step_result)
        if step_result.has("summary") and step_result["summary"].has("plannedActionCount"):
            planned_action_count += int(step_result["summary"]["plannedActionCount"])
        if step_result.has("simulatedActionCount"):
            simulated_action_count += int(step_result["simulatedActionCount"])
        elif step_result.has("simulatedChangeCount"):
            simulated_action_count += int(step_result["simulatedChangeCount"])
        if include_plan and step_result.has("plan"):
            scene_patch_add_plan_entries(flattened_plan, step_result["plan"], step_index)

    var layout_after = null
    if include_layout_after:
        if simulate_cumulative:
            var layout_after_data = dry_align_build_layout(scene_root, max_depth)
            layout_after = dry_align_compact_layout_before(layout_after_data["nodes"], layout_after_data["sceneBounds"], "visual")
        else:
            scene_patch_add_issue(issues, "info", "FINAL_LAYOUT_REQUIRES_CUMULATIVE_SIMULATION", "Final layout output requires simulateCumulative=true.")

    var validation_after = null
    if include_validation_after:
        if simulate_cumulative:
            validation_after = scene_patch_validation_result(project_path, scene_path, scene_root, params, max_depth, max_depth_requested, max_depth_clamped, "simulated_patch_state")
        else:
            scene_patch_add_issue(issues, "info", "FINAL_VALIDATION_REQUIRES_CUMULATIVE_SIMULATION", "Final simulated validation requires simulateCumulative=true.")

    var counts = scene_patch_issue_counts(issues)
    var severity = dry_align_severity_from_counts(counts)
    var result = {
        "success": true,
        "projectPath": project_path,
        "scenePath": scene_path,
        "valid": counts["errorCount"] == 0,
        "severity": severity,
        "summary": {
            "stepCount": steps.size(),
            "plannedActionCount": planned_action_count,
            "simulatedActionCount": simulated_action_count,
            "errorCount": counts["errorCount"],
            "warningCount": counts["warningCount"],
            "infoCount": counts["infoCount"],
            "containsWritesIfApplied": contains_writes_if_applied,
            "cumulativeSimulation": simulate_cumulative
        },
        "issues": issues,
        "steps": step_results,
        "plan": flattened_plan if include_plan else [],
        "layoutBefore": dry_align_compact_layout_before(layout_data["nodes"], layout_data["sceneBounds"], "visual") if include_layout_before else null,
        "layoutAfter": layout_after,
        "validationBefore": validation_before,
        "validationAfter": validation_after,
        "limits": {
            "maxStepsRequested": max_steps_requested,
            "maxStepsApplied": max_steps,
            "maxStepsClamped": max_steps_clamped,
            "maxDepthRequested": max_depth_requested,
            "maxDepthApplied": max_depth,
            "maxDepthClamped": max_depth_clamped
        }
    }
    return {
        "result": result,
        "scene_root": scene_root,
        "owns_scene_root": true
    }

func dry_run_scene_patch(params):
    var planned = scene_patch_plan_result(params)
    if planned.has("fatal"):
        print(JSON.stringify(planned["fatal"]))
        return

    print(JSON.stringify(planned["result"]))
    if planned.has("owns_scene_root") and planned["owns_scene_root"] and planned.has("scene_root") and planned["scene_root"] != null:
        planned["scene_root"].free()

func apply_scene_patch_error(error_code, message, issues=[], checkpoint={}, write_attempted=false, saved=false):
    return {
        "success": false,
        "error": error_code,
        "message": message,
        "checkpoint": checkpoint,
        "writeAttempted": write_attempted,
        "saved": saved,
        "issues": issues
    }

func scene_patch_collect_simulated_changes(step_results):
    var changes = []
    for step in step_results:
        if typeof(step) != TYPE_DICTIONARY or not step.has("simulatedChanges"):
            continue
        var step_changes = step["simulatedChanges"]
        if typeof(step_changes) != TYPE_ARRAY:
            continue
        for change in step_changes:
            if typeof(change) != TYPE_DICTIONARY:
                continue
            var item = change.duplicate(true)
            item["stepIndex"] = step["stepIndex"] if step.has("stepIndex") else -1
            item["stepType"] = step["type"] if step.has("type") else null
            changes.append(item)
    return changes

func scene_patch_append_post_validation_issues(issues, post_validation):
    if typeof(post_validation) != TYPE_DICTIONARY or not post_validation.has("issues") or typeof(post_validation["issues"]) != TYPE_ARRAY:
        return
    for issue in post_validation["issues"]:
        if typeof(issue) != TYPE_DICTIONARY:
            continue
        var item = issue.duplicate(true)
        item["validationScope"] = post_validation["validationScope"] if post_validation.has("validationScope") else "saved_scene_after_patch"
        issues.append(item)

func scene_patch_add_validation_after_errors(issues, validation_after):
    if typeof(validation_after) != TYPE_DICTIONARY or not validation_after.has("issues") or typeof(validation_after["issues"]) != TYPE_ARRAY:
        return
    for issue in validation_after["issues"]:
        if typeof(issue) != TYPE_DICTIONARY:
            continue
        if issue.has("severity") and issue["severity"] == "error":
            var item = issue.duplicate(true)
            item["validationScope"] = validation_after["validationScope"] if validation_after.has("validationScope") else "simulated_patch_state"
            issues.append(item)

func scene_patch_expected_node_path(change):
    if change.has("nodePath"):
        return change["nodePath"]
    if change.has("path"):
        return change["path"]
    return null

func scene_patch_expected_value(change):
    if change.has("expectedValue"):
        return change["expectedValue"]
    if change.has("newValue"):
        return change["newValue"]
    if change.has("proposedValue"):
        return change["proposedValue"]
    return null

func scene_patch_expected_base_detail(change, action):
    var node_path = scene_patch_expected_node_path(change)
    var detail = {
        "stepIndex": change["stepIndex"] if change.has("stepIndex") else -1,
        "stepType": change["stepType"] if change.has("stepType") else null,
        "action": action,
        "nodePath": node_path,
        "matches": false,
        "message": ""
    }
    if change.has("property"):
        detail["property"] = change["property"]
    if change.has("assetPath"):
        detail["assetPath"] = change["assetPath"]
    if change.has("assetProperty"):
        detail["assetProperty"] = change["assetProperty"]
    return detail

func scene_patch_expected_issue_from_detail(severity, code, message, detail):
    var issue = {
        "severity": severity,
        "code": code,
        "message": message
    }
    if detail.has("stepIndex") and detail["stepIndex"] != -1:
        issue["stepIndex"] = detail["stepIndex"]
    if detail.has("stepType") and detail["stepType"] != null:
        issue["stepType"] = detail["stepType"]
    if detail.has("action"):
        issue["action"] = detail["action"]
    if detail.has("nodePath") and detail["nodePath"] != null:
        issue["nodePath"] = detail["nodePath"]
    if detail.has("property"):
        issue["property"] = detail["property"]
    if detail.has("assetPath"):
        issue["assetPath"] = detail["assetPath"]
    if detail.has("assetProperty"):
        issue["assetProperty"] = detail["assetProperty"]
    issue["validationScope"] = "saved_scene_after_patch"
    return issue

func scene_patch_check_expected_node(scene_root, change):
    var detail = scene_patch_expected_base_detail(change, "add_node")
    var issues = []
    var node_path = detail["nodePath"]
    if node_path == null:
        detail["message"] = "Expected node path was unavailable."
        issues.append(scene_patch_expected_issue_from_detail("error", "EXPECTED_CHANGE_UNSUPPORTED", detail["message"], detail))
        return {"success": false, "details": [detail], "issues": issues}

    var node = update_node_properties_find_node(scene_root, node_path)
    if node == null:
        detail["message"] = "Expected node was not found in saved scene."
        issues.append(scene_patch_expected_issue_from_detail("error", "EXPECTED_NODE_NOT_FOUND", detail["message"], detail))
        return {"success": false, "details": [detail], "issues": issues}

    var expected_type = change["nodeType"] if change.has("nodeType") else null
    var actual_type = node.get_class()
    detail["nodeType"] = actual_type
    if expected_type != null and expected_type != actual_type:
        detail["expectedNodeType"] = expected_type
        detail["actualNodeType"] = actual_type
        var asset_type = change["assetType"] if change.has("assetType") else null
        var asset_property = change["assetProperty"] if change.has("assetProperty") else null
        if (asset_type == "scene" or asset_type == "model") and asset_property == "instance":
            detail["matches"] = true
            detail["message"] = "Expected instance node exists; type differs because the instanced scene/model controls its root type."
            issues.append(scene_patch_expected_issue_from_detail("warning", "EXPECTED_NODE_TYPE_MISMATCH", detail["message"], detail))
            return {"success": true, "details": [detail], "issues": issues}
        detail["message"] = "Expected node type did not match saved node type."
        issues.append(scene_patch_expected_issue_from_detail("error", "EXPECTED_NODE_TYPE_MISMATCH", detail["message"], detail))
        return {"success": false, "details": [detail], "issues": issues}

    detail["matches"] = true
    detail["message"] = "Expected node exists in saved scene."
    return {"success": true, "details": [detail], "issues": issues}

func scene_patch_check_expected_asset_assignment(scene_root, change):
    var detail = scene_patch_expected_base_detail(change, "assign_asset")
    var issues = []
    var node_path = detail["nodePath"]
    if node_path == null:
        detail["message"] = "Expected asset assignment node path was unavailable."
        issues.append(scene_patch_expected_issue_from_detail("error", "EXPECTED_CHANGE_UNSUPPORTED", detail["message"], detail))
        return {"success": false, "details": [detail], "issues": issues}

    var node = update_node_properties_find_node(scene_root, node_path)
    if node == null:
        detail["message"] = "Target node for expected asset assignment was not found in saved scene."
        issues.append(scene_patch_expected_issue_from_detail("error", "EXPECTED_NODE_NOT_FOUND", detail["message"], detail))
        return {"success": false, "details": [detail], "issues": issues}

    var asset_path = change["assetPath"] if change.has("assetPath") else null
    var asset_property = change["assetProperty"] if change.has("assetProperty") else null
    var asset_type = change["assetType"] if change.has("assetType") else null
    if asset_path == null or asset_type == null:
        detail["message"] = "Expected asset assignment lacked asset metadata."
        issues.append(scene_patch_expected_issue_from_detail("error", "EXPECTED_CHANGE_UNSUPPORTED", detail["message"], detail))
        return {"success": false, "details": [detail], "issues": issues}

    var assignment = place_asset_check_assignment(node, asset_path, asset_property, asset_type)
    detail["check"] = assignment["check"] if assignment.has("check") else "unknown"
    detail["message"] = assignment["message"] if assignment.has("message") else "Asset assignment check completed."
    detail["matches"] = assignment["assigned"] if assignment.has("assigned") else false
    if assignment.has("warning") and assignment["warning"] != null:
        issues.append(scene_patch_expected_issue_from_detail("warning", assignment["warning"], detail["message"], detail))

    var assignment_failed = (not detail["matches"]) and assignment.get("failHard", true)
    if assignment_failed:
        issues.append(scene_patch_expected_issue_from_detail("error", "EXPECTED_ASSET_ASSIGNMENT_MISSING", detail["message"], detail))
        return {"success": false, "details": [detail], "issues": issues}

    if not detail["matches"]:
        detail["matches"] = true
        detail["message"] = detail["message"] + " Treated as non-fatal because this assignment is presence/provenance limited."
    return {"success": true, "details": [detail], "issues": issues}

func scene_patch_check_expected_property(scene_root, change, action="set_property"):
    var detail = scene_patch_expected_base_detail(change, action)
    var issues = []
    var node_path = detail["nodePath"]
    var property_name = change["property"] if change.has("property") else null
    detail["property"] = property_name
    if node_path == null or property_name == null:
        detail["message"] = "Expected property change lacked nodePath or property."
        issues.append(scene_patch_expected_issue_from_detail("error", "EXPECTED_CHANGE_UNSUPPORTED", detail["message"], detail))
        return {"success": false, "details": [detail], "issues": issues}

    var node = update_node_properties_find_node(scene_root, node_path)
    if node == null:
        detail["message"] = "Target node for expected property change was not found in saved scene."
        issues.append(scene_patch_expected_issue_from_detail("error", "EXPECTED_NODE_NOT_FOUND", detail["message"], detail))
        return {"success": false, "details": [detail], "issues": issues}

    if property_name == "position" and action == "set_position":
        var expected_position = scene_patch_expected_value(change)
        var actual_position = dry_align_get_local_position(node)
        detail["expectedValue"] = expected_position
        detail["actualValue"] = actual_position
        if actual_position == null or typeof(expected_position) != TYPE_ARRAY:
            detail["message"] = "Saved node position could not be checked for this node dimension."
            issues.append(scene_patch_expected_issue_from_detail("error", "EXPECTED_POSITION_MISMATCH", detail["message"], detail))
            return {"success": false, "details": [detail], "issues": issues}
        if update_node_properties_values_match_post(actual_position, expected_position):
            detail["matches"] = true
            detail["message"] = "Position matched the planned value within epsilon."
            return {"success": true, "details": [detail], "issues": issues}
        detail["message"] = "Position did not match the planned value."
        issues.append(scene_patch_expected_issue_from_detail("error", "EXPECTED_POSITION_MISMATCH", detail["message"], detail))
        return {"success": false, "details": [detail], "issues": issues}

    if not create_scene_blueprint_node_has_property(node, property_name):
        detail["message"] = "Expected property is not available on the saved node."
        issues.append(scene_patch_expected_issue_from_detail("error", "EXPECTED_PROPERTY_MISMATCH", detail["message"], detail))
        return {"success": false, "details": [detail], "issues": issues}

    var converted_current = update_node_properties_convert_current_value(node.get(property_name))
    if not converted_current["success"]:
        detail["message"] = "Saved property value could not be converted safely."
        issues.append(scene_patch_expected_issue_from_detail("error", "EXPECTED_CHANGE_UNSUPPORTED", detail["message"], detail))
        return {"success": false, "details": [detail], "issues": issues}

    var expected_value = scene_patch_expected_value(change)
    detail["expectedValue"] = expected_value
    detail["actualValue"] = converted_current["value"]
    if update_node_properties_values_match_post(converted_current["value"], expected_value):
        detail["matches"] = true
        detail["message"] = "Property matched the planned value within epsilon."
        return {"success": true, "details": [detail], "issues": issues}

    detail["message"] = "Property did not match the planned value."
    issues.append(scene_patch_expected_issue_from_detail("error", "EXPECTED_PROPERTY_MISMATCH", detail["message"], detail))
    return {"success": false, "details": [detail], "issues": issues}

func scene_patch_post_validate_expected_changes(scene_root, applied_changes, source_params):
    var post = {
        "expectedChangesPassed": true,
        "checkedExpectedChanges": 0,
        "failedExpectedChanges": [],
        "details": [],
        "issues": []
    }

    var latest_property_tokens = {}
    for index in range(applied_changes.size()):
        var change_for_latest = applied_changes[index]
        if typeof(change_for_latest) != TYPE_DICTIONARY:
            continue
        var latest_action = change_for_latest["action"] if change_for_latest.has("action") else null
        var latest_node_path = scene_patch_expected_node_path(change_for_latest)
        if latest_node_path == null:
            continue
        if latest_action == "set_position":
            latest_property_tokens[str(latest_node_path) + "::position"] = str(index)
        elif latest_action == "set_property" and change_for_latest.has("property"):
            latest_property_tokens[str(latest_node_path) + "::" + str(change_for_latest["property"])] = str(index)
        elif latest_action == "set_properties" and change_for_latest.has("properties") and typeof(change_for_latest["properties"]) == TYPE_DICTIONARY:
            for property_name in change_for_latest["properties"].keys():
                latest_property_tokens[str(latest_node_path) + "::" + str(property_name)] = str(index) + "::" + str(property_name)

    for change_index in range(applied_changes.size()):
        var change = applied_changes[change_index]
        if typeof(change) != TYPE_DICTIONARY:
            var detail = {
                "stepIndex": -1,
                "stepType": null,
                "action": "unknown",
                "nodePath": null,
                "matches": false,
                "message": "Applied change entry was not an object."
            }
            post["details"].append(detail)
            post["failedExpectedChanges"].append(detail)
            post["issues"].append(scene_patch_expected_issue_from_detail("error", "EXPECTED_CHANGE_UNSUPPORTED", detail["message"], detail))
            continue

        var action = change["action"] if change.has("action") else null
        var check = null
        if action == "add_node":
            check = scene_patch_check_expected_node(scene_root, change)
        elif action == "assign_asset":
            check = scene_patch_check_expected_asset_assignment(scene_root, change)
        elif action == "set_position":
            var position_node_path = scene_patch_expected_node_path(change)
            var position_key = str(position_node_path) + "::position"
            if latest_property_tokens.get(position_key, null) != str(change_index):
                continue
            var position_change = change.duplicate(true)
            position_change["property"] = "position"
            check = scene_patch_check_expected_property(scene_root, position_change, "set_position")
        elif action == "set_property":
            var property_node_path = scene_patch_expected_node_path(change)
            var property_key = str(property_node_path) + "::" + str(change["property"] if change.has("property") else "")
            if latest_property_tokens.get(property_key, null) != str(change_index):
                continue
            check = scene_patch_check_expected_property(scene_root, change, "set_property")
        elif action == "set_properties":
            var set_properties_success = true
            var set_properties_details = []
            var set_properties_issues = []
            var properties = change["properties"] if change.has("properties") else {}
            if typeof(properties) != TYPE_DICTIONARY:
                var unsupported_detail = scene_patch_expected_base_detail(change, "set_properties")
                unsupported_detail["message"] = "set_properties change did not contain a properties object."
                set_properties_details.append(unsupported_detail)
                set_properties_issues.append(scene_patch_expected_issue_from_detail("error", "EXPECTED_CHANGE_UNSUPPORTED", unsupported_detail["message"], unsupported_detail))
                set_properties_success = false
            else:
                for property_name in properties.keys():
                    var set_properties_node_path = scene_patch_expected_node_path(change)
                    var set_properties_key = str(set_properties_node_path) + "::" + str(property_name)
                    if latest_property_tokens.get(set_properties_key, null) != str(change_index) + "::" + str(property_name):
                        continue
                    var property_change = change.duplicate(true)
                    property_change["action"] = "set_property"
                    property_change["property"] = property_name
                    property_change["expectedValue"] = properties[property_name]
                    var property_check = scene_patch_check_expected_property(scene_root, property_change, "set_property")
                    set_properties_details.append_array(property_check["details"])
                    set_properties_issues.append_array(property_check["issues"])
                    if not property_check["success"]:
                        set_properties_success = false
            check = {
                "success": set_properties_success,
                "details": set_properties_details,
                "issues": set_properties_issues
            }
        else:
            var detail_unknown = scene_patch_expected_base_detail(change, str(action))
            detail_unknown["message"] = "Expected change action is not supported by post-validation."
            check = {
                "success": false,
                "details": [detail_unknown],
                "issues": [scene_patch_expected_issue_from_detail("error", "EXPECTED_CHANGE_UNSUPPORTED", detail_unknown["message"], detail_unknown)]
            }

        post["details"].append_array(check["details"])
        post["issues"].append_array(check["issues"])
        for detail_item in check["details"]:
            post["checkedExpectedChanges"] += 1
            if typeof(detail_item) == TYPE_DICTIONARY and (not detail_item.has("matches") or not detail_item["matches"]):
                post["failedExpectedChanges"].append(detail_item)

    if not post["failedExpectedChanges"].is_empty():
        post["expectedChangesPassed"] = false
        post["issues"].append({
            "severity": "error",
            "code": "EXPECTED_CHANGE_MISMATCH",
            "message": "One or more expected saved changes did not match the patch plan.",
            "validationScope": "saved_scene_after_patch"
        })
    else:
        post["expectedChangesPassed"] = not dry_align_has_error_issues(post["issues"])

    return post

func scene_patch_post_validate_saved_scene(scene_path, project_path, source_params, max_depth, max_depth_requested, max_depth_clamped, applied_changes=[]):
    var post = {
        "loadable": false,
        "instantiable": false,
        "validationScope": "saved_scene_after_patch",
        "valid": false,
        "expectedChangesPassed": false,
        "checkedExpectedChanges": 0,
        "failedExpectedChanges": [],
        "details": [],
        "issues": [],
        "summary": {},
        "severity": "error"
    }

    var scene_resource = ResourceLoader.load(scene_path, "", ResourceLoader.CACHE_MODE_IGNORE)
    if scene_resource == null or not (scene_resource is PackedScene):
        return {
            "success": false,
            "message": "Saved scene could not be loaded as a PackedScene.",
            "postValidation": post
        }
    post["loadable"] = true

    var scene_root = scene_resource.instantiate()
    if scene_root == null:
        return {
            "success": false,
            "message": "Saved scene could not be instantiated.",
            "postValidation": post
        }
    post["instantiable"] = true

    var validation = scene_patch_validation_result(project_path, scene_path, scene_root, source_params, max_depth, max_depth_requested, max_depth_clamped, "saved_scene_after_patch")
    var expected = scene_patch_post_validate_expected_changes(scene_root, applied_changes, source_params)
    scene_root.free()
    post["valid"] = validation["valid"] if validation.has("valid") else false
    post["issues"] = validation["issues"] if validation.has("issues") else []
    post["issues"].append_array(expected["issues"])
    post["expectedChangesPassed"] = expected["expectedChangesPassed"]
    post["checkedExpectedChanges"] = expected["checkedExpectedChanges"]
    post["failedExpectedChanges"] = expected["failedExpectedChanges"]
    post["details"] = expected["details"]
    post["summary"] = validation["summary"] if validation.has("summary") else {}
    var post_counts = scene_patch_issue_counts(post["issues"])
    post["severity"] = dry_align_severity_from_counts(post_counts)
    post["limits"] = validation["limits"] if validation.has("limits") else {}

    return {
        "success": post["valid"] and post["expectedChangesPassed"],
        "message": "Saved scene validation failed." if not post["valid"] else ("Expected saved changes did not match the patch plan." if not post["expectedChangesPassed"] else "Post-validation passed."),
        "postValidation": post
    }

func scene_patch_noop_result(dry_result, issues, checkpoint):
    scene_patch_add_issue(issues, "info", "NO_CHANGES_PLANNED", "Patch produced no scene changes to save.")
    var counts = scene_patch_issue_counts(issues)
    var summary = dry_result["summary"].duplicate(true) if dry_result.has("summary") else {}
    summary["appliedActionCount"] = 0
    summary["errorCount"] = counts["errorCount"]
    summary["warningCount"] = counts["warningCount"]
    summary["infoCount"] = counts["infoCount"]
    summary["savedOnce"] = false

    return {
        "success": true,
        "projectPath": dry_result["projectPath"] if dry_result.has("projectPath") else ProjectSettings.globalize_path("res://"),
        "scenePath": dry_result["scenePath"] if dry_result.has("scenePath") else "res://",
        "applied": false,
        "saved": false,
        "valid": counts["errorCount"] == 0,
        "severity": dry_align_severity_from_counts(counts),
        "checkpoint": checkpoint,
        "summary": summary,
        "issues": issues,
        "steps": dry_result["steps"] if dry_result.has("steps") else [],
        "plan": dry_result["plan"] if dry_result.has("plan") else [],
        "appliedChanges": [],
        "write": {
            "saved": false,
            "resourceSaverCode": null,
            "bytesWritten": 0
        },
        "postValidation": null,
        "layoutBefore": dry_result["layoutBefore"] if dry_result.has("layoutBefore") else null,
        "layoutAfter": dry_result["layoutAfter"] if dry_result.has("layoutAfter") else null,
        "validationBefore": dry_result["validationBefore"] if dry_result.has("validationBefore") else null,
        "validationAfter": dry_result["validationAfter"] if dry_result.has("validationAfter") else null,
        "limits": dry_result["limits"] if dry_result.has("limits") else {}
    }

func apply_scene_patch(params):
    if not params.has("scene_path"):
        print(JSON.stringify(apply_scene_patch_error("MISSING_SCENE_PATH", "scene_path is required.")))
        return
    if not params.has("steps") or typeof(params.steps) != TYPE_ARRAY or params.steps.is_empty():
        print(JSON.stringify(apply_scene_patch_error("INVALID_STEP", "steps must be a non-empty array.")))
        return

    var checkpoint = params.checkpoint if params.has("checkpoint") and typeof(params.checkpoint) == TYPE_DICTIONARY else {
        "created": false,
        "checkpointPath": null,
        "metadataPath": null
    }
    var validate_before_write = params.validate_before_write if params.has("validate_before_write") else true
    var validate_after_write = params.validate_after_write if params.has("validate_after_write") else true
    var include_plan = params.include_plan if params.has("include_plan") else true
    var max_depth = int(params.max_depth) if params.has("max_depth") else 100
    var max_depth_requested = params.max_depth_requested if params.has("max_depth_requested") else null
    var max_depth_clamped = params.max_depth_clamped if params.has("max_depth_clamped") else false
    var project_path = params.project_path if params.has("project_path") else ProjectSettings.globalize_path("res://")

    var plan_params = params.duplicate(true)
    plan_params["simulate_cumulative"] = true
    plan_params["include_plan"] = true
    plan_params["include_checkpoints"] = params.create_checkpoint if params.has("create_checkpoint") else true

    var planned = scene_patch_plan_result(plan_params)
    if planned.has("fatal"):
        var fatal = planned["fatal"]
        var fatal_error = apply_scene_patch_error(fatal["error"], fatal["message"], [], checkpoint, false, false)
        print(JSON.stringify(fatal_error))
        return

    var scene_root = planned["scene_root"]
    var dry_result = planned["result"]
    var issues = dry_result["issues"].duplicate(true) if dry_result.has("issues") else []

    if validate_before_write and dry_result.has("validationAfter") and typeof(dry_result["validationAfter"]) == TYPE_DICTIONARY and dry_result["validationAfter"].has("valid") and not dry_result["validationAfter"]["valid"]:
        scene_patch_add_validation_after_errors(issues, dry_result["validationAfter"])

    if dry_align_has_error_issues(issues):
        scene_root.free()
        var validation_error = apply_scene_patch_error("DRY_RUN_VALIDATION_FAILED", "Scene patch dry-run validation failed; scene was not written.", issues, checkpoint, false, false)
        validation_error["steps"] = dry_result["steps"] if dry_result.has("steps") else []
        validation_error["plan"] = dry_result["plan"] if include_plan and dry_result.has("plan") else []
        validation_error["layoutBefore"] = dry_result["layoutBefore"] if dry_result.has("layoutBefore") else null
        validation_error["layoutAfter"] = dry_result["layoutAfter"] if dry_result.has("layoutAfter") else null
        validation_error["validationBefore"] = dry_result["validationBefore"] if dry_result.has("validationBefore") else null
        validation_error["validationAfter"] = dry_result["validationAfter"] if dry_result.has("validationAfter") else null
        validation_error["limits"] = dry_result["limits"] if dry_result.has("limits") else {}
        print(JSON.stringify(validation_error))
        return

    var applied_action_count = int(dry_result["summary"]["simulatedActionCount"]) if dry_result.has("summary") and dry_result["summary"].has("simulatedActionCount") else 0
    var applied_changes = scene_patch_collect_simulated_changes(dry_result["steps"] if dry_result.has("steps") else [])
    if applied_action_count == 0:
        scene_root.free()
        print(JSON.stringify(scene_patch_noop_result(dry_result, issues, checkpoint)))
        return

    var packed_scene = PackedScene.new()
    var pack_result = packed_scene.pack(scene_root)
    if pack_result != OK:
        scene_root.free()
        var pack_error = apply_scene_patch_error("PACK_SCENE_FAILED", "Failed to pack the patched scene; scene was not saved.", issues, checkpoint, false, false)
        pack_error["steps"] = dry_result["steps"] if dry_result.has("steps") else []
        pack_error["plan"] = dry_result["plan"] if include_plan and dry_result.has("plan") else []
        print(JSON.stringify(pack_error))
        return

    var scene_path = dry_result["scenePath"] if dry_result.has("scenePath") else normalize_resource_scene_path(params.scene_path)
    var save_error = ResourceSaver.save(packed_scene, scene_path)
    if save_error != OK:
        scene_root.free()
        var save_result = apply_scene_patch_error("SAVE_SCENE_FAILED", "Failed to save the patched scene.", issues, checkpoint, true, false)
        save_result["steps"] = dry_result["steps"] if dry_result.has("steps") else []
        save_result["plan"] = dry_result["plan"] if include_plan and dry_result.has("plan") else []
        save_result["write"] = {
            "saved": false,
            "resourceSaverCode": save_error,
            "bytesWritten": 0
        }
        print(JSON.stringify(save_result))
        return

    var bytes_written = 0
    var file = FileAccess.open(scene_path, FileAccess.READ)
    if file != null:
        bytes_written = file.get_length()
        file.close()

    var post_validation = null
    if validate_after_write:
        var post_result = scene_patch_post_validate_saved_scene(scene_path, project_path, params, max_depth, max_depth_requested, max_depth_clamped, applied_changes)
        post_validation = post_result["postValidation"]
        scene_patch_append_post_validation_issues(issues, post_validation)
        if not post_result["success"]:
            scene_root.free()
            var post_error = apply_scene_patch_error("POST_VALIDATE_FAILED", post_result["message"], issues, checkpoint, true, true)
            post_error["steps"] = dry_result["steps"] if dry_result.has("steps") else []
            post_error["plan"] = dry_result["plan"] if include_plan and dry_result.has("plan") else []
            post_error["appliedChanges"] = applied_changes
            post_error["write"] = {
                "saved": true,
                "resourceSaverCode": save_error,
                "bytesWritten": bytes_written
            }
            post_error["postValidation"] = post_validation
            post_error["layoutBefore"] = dry_result["layoutBefore"] if dry_result.has("layoutBefore") else null
            post_error["layoutAfter"] = dry_result["layoutAfter"] if dry_result.has("layoutAfter") else null
            post_error["validationBefore"] = dry_result["validationBefore"] if dry_result.has("validationBefore") else null
            post_error["validationAfter"] = dry_result["validationAfter"] if dry_result.has("validationAfter") else null
            post_error["limits"] = dry_result["limits"] if dry_result.has("limits") else {}
            print(JSON.stringify(post_error))
            return

    scene_root.free()

    var counts = scene_patch_issue_counts(issues)
    var summary = dry_result["summary"].duplicate(true) if dry_result.has("summary") else {}
    summary["appliedActionCount"] = applied_action_count
    summary["errorCount"] = counts["errorCount"]
    summary["warningCount"] = counts["warningCount"]
    summary["infoCount"] = counts["infoCount"]
    summary["savedOnce"] = true

    var result = {
        "success": true,
        "projectPath": project_path,
        "scenePath": scene_path,
        "applied": true,
        "saved": true,
        "valid": counts["errorCount"] == 0,
        "severity": dry_align_severity_from_counts(counts),
        "checkpoint": checkpoint,
        "summary": summary,
        "issues": issues,
        "steps": dry_result["steps"] if dry_result.has("steps") else [],
        "plan": dry_result["plan"] if include_plan and dry_result.has("plan") else [],
        "appliedChanges": applied_changes,
        "write": {
            "saved": true,
            "resourceSaverCode": save_error,
            "bytesWritten": bytes_written
        },
        "postValidation": post_validation,
        "layoutBefore": dry_result["layoutBefore"] if dry_result.has("layoutBefore") else null,
        "layoutAfter": dry_result["layoutAfter"] if dry_result.has("layoutAfter") else null,
        "validationBefore": dry_result["validationBefore"] if dry_result.has("validationBefore") else null,
        "validationAfter": dry_result["validationAfter"] if dry_result.has("validationAfter") else null,
        "limits": dry_result["limits"] if dry_result.has("limits") else {}
    }
    print(JSON.stringify(result))

func update_node_properties_write_error(error_code, message, issues=[]):
    return {
        "success": false,
        "error": error_code,
        "message": message,
        "issues": issues
    }

func update_node_properties_empty_post_validation():
    return {
        "loadable": null,
        "instantiable": null,
        "propertyChecksPassed": null,
        "checkedProperties": 0,
        "failedProperties": [],
        "details": []
    }

func update_node_properties_scene_path_to_relative(node_path):
    var slash = node_path.find("/")
    if slash >= 0:
        return node_path.substr(slash + 1)
    return ""

func update_node_properties_find_node(root, node_path):
    var relative_path = update_node_properties_scene_path_to_relative(node_path)
    if relative_path.is_empty():
        return root
    return root.get_node_or_null(NodePath(relative_path))

func update_node_properties_convert_plan_value(plan_entry):
    if not plan_entry.has("property") or not plan_entry.has("proposedValue") or not plan_entry.has("valueType"):
        return {"success": false, "message": "Planned change is missing property, proposedValue, or valueType."}

    var property_name = plan_entry["property"]
    var proposed_value = plan_entry["proposedValue"]
    var value_type = plan_entry["valueType"]

    if not update_node_properties_safe_properties().has(property_name) or update_node_properties_dangerous_properties().has(property_name):
        return {"success": false, "message": "Planned property is not in the safe allowlist."}

    if value_type == "Vector2":
        if dry_run_is_number_array(proposed_value, 2):
            return {"success": true, "value": Vector2(proposed_value[0], proposed_value[1])}
        return {"success": false, "message": "Planned Vector2 value must be [x, y]."}

    if value_type == "Vector3":
        if dry_run_is_number_array(proposed_value, 3):
            return {"success": true, "value": Vector3(proposed_value[0], proposed_value[1], proposed_value[2])}
        return {"success": false, "message": "Planned Vector3 value must be [x, y, z]."}

    if value_type == "Color":
        var color_value = update_node_properties_color_array(proposed_value)
        if color_value != null:
            return {"success": true, "value": Color(color_value[0], color_value[1], color_value[2], color_value[3])}
        return {"success": false, "message": "Planned Color value must be [r, g, b] or [r, g, b, a]."}

    if value_type == "number":
        if dry_run_is_number_value(proposed_value):
            return {"success": true, "value": proposed_value}
        return {"success": false, "message": "Planned number value must be numeric."}

    if value_type == "boolean":
        if typeof(proposed_value) == TYPE_BOOL:
            return {"success": true, "value": proposed_value}
        return {"success": false, "message": "Planned boolean value must be true or false."}

    if value_type == "string":
        if typeof(proposed_value) == TYPE_STRING:
            return {"success": true, "value": proposed_value}
        return {"success": false, "message": "Planned string value must be a string."}

    return {"success": false, "message": "Unsupported planned value type: " + str(value_type)}

func update_node_properties_values_match_post(actual_value, expected_value):
    if typeof(actual_value) == TYPE_ARRAY and typeof(expected_value) == TYPE_ARRAY:
        if actual_value.size() != expected_value.size():
            return false
        for index in range(actual_value.size()):
            if not update_node_properties_values_match_post(actual_value[index], expected_value[index]):
                return false
        return true
    if dry_run_is_number_value(actual_value) and dry_run_is_number_value(expected_value):
        return abs(float(actual_value) - float(expected_value)) <= 0.001
    return actual_value == expected_value

func update_node_properties_post_validate(scene_path, applied_changes):
    var post = update_node_properties_empty_post_validation()
    post["loadable"] = false
    post["instantiable"] = false
    post["propertyChecksPassed"] = false
    var warnings = []

    var scene_resource = ResourceLoader.load(scene_path, "", ResourceLoader.CACHE_MODE_IGNORE)
    if scene_resource == null or not (scene_resource is PackedScene):
        return {"success": false, "message": "Saved scene could not be loaded as a PackedScene.", "postValidation": post, "warnings": warnings}
    post["loadable"] = true

    var root = scene_resource.instantiate()
    if root == null:
        return {"success": false, "message": "Saved scene could not be instantiated.", "postValidation": post, "warnings": warnings}
    post["instantiable"] = true

    for change in applied_changes:
        var detail = {
            "nodePath": change["nodePath"] if change.has("nodePath") else null,
            "property": change["property"] if change.has("property") else null,
            "matches": false,
            "message": ""
        }

        if not change.has("nodePath") or not change.has("property") or not change.has("newValue"):
            detail["message"] = "Applied change is missing nodePath, property, or newValue."
            post["failedProperties"].append(detail)
            post["details"].append(detail)
            continue

        var node = update_node_properties_find_node(root, change["nodePath"])
        if node == null:
            detail["message"] = "Target node was not found in the saved scene."
            post["failedProperties"].append(detail)
            post["details"].append(detail)
            continue

        if not create_scene_blueprint_node_has_property(node, change["property"]):
            detail["message"] = "Property is not available on the saved node."
            post["failedProperties"].append(detail)
            post["details"].append(detail)
            continue

        var converted_current = update_node_properties_convert_current_value(node.get(change["property"]))
        if not converted_current["success"]:
            detail["message"] = "Saved property value could not be converted safely."
            post["failedProperties"].append(detail)
            post["details"].append(detail)
            continue

        if update_node_properties_values_match_post(converted_current["value"], change["newValue"]):
            detail["matches"] = true
            detail["message"] = "Property matched the planned value within epsilon."
        else:
            detail["message"] = "Property did not match the planned value."
            detail["actualValue"] = converted_current["value"]
            detail["expectedValue"] = change["newValue"]
            post["failedProperties"].append(detail)
        post["details"].append(detail)

    root.free()
    post["checkedProperties"] = applied_changes.size()
    post["propertyChecksPassed"] = post["failedProperties"].is_empty()

    if not post["propertyChecksPassed"]:
        return {"success": false, "message": "One or more saved properties did not match the planned values.", "postValidation": post, "warnings": warnings}
    return {"success": true, "message": "", "postValidation": post, "warnings": warnings}

func update_node_properties_noop_result(planned, issues, post_validation=null):
    update_node_properties_add_issue(issues, "info", "NO_CHANGES_PLANNED", "No property changes were planned; scene was not saved.")
    var counts = dry_align_issue_counts(issues)
    var severity = dry_align_severity_from_counts(counts)
    return {
        "success": true,
        "projectPath": planned["project_path"],
        "scenePath": planned["scene_path"],
        "applied": false,
        "saved": false,
        "valid": counts["errorCount"] == 0,
        "severity": severity,
        "summary": {
            "updateCount": planned["update_count"],
            "plannedChangeCount": planned["plan"].size(),
            "appliedChangeCount": 0,
            "errorCount": counts["errorCount"],
            "warningCount": counts["warningCount"],
            "infoCount": counts["infoCount"]
        },
        "issues": issues,
        "plan": planned["plan"] if planned["include_plan"] else [],
        "appliedChanges": [],
        "write": {
            "saved": false,
            "resourceSaverCode": null,
            "bytesWritten": 0
        },
        "postValidation": post_validation if post_validation != null else update_node_properties_empty_post_validation(),
        "layoutBefore": dry_align_compact_layout_before(planned["layout_data"]["nodes"], planned["layout_data"]["sceneBounds"], "visual") if planned["include_layout_before"] else null,
        "layoutAfter": null,
        "limits": planned["limits"]
    }

func update_node_properties(params):
    var validate_before_write = params.validate_before_write if params.has("validate_before_write") else true
    var validate_after_write = params.validate_after_write if params.has("validate_after_write") else true
    var include_layout_after = params.include_layout_after if params.has("include_layout_after") else false

    var planned = update_node_properties_plan(params)
    if planned.has("fatal"):
        print(JSON.stringify(update_node_properties_write_error(planned["fatal"]["error"], planned["fatal"]["message"])))
        return

    var scene_root = planned["scene_root"]
    var issues = planned["issues"]
    var plan = planned["plan"]

    if dry_align_has_error_issues(issues):
        scene_root.free()
        print(JSON.stringify(update_node_properties_write_error("DRY_RUN_VALIDATION_FAILED", "Property update dry-run validation failed; scene was not modified.", issues)))
        return

    if plan.is_empty():
        var noop_result = update_node_properties_noop_result(planned, issues)
        scene_root.free()
        print(JSON.stringify(noop_result))
        return

    var node_by_path = planned["layout_data"]["nodeByPath"]
    var applied_changes = []
    for entry in plan:
        if typeof(entry) != TYPE_DICTIONARY or not entry.has("nodePath") or not entry.has("property") or not entry.has("proposedValue") or not entry.has("valueType"):
            update_node_properties_add_issue(issues, "warning", "UNSUPPORTED_PLANNED_CHANGE", "Planned change was skipped because it was missing required fields.")
            continue

        var node_path = entry["nodePath"]
        var property_name = entry["property"]
        if not node_by_path.has(node_path):
            scene_root.free()
            update_node_properties_add_issue(issues, "error", "NODE_NOT_FOUND", "Target node was not found while applying the normalized plan.", entry["updateIndex"] if entry.has("updateIndex") else -1, node_path, entry["nodeType"] if entry.has("nodeType") else null, property_name)
            print(JSON.stringify(update_node_properties_write_error("NODE_NOT_FOUND", "Target node was not found while applying the normalized plan; scene was not saved.", issues)))
            return

        var node = node_by_path[node_path]
        var node_type = node.get_class()
        if not update_node_properties_safe_properties().has(property_name) or update_node_properties_dangerous_properties().has(property_name):
            update_node_properties_add_issue(issues, "warning", "UNSUPPORTED_PLANNED_CHANGE", "Planned property is not in the safe allowlist and was skipped.", entry["updateIndex"] if entry.has("updateIndex") else -1, node_path, node_type, property_name)
            continue

        if not create_scene_blueprint_node_has_property(node, property_name):
            scene_root.free()
            update_node_properties_add_issue(issues, "error", "SET_PROPERTY_FAILED", "Property is no longer available on the target node.", entry["updateIndex"] if entry.has("updateIndex") else -1, node_path, node_type, property_name)
            print(JSON.stringify(update_node_properties_write_error("SET_PROPERTY_FAILED", "Property is no longer available on the target node; scene was not saved.", issues)))
            return

        var converted = update_node_properties_convert_plan_value(entry)
        if not converted["success"]:
            scene_root.free()
            update_node_properties_add_issue(issues, "error", "UNSUPPORTED_PLANNED_CHANGE", converted["message"], entry["updateIndex"] if entry.has("updateIndex") else -1, node_path, node_type, property_name)
            print(JSON.stringify(update_node_properties_write_error("UNSUPPORTED_PLANNED_CHANGE", "A planned change could not be converted safely; scene was not saved.", issues)))
            return

        var old_value = null
        var converted_old = update_node_properties_convert_current_value(node.get(property_name))
        if converted_old["success"]:
            old_value = converted_old["value"]
        node.set(property_name, converted["value"])
        applied_changes.append({
            "nodePath": node_path,
            "nodeType": node_type,
            "property": property_name,
            "oldValue": old_value,
            "newValue": entry["proposedValue"],
            "valueType": entry["valueType"]
        })

    if applied_changes.is_empty():
        var no_apply_result = update_node_properties_noop_result(planned, issues)
        scene_root.free()
        print(JSON.stringify(no_apply_result))
        return

    var layout_after = null
    if include_layout_after:
        var layout_after_data = dry_align_build_layout(scene_root, planned["max_depth"])
        layout_after = dry_align_compact_layout_before(layout_after_data["nodes"], layout_after_data["sceneBounds"], "visual")

    var packed_scene = PackedScene.new()
    var pack_result = packed_scene.pack(scene_root)
    if pack_result != OK:
        scene_root.free()
        print(JSON.stringify(update_node_properties_write_error("PACK_SCENE_FAILED", "Failed to pack the modified scene; scene was not saved.", issues)))
        return

    var save_error = ResourceSaver.save(packed_scene, planned["scene_path"])
    if save_error != OK:
        scene_root.free()
        print(JSON.stringify(update_node_properties_write_error("SAVE_SCENE_FAILED", "Failed to save the modified scene.", issues)))
        return

    var bytes_written = 0
    var file = FileAccess.open(planned["scene_path"], FileAccess.READ)
    if file != null:
        bytes_written = file.get_length()
        file.close()

    var post_validation = update_node_properties_empty_post_validation()
    if validate_after_write:
        var post_result = update_node_properties_post_validate(planned["scene_path"], applied_changes)
        post_validation = post_result["postValidation"]
        if post_result.has("warnings"):
            for warning in post_result["warnings"]:
                update_node_properties_add_issue(issues, "warning", warning["code"], warning["message"])
        if not post_result["success"]:
            scene_root.free()
            var post_error = update_node_properties_write_error("POST_VALIDATE_FAILED", post_result["message"], issues)
            post_error["postValidation"] = post_validation
            print(JSON.stringify(post_error))
            return

    scene_root.free()

    var counts = dry_align_issue_counts(issues)
    var severity = dry_align_severity_from_counts(counts)
    var layout_before = null
    if planned["include_layout_before"]:
        layout_before = dry_align_compact_layout_before(planned["layout_data"]["nodes"], planned["layout_data"]["sceneBounds"], "visual")

    var result = {
        "success": true,
        "projectPath": planned["project_path"],
        "scenePath": planned["scene_path"],
        "applied": true,
        "saved": true,
        "valid": counts["errorCount"] == 0,
        "severity": severity,
        "summary": {
            "updateCount": planned["update_count"],
            "plannedChangeCount": plan.size(),
            "appliedChangeCount": applied_changes.size(),
            "errorCount": counts["errorCount"],
            "warningCount": counts["warningCount"],
            "infoCount": counts["infoCount"]
        },
        "issues": issues,
        "plan": plan if planned["include_plan"] else [],
        "appliedChanges": applied_changes,
        "write": {
            "saved": true,
            "resourceSaverCode": save_error,
            "bytesWritten": bytes_written
        },
        "postValidation": post_validation,
        "layoutBefore": layout_before,
        "layoutAfter": layout_after,
        "limits": planned["limits"]
    }
    print(JSON.stringify(result))

func is_nearly_zero(value):
    return abs(value) <= 0.0001

func is_vector2_nearly_zero(value):
    return is_nearly_zero(value.x) or is_nearly_zero(value.y)

func is_vector3_nearly_zero(value):
    return is_nearly_zero(value.x) or is_nearly_zero(value.y) or is_nearly_zero(value.z)

func add_validation_issue(issues, severity, code, message, node, root, prop_name=null, resource_path=null, suggestion=null):
    var issue = {
        "severity": severity,
        "code": code,
        "message": message,
        "nodePath": get_scene_node_path(node, root),
        "nodeType": node.get_class()
    }

    if prop_name != null:
        issue["property"] = prop_name
    if resource_path != null:
        issue["resourcePath"] = resource_path
    if suggestion != null:
        issue["suggestion"] = suggestion

    issues.append(issue)

func validate_resource_path_for_property(node, root, issues, prop_name, resource):
    if resource == null or not (resource is Resource):
        return

    var resource_path = resource.resource_path
    if resource_path.is_empty():
        return

    if not ResourceLoader.exists(resource_path):
        add_validation_issue(
            issues,
            "error",
            "MISSING_RESOURCE",
            "Referenced resource does not exist: " + resource_path,
            node,
            root,
            prop_name,
            resource_path,
            "Assign an existing resource path or remove the broken reference."
        )

func has_descendant_of_class(node, class_name_to_find):
    for child in node.get_children():
        if child.is_class(class_name_to_find):
            return true
        if has_descendant_of_class(child, class_name_to_find):
            return true
    return false

func has_visible_child_content(node):
    for child in node.get_children():
        if child is CanvasItem and child.visible:
            return true
        if child is Node3D and child.visible:
            return true
    return false

func validate_script_reference(node, root, issues):
    var script = node.get_script()
    if script == null:
        return

    var script_path = script.resource_path
    if script_path.is_empty() or not ResourceLoader.exists(script_path):
        add_validation_issue(
            issues,
            "error",
            "MISSING_SCRIPT",
            "Node script reference is missing or does not exist.",
            node,
            root,
            "script",
            script_path if not script_path.is_empty() else null,
            "Assign an existing script resource or clear the script reference."
        )

func validate_resource_references(node, root, issues):
    if node is Sprite2D:
        validate_resource_path_for_property(node, root, issues, "texture", node.texture)
    if node is TextureRect:
        validate_resource_path_for_property(node, root, issues, "texture", node.texture)
    if node is CollisionShape2D:
        validate_resource_path_for_property(node, root, issues, "shape", node.shape)
    if node is CollisionShape3D:
        validate_resource_path_for_property(node, root, issues, "shape", node.shape)
    if node is MeshInstance3D:
        validate_resource_path_for_property(node, root, issues, "mesh", node.mesh)
    if node is AudioStreamPlayer:
        validate_resource_path_for_property(node, root, issues, "stream", node.stream)
    if node is AudioStreamPlayer2D:
        validate_resource_path_for_property(node, root, issues, "stream", node.stream)
    if node is AudioStreamPlayer3D:
        validate_resource_path_for_property(node, root, issues, "stream", node.stream)

func validate_rendering_node(node, root, issues, include_info):
    if node is Sprite2D and node.texture == null:
        add_validation_issue(
            issues,
            "error",
            "SPRITE_MISSING_TEXTURE",
            "Sprite2D node has no texture assigned.",
            node,
            root,
            "texture",
            null,
            "Assign a Texture2D resource or remove the unused Sprite2D node."
        )

    if node is TextureRect and node.texture == null:
        add_validation_issue(
            issues,
            "warning",
            "TEXTURE_RECT_MISSING_TEXTURE",
            "TextureRect node has no texture assigned.",
            node,
            root,
            "texture",
            null,
            "Assign a Texture2D resource or remove the unused TextureRect node."
        )

    if node is MeshInstance3D and node.mesh == null:
        add_validation_issue(
            issues,
            "error",
            "MESH_INSTANCE_MISSING_MESH",
            "MeshInstance3D node has no mesh assigned.",
            node,
            root,
            "mesh",
            null,
            "Assign a Mesh resource or remove the unused MeshInstance3D node."
        )

    if node is Node2D:
        if node.visible and is_vector2_nearly_zero(node.scale):
            add_validation_issue(issues, "warning", "ZERO_SCALE", "Visible Node2D has an approximately zero scale axis.", node, root, "scale", null, "Use a non-zero scale for visible nodes.")
        elif include_info and not node.visible:
            add_validation_issue(issues, "info", "NODE_NOT_VISIBLE", "Node2D is not visible.", node, root, "visible")
    elif node is Control:
        if node.visible and is_vector2_nearly_zero(node.scale):
            add_validation_issue(issues, "warning", "ZERO_SCALE", "Visible Control has an approximately zero scale axis.", node, root, "scale", null, "Use a non-zero scale for visible controls.")
        elif include_info and not node.visible:
            add_validation_issue(issues, "info", "NODE_NOT_VISIBLE", "Control is not visible.", node, root, "visible")
    elif node is Node3D:
        if node.visible and is_vector3_nearly_zero(node.scale):
            add_validation_issue(issues, "warning", "ZERO_SCALE", "Visible Node3D has an approximately zero scale axis.", node, root, "scale", null, "Use a non-zero scale for visible 3D nodes.")

func validate_collision_node(node, root, issues, include_info):
    if node is CollisionShape2D:
        if node.shape == null:
            add_validation_issue(
                issues,
                "error",
                "COLLISION_SHAPE_MISSING_SHAPE",
                "CollisionShape2D node has no shape assigned.",
                node,
                root,
                "shape",
                null,
                "Assign a Shape2D resource or remove the unused CollisionShape2D node."
            )
        elif include_info and node.disabled:
            add_validation_issue(issues, "info", "COLLISION_SHAPE_DISABLED", "CollisionShape2D is disabled.", node, root, "disabled")

    if node is CollisionShape3D:
        if node.shape == null:
            add_validation_issue(
                issues,
                "error",
                "COLLISION_SHAPE_3D_MISSING_SHAPE",
                "CollisionShape3D node has no shape assigned.",
                node,
                root,
                "shape",
                null,
                "Assign a Shape3D resource or remove the unused CollisionShape3D node."
            )

    if node is Area2D or node is StaticBody2D or node is CharacterBody2D or node is RigidBody2D:
        if not has_descendant_of_class(node, "CollisionShape2D") and not has_descendant_of_class(node, "CollisionPolygon2D"):
            add_validation_issue(
                issues,
                "warning",
                "PHYSICS_BODY_WITHOUT_COLLISION",
                "2D physics node has no CollisionShape2D or CollisionPolygon2D descendants.",
                node,
                root,
                null,
                null,
                "Add a collision shape or remove the unused physics body."
            )

    if node is Area3D or node is StaticBody3D or node is CharacterBody3D or node is RigidBody3D:
        if not has_descendant_of_class(node, "CollisionShape3D"):
            add_validation_issue(
                issues,
                "warning",
                "PHYSICS_BODY_3D_WITHOUT_COLLISION",
                "3D physics node has no CollisionShape3D descendants.",
                node,
                root,
                null,
                null,
                "Add a CollisionShape3D or remove the unused physics body."
            )

func validate_audio_node(node, root, issues):
    if node is AudioStreamPlayer and node.stream == null:
        add_validation_issue(issues, "warning", "AUDIO_STREAM_MISSING", "AudioStreamPlayer has no stream assigned.", node, root, "stream", null, "Assign an audio stream or remove the unused audio player.")
    if node is AudioStreamPlayer2D and node.stream == null:
        add_validation_issue(issues, "warning", "AUDIO_STREAM_MISSING", "AudioStreamPlayer2D has no stream assigned.", node, root, "stream", null, "Assign an audio stream or remove the unused audio player.")
    if node is AudioStreamPlayer3D and node.stream == null:
        add_validation_issue(issues, "warning", "AUDIO_STREAM_MISSING", "AudioStreamPlayer3D has no stream assigned.", node, root, "stream", null, "Assign an audio stream or remove the unused audio player.")

func validate_control_node(node, root, issues, include_info):
    if not (node is Control):
        return

    if is_nearly_zero(node.size.x) and is_nearly_zero(node.size.y):
        add_validation_issue(issues, "warning", "CONTROL_ZERO_SIZE", "Control node has approximately zero size.", node, root, "size", null, "Set a useful size or anchors for the Control node.")

    if include_info and node is Button:
        if node.text.strip_edges().is_empty() and node.icon == null and not has_visible_child_content(node):
            add_validation_issue(issues, "info", "BUTTON_EMPTY_TEXT", "Button has empty text and no visible child or icon content.", node, root, "text", null, "Add text, an icon, or visible child content.")

    if include_info and node is Label:
        if node.text.strip_edges().is_empty():
            add_validation_issue(issues, "info", "LABEL_EMPTY_TEXT", "Label has empty text.", node, root, "text", null, "Set label text or remove the unused Label node.")

func validate_node_ownership(node, root, issues):
    if node != root and node.owner == null:
        add_validation_issue(
            issues,
            "warning",
            "NODE_MISSING_OWNER",
            "Instantiated node has no owner.",
            node,
            root,
            "owner",
            null,
            "Check whether this node is intentionally runtime-only before saving scene edits."
        )

func traverse_validate_scene(node, root, depth, max_depth, options, summary, issues):
    var node_type = node.get_class()
    summary["totalNodes"] += 1
    summary["maxDepthReached"] = max(summary["maxDepthReached"], depth)

    if not summary["nodeTypes"].has(node_type):
        summary["nodeTypes"][node_type] = 0
    summary["nodeTypes"][node_type] += 1

    if options["checkScripts"]:
        validate_script_reference(node, root, issues)
    if options["checkResources"]:
        validate_resource_references(node, root, issues)
    if options["checkRendering"]:
        validate_rendering_node(node, root, issues, options["includeInfo"])
    if options["checkCollisions"]:
        validate_collision_node(node, root, issues, options["includeInfo"])
    if options["checkAudio"]:
        validate_audio_node(node, root, issues)
    if options["checkControls"]:
        validate_control_node(node, root, issues, options["includeInfo"])
    if options["checkOwnership"]:
        validate_node_ownership(node, root, issues)

    if depth >= max_depth:
        if node.get_child_count() > 0:
            summary["depthTruncated"] = true
        return

    for child in node.get_children():
        traverse_validate_scene(child, root, depth + 1, max_depth, options, summary, issues)

func finish_validation_result(project_path, scene_path, root, issues, summary, limits, options):
    if options["checkNodeBasics"] and summary["depthTruncated"]:
        issues.append({
            "severity": "warning",
            "code": "DEPTH_TRUNCATED",
            "message": "Scene tree traversal was truncated by maxDepth.",
            "nodePath": get_scene_node_path(root, root),
            "nodeType": root.get_class(),
            "suggestion": "Increase maxDepth if deeper nodes should be validated."
        })

    var error_count = 0
    var warning_count = 0
    var info_count = 0
    for issue in issues:
        if issue["severity"] == "error":
            error_count += 1
        elif issue["severity"] == "warning":
            warning_count += 1
        elif issue["severity"] == "info":
            info_count += 1

    summary["errorCount"] = error_count
    summary["warningCount"] = warning_count
    summary["infoCount"] = info_count

    var top_severity = "ok"
    if error_count > 0:
        top_severity = "error"
    elif warning_count > 0:
        top_severity = "warning"
    elif info_count > 0:
        top_severity = "info"

    return {
        "success": true,
        "projectPath": project_path,
        "scenePath": scene_path,
        "valid": error_count == 0,
        "severity": top_severity,
        "summary": summary,
        "issues": issues,
        "limits": limits
    }

func validate_scene(params):
    if not params.has("scene_path"):
        print_json_error("MISSING_SCENE_PATH", "scene_path is required.")
        return

    var scene_path = normalize_resource_scene_path(params.scene_path)
    var max_depth = params.max_depth if params.has("max_depth") else 100
    var max_depth_requested = params.max_depth_requested if params.has("max_depth_requested") else null
    var max_depth_clamped = params.max_depth_clamped if params.has("max_depth_clamped") else false
    var project_path = params.project_path if params.has("project_path") else ProjectSettings.globalize_path("res://")

    var options = {
        "includeInfo": params.include_info if params.has("include_info") else true,
        "checkResources": params.check_resources if params.has("check_resources") else true,
        "checkScripts": params.check_scripts if params.has("check_scripts") else true,
        "checkNodeBasics": params.check_node_basics if params.has("check_node_basics") else true,
        "checkCollisions": params.check_collisions if params.has("check_collisions") else true,
        "checkRendering": params.check_rendering if params.has("check_rendering") else true,
        "checkAudio": params.check_audio if params.has("check_audio") else true,
        "checkControls": params.check_controls if params.has("check_controls") else true,
        "checkOwnership": params.check_ownership if params.has("check_ownership") else true
    }

    if not FileAccess.file_exists(scene_path):
        print_json_error("SCENE_PATH_NOT_FOUND", "Scene file does not exist: " + scene_path)
        return

    var scene_resource = ResourceLoader.load(scene_path)
    if scene_resource == null or not (scene_resource is PackedScene):
        print_json_error("SCENE_LOAD_FAILED", "Failed to load scene as PackedScene: " + scene_path)
        return

    var scene_root = scene_resource.instantiate()
    if scene_root == null:
        print_json_error("SCENE_INSTANTIATE_FAILED", "Failed to instantiate scene: " + scene_path)
        return

    var issues = []
    var summary = {
        "totalNodes": 0,
        "errorCount": 0,
        "warningCount": 0,
        "infoCount": 0,
        "maxDepthReached": 0,
        "depthTruncated": false,
        "nodeTypes": {}
    }
    var limits = {
        "maxDepthRequested": max_depth_requested,
        "maxDepthApplied": max_depth,
        "maxDepthClamped": max_depth_clamped
    }

    traverse_validate_scene(scene_root, scene_root, 0, max_depth, options, summary, issues)
    var result = finish_validation_result(project_path, scene_path, scene_root, issues, summary, limits, options)
    print(JSON.stringify(result))
    scene_root.free()

func dry_run_get_value(data, keys, default_value=null):
    for key in keys:
        if data.has(key):
            return data[key]
    return default_value

func dry_run_has_value(data, keys):
    for key in keys:
        if data.has(key):
            return true
    return false

func dry_run_add_issue(issues, severity, code, message, node_path=null, node_type=null, prop_name=null, asset_path=null, suggestion=null):
    var issue = {
        "severity": severity,
        "code": code,
        "message": message,
        "nodePath": node_path,
        "nodeType": node_type
    }

    if prop_name != null:
        issue["property"] = prop_name
    if asset_path != null:
        issue["asset"] = asset_path
    if suggestion != null:
        issue["suggestion"] = suggestion

    issues.append(issue)

func dry_run_is_number_value(value):
    return typeof(value) == TYPE_INT or typeof(value) == TYPE_FLOAT

func dry_run_is_number_array(value, expected_size):
    if typeof(value) != TYPE_ARRAY:
        return false
    if value.size() != expected_size:
        return false
    for item in value:
        if not dry_run_is_number_value(item):
            return false
    return true

func dry_run_has_unsupported_children(data):
    if not data.has("children"):
        return false
    var children = data.children
    if typeof(children) != TYPE_ARRAY:
        return true
    return children.size() > 0

func dry_run_validate_node_name(name_value):
    if typeof(name_value) != TYPE_STRING:
        return "Node name must be a string."

    var node_name = name_value.strip_edges()
    if node_name.is_empty():
        return "Node name must not be empty."
    if node_name.contains("\u0000"):
        return "Node name must not contain null bytes."
    if node_name.contains("/") or node_name.contains("\\"):
        return "Node name must not contain path separators."
    if node_name == "." or node_name == ".." or node_name.contains(".."):
        return "Node name must not contain path traversal."

    return null

func dry_run_normalize_scene_node_path(path_value):
    if typeof(path_value) != TYPE_STRING:
        return {"error": "Node path must be a string."}

    var raw_path = path_value.strip_edges()
    if raw_path.is_empty():
        return {"error": "Node path must not be empty."}
    if raw_path.contains("\u0000"):
        return {"error": "Node path must not contain null bytes."}

    var slash_path = raw_path.replace("\\", "/")
    if slash_path.begins_with("res://") or slash_path.contains("://"):
        return {"error": "Node paths must be scene-relative paths, not resource paths."}
    if slash_path.begins_with("/") or (slash_path.length() >= 2 and slash_path.substr(1, 1) == ":"):
        return {"error": "Node paths must not be absolute filesystem paths."}

    var clean_parts = []
    for part in slash_path.split("/"):
        if part.is_empty():
            continue
        if part == "." or part == "..":
            return {"error": "Node paths must not contain traversal segments."}
        clean_parts.append(part)

    if clean_parts.is_empty():
        return {"error": "Node path must contain at least one segment."}

    return {"path": "/".join(clean_parts)}

func dry_run_parent_path_from_path(node_path):
    var slash_index = node_path.rfind("/")
    if slash_index == -1:
        return ""
    return node_path.substr(0, slash_index)

func dry_run_normalize_asset_path(asset_value):
    if typeof(asset_value) != TYPE_STRING:
        return {"error": "Asset path must be a string."}

    var raw_path = asset_value.strip_edges()
    if raw_path.is_empty():
        return {"error": "Asset path must not be empty."}
    if raw_path.contains("\u0000"):
        return {"error": "Asset path must not contain null bytes."}

    var slash_path = raw_path.replace("\\", "/")
    var relative_path = slash_path
    if slash_path.begins_with("res://"):
        relative_path = slash_path.substr("res://".length())
    elif slash_path.contains("://"):
        return {"error": "Only res:// asset paths are allowed."}

    if relative_path.begins_with("/") or (relative_path.length() >= 2 and relative_path.substr(1, 1) == ":") or relative_path.contains(":"):
        return {"error": "Asset path must be relative to the Godot project."}

    var clean_parts = []
    for part in relative_path.split("/"):
        if part.is_empty():
            continue
        if part == "." or part == "..":
            return {"error": "Asset path must not escape the Godot project."}
        clean_parts.append(part)

    if clean_parts.is_empty():
        return {"error": "Asset path must contain a file path."}

    return {"path": "res://" + "/".join(clean_parts)}

func dry_run_class_is_or_inherits(node_type, base_type):
    if node_type == base_type:
        return true
    if not ClassDB.class_exists(node_type):
        return false
    return ClassDB.is_parent_class(node_type, base_type)

func dry_run_is_registered_custom_class(node_type):
    var global_classes = ProjectSettings.get_global_class_list()
    for global_class in global_classes:
        if global_class.has("class") and global_class["class"] == node_type:
            return true
    return false

func dry_run_validate_node_type(node_type, node_path, issues):
    if typeof(node_type) != TYPE_STRING or node_type.strip_edges().is_empty():
        dry_run_add_issue(issues, "error", "INVALID_NODE_TYPE", "Node type must be a non-empty Godot class name.", node_path, node_type, null, null, "Use a valid Godot node type such as Node2D, Sprite2D, Control, or Node3D.")
        return

    var clean_type = node_type.strip_edges()
    if clean_type.contains("/") or clean_type.contains("\\") or clean_type.contains("://") or clean_type.get_extension().to_lower() == "gd":
        dry_run_add_issue(issues, "error", "INVALID_NODE_TYPE", "Node type must be a Godot class name, not a script or filesystem path.", node_path, clean_type, null, null, "Use built-in node types for dry-run blueprints; attach scripts in a later explicit step.")
        return

    if not ClassDB.class_exists(clean_type):
        if dry_run_is_registered_custom_class(clean_type):
            dry_run_add_issue(issues, "error", "CUSTOM_NODE_TYPE_UNSUPPORTED", "Custom script classes are not supported by dry-run yet.", node_path, clean_type, null, null, "Use a built-in Godot node type in the blueprint and attach custom scripts later.")
        else:
            dry_run_add_issue(issues, "error", "INVALID_NODE_TYPE", "Node type does not exist or cannot be instantiated.", node_path, clean_type, null, null, "Use a valid Godot node type such as Node2D, Sprite2D, Control, or Node3D.")
        return

    if not ClassDB.can_instantiate(clean_type):
        dry_run_add_issue(issues, "error", "INVALID_NODE_TYPE", "Node type exists but cannot be instantiated.", node_path, clean_type, null, null, "Use a concrete Godot node type.")

func dry_run_expected_vector_size(node_type, property_name):
    if property_name == "size":
        return 2
    if dry_run_class_is_or_inherits(node_type, "Node3D"):
        return 3
    if dry_run_class_is_or_inherits(node_type, "Node2D") or dry_run_class_is_or_inherits(node_type, "Control"):
        return 2
    return 0

func dry_run_validate_properties_for_spec(spec, options, issues):
    var props = spec["properties"]
    if props == null:
        return {}

    if typeof(props) != TYPE_DICTIONARY:
        dry_run_add_issue(issues, "error", "INVALID_PROPERTY_VALUE", "properties must be an object.", spec["path"], spec["type"], "properties", null, "Use an object mapping safe property names to values.")
        return {}

    if not options["validateProperties"]:
        return props

    var node_type = spec["type"]
    var known_properties = [
        "position",
        "scale",
        "rotation",
        "rotation_degrees",
        "z_index",
        "visible",
        "size",
        "text",
        "disabled",
        "enabled",
        "centered",
        "flip_h",
        "flip_v",
        "offset",
        "zoom",
        "volume_db",
        "autoplay"
    ]

    for property_name in props.keys():
        var value = props[property_name]
        if not known_properties.has(property_name):
            dry_run_add_issue(issues, "warning", "UNKNOWN_PROPERTY", "Property is not in the dry-run safe property allowlist.", spec["path"], node_type, property_name, null, "Only common properties are validated; verify this property before applying a future write operation.")
            continue

        if property_name == "position" or property_name == "scale":
            var expected_size = dry_run_expected_vector_size(node_type, property_name)
            var valid_vector = false
            if expected_size == 0:
                valid_vector = dry_run_is_number_array(value, 2) or dry_run_is_number_array(value, 3)
            else:
                valid_vector = dry_run_is_number_array(value, expected_size)
            if not valid_vector:
                dry_run_add_issue(issues, "error", "INVALID_PROPERTY_VALUE", property_name + " must be a numeric array with the expected vector size.", spec["path"], node_type, property_name, null, "Use [x, y] for Node2D/Control or [x, y, z] for Node3D.")
        elif property_name == "offset" or property_name == "zoom":
            if not dry_run_is_number_array(value, 2):
                dry_run_add_issue(issues, "error", "INVALID_PROPERTY_VALUE", property_name + " must be a numeric [x, y] array.", spec["path"], node_type, property_name, null, "Use a numeric array with two values.")
        elif property_name == "size":
            if not dry_run_is_number_array(value, 2):
                dry_run_add_issue(issues, "error", "INVALID_PROPERTY_VALUE", "size must be a numeric [width, height] array.", spec["path"], node_type, property_name, null, "Use a numeric array with two values.")
        elif property_name == "rotation" or property_name == "rotation_degrees" or property_name == "z_index" or property_name == "volume_db":
            if not dry_run_is_number_value(value):
                dry_run_add_issue(issues, "error", "INVALID_PROPERTY_VALUE", property_name + " must be a number.", spec["path"], node_type, property_name, null, "Use a numeric value.")
        elif property_name == "visible" or property_name == "disabled" or property_name == "enabled" or property_name == "centered" or property_name == "flip_h" or property_name == "flip_v" or property_name == "autoplay":
            if typeof(value) != TYPE_BOOL:
                dry_run_add_issue(issues, "error", "INVALID_PROPERTY_VALUE", property_name + " must be a boolean.", spec["path"], node_type, property_name, null, "Use true or false.")
        elif property_name == "text":
            if typeof(value) != TYPE_STRING:
                dry_run_add_issue(issues, "error", "INVALID_PROPERTY_VALUE", "text must be a string.", spec["path"], node_type, property_name, null, "Use a string value.")

    return props

func dry_run_infer_asset_property(asset_type, extension):
    if asset_type == "texture":
        return "texture"
    if asset_type == "audio":
        return "stream"
    if asset_type == "scene":
        return "instance"
    if asset_type == "model":
        if extension == ".obj" or extension == ".fbx":
            return "mesh"
        return "instance"
    return null

func dry_run_asset_matches_node(asset_type, asset_property, node_type):
    if asset_type == "texture":
        return asset_property == "texture" and (dry_run_class_is_or_inherits(node_type, "Sprite2D") or dry_run_class_is_or_inherits(node_type, "TextureRect"))
    if asset_type == "audio":
        return asset_property == "stream" and (node_type == "AudioStreamPlayer" or node_type == "AudioStreamPlayer2D" or node_type == "AudioStreamPlayer3D")
    if asset_type == "scene":
        return asset_property == "instance"
    if asset_type == "model":
        if asset_property == "instance":
            return true
        return asset_property == "mesh" and dry_run_class_is_or_inherits(node_type, "MeshInstance3D")
    return true

func dry_run_validate_asset_for_spec(spec, options, issues):
    var asset_value = spec["asset"]
    if asset_value == null:
        return

    var normalized = dry_run_normalize_asset_path(asset_value)
    if normalized.has("error"):
        dry_run_add_issue(issues, "error", "UNSAFE_ASSET_PATH", normalized["error"], spec["path"], spec["type"], "asset", str(asset_value), "Use a res:// asset path that stays inside the Godot project.")
        return

    var asset_path = normalized["path"]
    spec["asset"] = asset_path
    var extension = "." + asset_path.get_extension().to_lower()
    var asset_type = get_asset_type_from_extension(extension)
    spec["assetType"] = asset_type

    if asset_type == "unknown":
        dry_run_add_issue(issues, "warning", "UNKNOWN_ASSET_TYPE", "Asset extension is not recognized by the dry-run asset catalog.", spec["path"], spec["type"], "asset", asset_path, "Use a supported Godot asset extension or verify this asset manually.")

    if options["validateAssets"]:
        if not ResourceLoader.exists(asset_path) and not FileAccess.file_exists(asset_path):
            dry_run_add_issue(issues, "error", "ASSET_NOT_FOUND", "Referenced asset does not exist.", spec["path"], spec["type"], "asset", asset_path, "Use an existing asset path from scan_assets.")

    var asset_property = spec["assetProperty"]
    if asset_property == null:
        asset_property = dry_run_infer_asset_property(asset_type, extension)
        spec["assetProperty"] = asset_property
        if asset_property != null:
            dry_run_add_issue(issues, "info", "INFERRED_ASSET_PROPERTY", "assetProperty was inferred from the asset type.", spec["path"], spec["type"], "assetProperty", asset_path, "Set assetProperty explicitly if a different assignment is intended.")
    elif typeof(asset_property) != TYPE_STRING or asset_property.strip_edges().is_empty():
        dry_run_add_issue(issues, "error", "INVALID_PROPERTY_VALUE", "assetProperty must be a non-empty string when provided.", spec["path"], spec["type"], "assetProperty", asset_path, "Use a property such as texture, stream, mesh, or instance.")
        return
    else:
        spec["assetProperty"] = asset_property.strip_edges()

    if asset_property != null and not dry_run_asset_matches_node(asset_type, asset_property, spec["type"]):
        dry_run_add_issue(issues, "warning", "POSSIBLE_ASSET_NODE_MISMATCH", "Asset type and target node type may not be compatible.", spec["path"], spec["type"], spec["assetProperty"], asset_path, "Use a matching node type or set assetProperty explicitly.")

func dry_run_detect_cycle(node_path, parent_by_path, visiting, visited):
    if visiting.has(node_path):
        return true
    if visited.has(node_path):
        return false

    visiting[node_path] = true
    if parent_by_path.has(node_path):
        var parent_path = parent_by_path[node_path]
        if parent_by_path.has(parent_path):
            if dry_run_detect_cycle(parent_path, parent_by_path, visiting, visited):
                return true

    visiting.erase(node_path)
    visited[node_path] = true
    return false

func dry_run_add_plan_actions(plan, root_spec, node_specs):
    plan.append({
        "action": "create_root",
        "path": root_spec["path"],
        "type": root_spec["type"],
        "name": root_spec["name"]
    })

    if root_spec["properties"].size() > 0:
        plan.append({
            "action": "set_properties",
            "path": root_spec["path"],
            "properties": root_spec["properties"]
        })

    for spec in node_specs:
        if spec["path"].is_empty() or spec["parentPath"].is_empty():
            continue

        plan.append({
            "action": "add_node",
            "path": spec["path"],
            "parentPath": spec["parentPath"],
            "type": spec["type"],
            "name": spec["name"]
        })

        if spec["asset"] != null:
            plan.append({
                "action": "assign_asset",
                "path": spec["path"],
                "asset": spec["asset"],
                "assetProperty": spec["assetProperty"]
            })

        if spec["properties"].size() > 0:
            plan.append({
                "action": "set_properties",
                "path": spec["path"],
                "properties": spec["properties"]
            })

func dry_run_finish_result(project_path, scene_path, root_spec, node_specs, issues, limits, include_plan, plan, target_exists):
    var error_count = 0
    var warning_count = 0
    var info_count = 0
    for issue in issues:
        if issue["severity"] == "error":
            error_count += 1
        elif issue["severity"] == "warning":
            warning_count += 1
        elif issue["severity"] == "info":
            info_count += 1

    var severity = "ok"
    if error_count > 0:
        severity = "error"
    elif warning_count > 0:
        severity = "warning"
    elif info_count > 0:
        severity = "info"

    var node_types = {}
    if root_spec["type"] != null:
        node_types[root_spec["type"]] = 1
    for spec in node_specs:
        var spec_type = spec["type"] if spec["type"] != null else "unknown"
        if not node_types.has(spec_type):
            node_types[spec_type] = 0
        node_types[spec_type] += 1

    var asset_reference_count = 0
    for spec in node_specs:
        if spec["asset"] != null:
            asset_reference_count += 1

    var result = {
        "success": true,
        "projectPath": project_path,
        "scenePath": scene_path,
        "wouldCreate": error_count == 0,
        "wouldOverwrite": target_exists,
        "valid": error_count == 0,
        "severity": severity,
        "summary": {
            "totalNodes": 1 + node_specs.size(),
            "rootType": root_spec["type"],
            "nodeTypes": node_types,
            "assetReferenceCount": asset_reference_count,
            "errorCount": error_count,
            "warningCount": warning_count,
            "infoCount": info_count
        },
        "issues": issues,
        "limits": limits
    }

    if include_plan:
        result["plan"] = plan

    result["_rootSpec"] = root_spec
    result["_nodeSpecs"] = node_specs

    return result

func dry_run_public_result(result):
    var output = result.duplicate(true)
    output.erase("_rootSpec")
    output.erase("_nodeSpecs")
    return output

func dry_run_scene_blueprint_result(params):
    if not params.has("scene_path"):
        return {"success": false, "error": "MISSING_SCENE_PATH", "message": "scene_path is required."}
    if not params.has("blueprint"):
        return {"success": false, "error": "MISSING_BLUEPRINT", "message": "blueprint is required."}
    if typeof(params.blueprint) != TYPE_DICTIONARY:
        return {"success": false, "error": "INVALID_BLUEPRINT", "message": "blueprint must be an object."}

    var scene_path = normalize_resource_scene_path(params.scene_path)
    var project_path = params.project_path if params.has("project_path") else ProjectSettings.globalize_path("res://")
    var blueprint = params.blueprint
    var max_nodes = params.max_nodes if params.has("max_nodes") else 250
    var allow_overwrite = params.allow_overwrite if params.has("allow_overwrite") else false
    var include_plan = params.include_plan if params.has("include_plan") else true
    var options = {
        "validateAssets": params.validate_assets if params.has("validate_assets") else true,
        "validateNodeTypes": params.validate_node_types if params.has("validate_node_types") else true,
        "validateProperties": params.validate_properties if params.has("validate_properties") else true,
        "validateHierarchy": params.validate_hierarchy if params.has("validate_hierarchy") else true
    }
    var limits = {
        "maxNodesRequested": params.max_nodes_requested if params.has("max_nodes_requested") else null,
        "maxNodesApplied": max_nodes,
        "maxNodesClamped": params.max_nodes_clamped if params.has("max_nodes_clamped") else false
    }

    var issues = []
    if not blueprint.has("root") or typeof(blueprint.root) != TYPE_DICTIONARY:
        return {"success": false, "error": "INVALID_ROOT", "message": "blueprint.root is required and must be an object."}

    var root = blueprint.root
    var root_type = dry_run_get_value(root, ["type"], null)
    if typeof(root_type) == TYPE_STRING:
        root_type = root_type.strip_edges()

    var root_name = dry_run_get_value(root, ["name"], null)
    if root_name == null:
        root_name = scene_path.get_file().get_basename()
    var root_name_error = dry_run_validate_node_name(root_name)
    if root_name_error != null:
        dry_run_add_issue(issues, "error", "INVALID_NODE_NAME", root_name_error, str(root_name), root_type, "name", null, "Use a simple node name without slashes or traversal.")
        root_name = str(root_name).strip_edges()

    var root_path = str(root_name)
    var root_spec = {
        "path": root_path,
        "parentPath": "",
        "type": root_type,
        "name": root_name,
        "properties": dry_run_get_value(root, ["properties"], null),
        "asset": null,
        "assetProperty": null
    }

    if typeof(root_type) != TYPE_STRING or root_type.is_empty():
        dry_run_add_issue(issues, "error", "INVALID_ROOT", "root.type is required and must be a string.", root_path, root_type, "type", null, "Use a valid Godot node type such as Node2D, Control, or Node3D.")
    elif options["validateNodeTypes"]:
        dry_run_validate_node_type(root_type, root_path, issues)

    if dry_run_has_unsupported_children(root):
        dry_run_add_issue(issues, "error", "NESTED_CHILDREN_UNSUPPORTED", "Nested children are not supported by dry_run_scene_blueprint yet; use the flat nodes array.", root_path, root_type, "children", null, "Move child definitions into blueprint.nodes with parentPath values.")

    var raw_nodes = []
    if blueprint.has("nodes"):
        if typeof(blueprint.nodes) == TYPE_ARRAY:
            raw_nodes = blueprint.nodes
        else:
            dry_run_add_issue(issues, "error", "INVALID_BLUEPRINT", "blueprint.nodes must be an array when provided.", root_path, root_type, "nodes", null, "Use an array of flat node definitions.")

    if 1 + raw_nodes.size() > max_nodes:
        dry_run_add_issue(issues, "error", "BLUEPRINT_TOO_LARGE", "Blueprint node count exceeds maxNodes.", root_path, root_type, null, null, "Reduce the blueprint size or raise maxNodes up to 2000.")

    var node_specs = []
    var path_set = {}
    path_set[root_path] = true
    var parent_by_path = {}

    for index in range(raw_nodes.size()):
        var node_data = raw_nodes[index]
        if typeof(node_data) != TYPE_DICTIONARY:
            dry_run_add_issue(issues, "error", "INVALID_BLUEPRINT", "Each blueprint node must be an object.", root_path, root_type, "nodes", null, "Use objects with type, name, and parentPath or path.")
            continue

        var node_type = dry_run_get_value(node_data, ["type"], null)
        if typeof(node_type) == TYPE_STRING:
            node_type = node_type.strip_edges()

        var node_name = dry_run_get_value(node_data, ["name"], null)
        var node_name_error = dry_run_validate_node_name(node_name)
        if node_name_error != null:
            dry_run_add_issue(issues, "error", "INVALID_NODE_NAME", node_name_error, null, node_type, "name", null, "Use a simple node name without slashes or traversal.")
            node_name = str(node_name).strip_edges()

        var node_path = dry_run_get_value(node_data, ["path"], null)
        var parent_path = dry_run_get_value(node_data, ["parentPath", "parent_path"], null)

        if node_path == null and parent_path != null and node_name_error == null:
            node_path = str(parent_path).strip_edges().replace("\\", "/") + "/" + str(node_name)

        if node_path != null:
            var normalized_path = dry_run_normalize_scene_node_path(node_path)
            if normalized_path.has("error"):
                dry_run_add_issue(issues, "error", "INVALID_NODE_PATH", normalized_path["error"], str(node_path), node_type, "path", null, "Use a relative scene path such as " + root_path + "/Child.")
                node_path = str(node_path)
            else:
                node_path = normalized_path["path"]
        else:
            dry_run_add_issue(issues, "error", "INVALID_NODE_PATH", "Node must provide path or parentPath plus name.", null, node_type, "path", null, "Provide parentPath and name, or a full scene-relative path.")
            node_path = ""

        if parent_path == null and not str(node_path).is_empty():
            parent_path = dry_run_parent_path_from_path(str(node_path))

        if parent_path != null:
            var normalized_parent_path = dry_run_normalize_scene_node_path(parent_path)
            if normalized_parent_path.has("error"):
                dry_run_add_issue(issues, "error", "INVALID_NODE_PATH", normalized_parent_path["error"], str(node_path), node_type, "parentPath", null, "Use a relative parent path such as " + root_path + ".")
                parent_path = str(parent_path)
            else:
                parent_path = normalized_parent_path["path"]
        else:
            dry_run_add_issue(issues, "error", "MISSING_PARENT", "Node parentPath could not be inferred.", str(node_path), node_type, "parentPath", null, "Provide parentPath or a path with a parent segment.")
            parent_path = ""

        if not str(node_path).begins_with(root_path + "/"):
            dry_run_add_issue(issues, "error", "INVALID_NODE_PATH", "Node path must start with the root node name.", str(node_path), node_type, "path", null, "Use paths under " + root_path + ".")

        if node_path == root_path:
            dry_run_add_issue(issues, "error", "DUPLICATE_NODE_PATH", "Node path duplicates the root path.", str(node_path), node_type, "path", null, "Use a unique child path below the root.")
        elif path_set.has(node_path):
            dry_run_add_issue(issues, "error", "DUPLICATE_NODE_PATH", "Duplicate node path in blueprint.", str(node_path), node_type, "path", null, "Use unique paths for every node.")
        else:
            path_set[node_path] = true

        if parent_path == node_path:
            dry_run_add_issue(issues, "error", "SELF_PARENT", "Node cannot be parented to itself.", str(node_path), node_type, "parentPath", null, "Set parentPath to an existing ancestor path.")

        if typeof(node_type) != TYPE_STRING or node_type.is_empty():
            dry_run_add_issue(issues, "error", "INVALID_NODE_TYPE", "Node type is required and must be a string.", str(node_path), node_type, "type", null, "Use a valid Godot node type such as Node2D, Sprite2D, Control, or Node3D.")
        elif options["validateNodeTypes"]:
            dry_run_validate_node_type(node_type, str(node_path), issues)

        if dry_run_has_unsupported_children(node_data):
            dry_run_add_issue(issues, "error", "NESTED_CHILDREN_UNSUPPORTED", "Nested children are not supported by dry_run_scene_blueprint yet; use the flat nodes array.", str(node_path), node_type, "children", null, "Move child definitions into blueprint.nodes with parentPath values.")

        var spec = {
            "path": str(node_path),
            "parentPath": str(parent_path),
            "type": node_type,
            "name": node_name,
            "asset": dry_run_get_value(node_data, ["asset"], null),
            "assetProperty": dry_run_get_value(node_data, ["assetProperty", "asset_property"], null),
            "assetType": null,
            "properties": dry_run_get_value(node_data, ["properties"], null)
        }

        if spec["asset"] != null:
            dry_run_validate_asset_for_spec(spec, options, issues)

        spec["properties"] = dry_run_validate_properties_for_spec(spec, options, issues)
        node_specs.append(spec)
        parent_by_path[spec["path"]] = spec["parentPath"]

    root_spec["properties"] = dry_run_validate_properties_for_spec(root_spec, options, issues)

    if options["validateHierarchy"]:
        for spec in node_specs:
            if not path_set.has(spec["parentPath"]):
                dry_run_add_issue(issues, "error", "MISSING_PARENT", "parentPath does not exist in the blueprint.", spec["path"], spec["type"], "parentPath", null, "Add the parent node or change parentPath to an existing path.")

        var visiting = {}
        var visited = {}
        for spec in node_specs:
            if dry_run_detect_cycle(spec["path"], parent_by_path, visiting, visited):
                dry_run_add_issue(issues, "error", "HIERARCHY_CYCLE", "Hierarchy contains a parent cycle.", spec["path"], spec["type"], "parentPath", null, "Make parent paths form a tree rooted at " + root_path + ".")
                break

    var target_exists = FileAccess.file_exists(scene_path)
    if target_exists and not allow_overwrite:
        dry_run_add_issue(issues, "error", "TARGET_SCENE_EXISTS", "Target scene already exists and allowOverwrite is false.", root_path, root_type, null, null, "Set allowOverwrite to true only when replacing the scene is intended.")
    elif target_exists and allow_overwrite:
        dry_run_add_issue(issues, "warning", "TARGET_SCENE_WOULD_BE_OVERWRITTEN", "Target scene already exists and would be overwritten by a future write tool.", root_path, root_type, null, null, "Review the existing scene before applying a write operation.")

    var plan = []
    if include_plan:
        dry_run_add_plan_actions(plan, root_spec, node_specs)

    var result = dry_run_finish_result(project_path, scene_path, root_spec, node_specs, issues, limits, include_plan, plan, target_exists)
    return result

func dry_run_scene_blueprint(params):
    var result = dry_run_scene_blueprint_result(params)
    print(JSON.stringify(dry_run_public_result(result)))

func create_scene_blueprint_error(error_code, message, issues=[]):
    return {
        "success": false,
        "error": error_code,
        "message": message,
        "issues": issues
    }

func create_scene_blueprint_has_error_issues(issues):
    for issue in issues:
        if issue.has("severity") and issue["severity"] == "error":
            return true
    return false

func create_scene_blueprint_error_code_from_issues(issues):
    for issue in issues:
        if issue.has("code") and issue["code"] == "TARGET_SCENE_EXISTS":
            return "TARGET_SCENE_EXISTS"
    for issue in issues:
        if issue.has("code") and issue["code"] == "BLUEPRINT_TOO_LARGE":
            return "BLUEPRINT_TOO_LARGE"
    return "DRY_RUN_VALIDATION_FAILED"

func create_scene_blueprint_issue_counts(issues):
    var counts = {
        "errorCount": 0,
        "warningCount": 0,
        "infoCount": 0
    }
    for issue in issues:
        if issue.has("severity") and issue["severity"] == "error":
            counts["errorCount"] += 1
        elif issue.has("severity") and issue["severity"] == "warning":
            counts["warningCount"] += 1
        elif issue.has("severity") and issue["severity"] == "info":
            counts["infoCount"] += 1
    return counts

func create_scene_blueprint_severity_from_counts(counts):
    if counts["errorCount"] > 0:
        return "error"
    if counts["warningCount"] > 0:
        return "warning"
    if counts["infoCount"] > 0:
        return "info"
    return "ok"

func create_scene_blueprint_sorted_specs(node_specs):
    var remaining = node_specs.duplicate(true)
    var sorted = []
    while remaining.size() > 0:
        var best_index = 0
        var best_depth = str(remaining[0]["path"]).count("/")
        for index in range(1, remaining.size()):
            var depth = str(remaining[index]["path"]).count("/")
            if depth < best_depth:
                best_depth = depth
                best_index = index
        sorted.append(remaining[best_index])
        remaining.remove_at(best_index)
    return sorted

func create_scene_blueprint_node_has_property(node, property_name):
    var property_list = node.get_property_list()
    for property_info in property_list:
        if property_info.has("name") and property_info["name"] == property_name:
            return true
    return false

func create_scene_blueprint_safe_properties():
    return [
        "position",
        "scale",
        "rotation",
        "rotation_degrees",
        "z_index",
        "visible",
        "size",
        "text",
        "disabled",
        "enabled",
        "centered",
        "flip_h",
        "flip_v",
        "offset",
        "zoom",
        "volume_db",
        "autoplay"
    ]

func create_scene_blueprint_convert_property_value(node, property_name, value):
    if property_name == "position" or property_name == "scale":
        if dry_run_class_is_or_inherits(node.get_class(), "Node3D") and dry_run_is_number_array(value, 3):
            return Vector3(value[0], value[1], value[2])
        if dry_run_is_number_array(value, 2):
            return Vector2(value[0], value[1])
        if dry_run_is_number_array(value, 3):
            return Vector3(value[0], value[1], value[2])
    elif property_name == "size" or property_name == "offset" or property_name == "zoom":
        if dry_run_is_number_array(value, 2):
            return Vector2(value[0], value[1])
    return value

func create_scene_blueprint_apply_properties(node, spec, issues):
    var properties = spec["properties"] if spec.has("properties") else {}
    if typeof(properties) != TYPE_DICTIONARY:
        return false

    var allowlist = create_scene_blueprint_safe_properties()
    for property_name in properties.keys():
        if not allowlist.has(property_name):
            dry_run_add_issue(
                issues,
                "warning",
                "UNKNOWN_PROPERTY_SKIPPED",
                "Unknown property was skipped during scene creation.",
                spec["path"],
                spec["type"],
                property_name,
                null,
                "Only the safe property allowlist is written by create_scene_from_blueprint."
            )
            continue

        if not create_scene_blueprint_node_has_property(node, property_name):
            dry_run_add_issue(
                issues,
                "warning",
                "UNKNOWN_PROPERTY_SKIPPED",
                "Property is not available on this node and was skipped.",
                spec["path"],
                spec["type"],
                property_name,
                null,
                "Use properties supported by the selected node type."
            )
            continue

        var converted_value = create_scene_blueprint_convert_property_value(node, property_name, properties[property_name])
        node.set(property_name, converted_value)

    return true

func create_scene_blueprint_load_texture(asset_path):
    var resource = ResourceLoader.load(asset_path)
    if resource != null:
        return resource

    var image = Image.new()
    if image.load(asset_path) != OK:
        return null
    return ImageTexture.create_from_image(image)

func create_scene_blueprint_set_owner_recursive(node, owner):
    if node != owner:
        node.owner = owner
    for child in node.get_children():
        create_scene_blueprint_set_owner_recursive(child, owner)

func create_scene_blueprint_create_node_from_spec(spec, issues):
    if spec["asset"] != null and spec["assetProperty"] == "instance" and (spec["assetType"] == "scene" or spec["assetType"] == "model"):
        var packed_resource = ResourceLoader.load(spec["asset"])
        if packed_resource != null and packed_resource is PackedScene:
            var instance = packed_resource.instantiate()
            if instance != null and instance is Node:
                instance.name = spec["name"]
                spec["_assetInstanced"] = true
                return instance
        if spec["assetType"] == "scene":
            dry_run_add_issue(
                issues,
                "error",
                "ASSIGN_ASSET_FAILED",
                "Scene asset could not be loaded and instantiated.",
                spec["path"],
                spec["type"],
                "asset",
                spec["asset"],
                "Use a loadable PackedScene asset or remove the scene asset reference."
            )
            return null

    if not ClassDB.class_exists(spec["type"]) or not ClassDB.can_instantiate(spec["type"]):
        dry_run_add_issue(
            issues,
            "error",
            "CREATE_NODE_FAILED",
            "Node type cannot be instantiated.",
            spec["path"],
            spec["type"],
            "type",
            null,
            "Use a concrete built-in Godot node type."
        )
        return null

    var node = ClassDB.instantiate(spec["type"])
    if node == null or not (node is Node):
        dry_run_add_issue(
            issues,
            "error",
            "CREATE_NODE_FAILED",
            "Failed to instantiate node.",
            spec["path"],
            spec["type"],
            "type",
            null,
            "Use a concrete Godot node class."
        )
        return null

    node.name = spec["name"]
    return node

func create_scene_blueprint_assign_asset(node, spec, issues):
    if spec["asset"] == null or spec.has("_assetInstanced"):
        return true

    var asset_path = spec["asset"]
    var asset_property = spec["assetProperty"]
    var asset_type = spec["assetType"]
    var resource = null

    if asset_type == "texture":
        resource = create_scene_blueprint_load_texture(asset_path)
        if resource == null:
            dry_run_add_issue(issues, "error", "ASSIGN_ASSET_FAILED", "Texture asset could not be loaded.", spec["path"], spec["type"], asset_property, asset_path, "Use a loadable texture asset.")
            return false

        if (node is Sprite2D or node is TextureRect) and asset_property == "texture":
            node.texture = resource
            return true

        dry_run_add_issue(issues, "error", "ASSIGN_ASSET_FAILED", "Texture asset can only be assigned to Sprite2D.texture or TextureRect.texture in this version.", spec["path"], spec["type"], asset_property, asset_path, "Use Sprite2D or TextureRect for texture assets.")
        return false

    resource = ResourceLoader.load(asset_path)
    if resource == null:
        dry_run_add_issue(issues, "error", "ASSIGN_ASSET_FAILED", "Asset could not be loaded for assignment.", spec["path"], spec["type"], asset_property, asset_path, "Use a loadable Godot resource.")
        return false

    if asset_type == "audio" and asset_property == "stream":
        if node is AudioStreamPlayer or node is AudioStreamPlayer2D or node is AudioStreamPlayer3D:
            node.stream = resource
            return true
        dry_run_add_issue(issues, "error", "ASSIGN_ASSET_FAILED", "Audio asset can only be assigned to AudioStreamPlayer stream properties.", spec["path"], spec["type"], asset_property, asset_path, "Use AudioStreamPlayer, AudioStreamPlayer2D, or AudioStreamPlayer3D.")
        return false

    if asset_type == "model":
        if asset_property == "mesh" and node is MeshInstance3D and resource is Mesh:
            node.mesh = resource
            return true
        if asset_property == "instance" and resource is PackedScene:
            dry_run_add_issue(issues, "warning", "ASSET_INSTANCE_SKIPPED", "Model PackedScene instance assignment was skipped because the node was already created.", spec["path"], spec["type"], asset_property, asset_path, "Use a blueprint node with assetProperty instance so the asset root can be instantiated directly.")
            return true

    if asset_type == "font":
        if node is Label and resource is Font:
            node.add_theme_font_override("font", resource)
            return true
        dry_run_add_issue(issues, "warning", "FONT_ASSIGNMENT_SKIPPED", "Font asset assignment was skipped because a safe target was not available.", spec["path"], spec["type"], asset_property, asset_path, "Use a Label node for font assets.")
        return true

    if asset_type == "script":
        dry_run_add_issue(issues, "warning", "SCRIPT_ASSET_SKIPPED", "Script assets are not attached by create_scene_from_blueprint.", spec["path"], spec["type"], asset_property, asset_path, "Attach scripts in a later explicit step.")
        return true

    if asset_type == "resource" and asset_property != null and create_scene_blueprint_node_has_property(node, asset_property):
        node.set(asset_property, resource)
        return true

    dry_run_add_issue(issues, "warning", "ASSET_ASSIGNMENT_SKIPPED", "Asset assignment is not supported for this asset/node/property combination.", spec["path"], spec["type"], asset_property, asset_path, "Use one of the supported safe asset assignment combinations.")
    return true

func create_scene_blueprint_ensure_target_directory(scene_path):
    var scene_dir_res = scene_path.get_base_dir()
    var scene_dir_abs = ProjectSettings.globalize_path(scene_dir_res)
    var project_abs = ProjectSettings.globalize_path("res://")
    if not scene_dir_abs.begins_with(project_abs):
        return {"success": false, "error": "UNSAFE_SCENE_PATH", "message": "Target scene directory escapes the project."}

    var created_directories = []
    if not DirAccess.dir_exists_absolute(scene_dir_abs):
        var make_error = DirAccess.make_dir_recursive_absolute(scene_dir_abs)
        if make_error != OK:
            return {"success": false, "error": "SAVE_SCENE_FAILED", "message": "Failed to create target scene directory.", "code": make_error}
        created_directories.append(scene_dir_res)

    return {"success": true, "createdDirectories": created_directories}

func create_scene_blueprint_count_nodes(node):
    var count = 1
    for child in node.get_children():
        count += create_scene_blueprint_count_nodes(child)
    return count

func create_scene_blueprint_post_validate(scene_path):
    var scene_resource = ResourceLoader.load(scene_path, "", ResourceLoader.CACHE_MODE_IGNORE)
    if scene_resource == null or not (scene_resource is PackedScene):
        return {
            "success": false,
            "error": "POST_VALIDATE_FAILED",
            "message": "Saved scene could not be loaded as a PackedScene.",
            "postValidation": {
                "loadable": false,
                "instantiable": false,
                "totalNodes": 0
            }
        }

    var scene_root = scene_resource.instantiate()
    if scene_root == null:
        return {
            "success": false,
            "error": "POST_VALIDATE_FAILED",
            "message": "Saved scene could not be instantiated.",
            "postValidation": {
                "loadable": true,
                "instantiable": false,
                "totalNodes": 0
            }
        }

    var total_nodes = create_scene_blueprint_count_nodes(scene_root)
    scene_root.free()
    return {
        "success": true,
        "postValidation": {
            "loadable": true,
            "instantiable": true,
            "totalNodes": total_nodes
        }
    }

func create_scene_from_blueprint(params):
    if not params.has("scene_path"):
        print(JSON.stringify(create_scene_blueprint_error("MISSING_SCENE_PATH", "scene_path is required.")))
        return
    if not params.has("blueprint"):
        print(JSON.stringify(create_scene_blueprint_error("MISSING_BLUEPRINT", "blueprint is required.")))
        return

    var scene_path = normalize_resource_scene_path(params.scene_path)
    var allow_overwrite = params.allow_overwrite if params.has("allow_overwrite") else false
    var include_plan = params.include_plan if params.has("include_plan") else true
    var validate_after_write = params.validate_after_write if params.has("validate_after_write") else true
    var project_path = params.project_path if params.has("project_path") else ProjectSettings.globalize_path("res://")

    var dry_run_params = params.duplicate(true)
    dry_run_params["scene_path"] = scene_path
    dry_run_params["allow_overwrite"] = allow_overwrite
    dry_run_params["include_plan"] = include_plan
    dry_run_params["validate_assets"] = true
    dry_run_params["validate_node_types"] = true
    dry_run_params["validate_properties"] = true
    dry_run_params["validate_hierarchy"] = true

    var dry_run_result = dry_run_scene_blueprint_result(dry_run_params)
    if not dry_run_result.has("success") or not dry_run_result["success"]:
        print(JSON.stringify(create_scene_blueprint_error(
            dry_run_result["error"] if dry_run_result.has("error") else "INVALID_BLUEPRINT",
            dry_run_result["message"] if dry_run_result.has("message") else "Blueprint validation failed."
        )))
        return

    var issues = dry_run_result["issues"].duplicate(true)
    if create_scene_blueprint_has_error_issues(issues):
        var validation_error_code = create_scene_blueprint_error_code_from_issues(issues)
        print(JSON.stringify(create_scene_blueprint_error(
            validation_error_code,
            "Blueprint dry-run validation failed; scene was not written.",
            issues
        )))
        return

    if FileAccess.file_exists(scene_path) and not allow_overwrite:
        dry_run_add_issue(issues, "error", "TARGET_SCENE_EXISTS", "Target scene already exists and allowOverwrite is false.", dry_run_result["_rootSpec"]["path"], dry_run_result["_rootSpec"]["type"], null, null, "Set allowOverwrite to true only when replacing the scene is intended.")
        print(JSON.stringify(create_scene_blueprint_error("TARGET_SCENE_EXISTS", "Target scene already exists; scene was not written.", issues)))
        return

    var target_existed_before = FileAccess.file_exists(scene_path)
    var root_spec = dry_run_result["_rootSpec"]
    var node_specs = create_scene_blueprint_sorted_specs(dry_run_result["_nodeSpecs"])
    var root_node = create_scene_blueprint_create_node_from_spec(root_spec, issues)
    if root_node == null:
        print(JSON.stringify(create_scene_blueprint_error("CREATE_ROOT_FAILED", "Failed to create scene root; scene was not written.", issues)))
        return

    create_scene_blueprint_apply_properties(root_node, root_spec, issues)

    var node_by_path = {}
    node_by_path[root_spec["path"]] = root_node

    for spec in node_specs:
        if not node_by_path.has(spec["parentPath"]):
            root_node.free()
            dry_run_add_issue(issues, "error", "MISSING_PARENT", "Parent node was not available during creation.", spec["path"], spec["type"], "parentPath", null, "Ensure parents appear in the blueprint hierarchy.")
            print(JSON.stringify(create_scene_blueprint_error("CREATE_NODE_FAILED", "Failed to create node hierarchy; scene was not written.", issues)))
            return

        var node = create_scene_blueprint_create_node_from_spec(spec, issues)
        if node == null:
            root_node.free()
            print(JSON.stringify(create_scene_blueprint_error("CREATE_NODE_FAILED", "Failed to create a blueprint node; scene was not written.", issues)))
            return

        var parent = node_by_path[spec["parentPath"]]
        parent.add_child(node)
        create_scene_blueprint_set_owner_recursive(node, root_node)

        if not create_scene_blueprint_apply_properties(node, spec, issues):
            root_node.free()
            print(JSON.stringify(create_scene_blueprint_error("SET_PROPERTY_FAILED", "Failed to set node properties; scene was not written.", issues)))
            return

        if not create_scene_blueprint_assign_asset(node, spec, issues):
            root_node.free()
            print(JSON.stringify(create_scene_blueprint_error("ASSIGN_ASSET_FAILED", "Failed to assign a blueprint asset; scene was not written.", issues)))
            return

        node_by_path[spec["path"]] = node

    if create_scene_blueprint_has_error_issues(issues):
        root_node.free()
        print(JSON.stringify(create_scene_blueprint_error("CREATE_SCENE_FROM_BLUEPRINT_FAILED", "Scene creation produced errors before saving; scene was not written.", issues)))
        return

    var directory_result = create_scene_blueprint_ensure_target_directory(scene_path)
    if not directory_result["success"]:
        root_node.free()
        print(JSON.stringify(create_scene_blueprint_error(directory_result["error"], directory_result["message"], issues)))
        return

    var packed_scene = PackedScene.new()
    var pack_result = packed_scene.pack(root_node)
    if pack_result != OK:
        root_node.free()
        print(JSON.stringify(create_scene_blueprint_error("PACK_SCENE_FAILED", "Failed to pack the generated scene; scene was not written.", issues)))
        return

    var save_error = ResourceSaver.save(packed_scene, scene_path)
    if save_error != OK:
        root_node.free()
        print(JSON.stringify(create_scene_blueprint_error("SAVE_SCENE_FAILED", "Failed to save the generated scene.", issues)))
        return

    var bytes_written = 0
    var file = FileAccess.open(scene_path, FileAccess.READ)
    if file != null:
        bytes_written = file.get_length()
        file.close()

    var post_validation = {
        "loadable": null,
        "instantiable": null,
        "totalNodes": null
    }
    if validate_after_write:
        var post_result = create_scene_blueprint_post_validate(scene_path)
        post_validation = post_result["postValidation"]
        if not post_result["success"]:
            root_node.free()
            var post_error = create_scene_blueprint_error("POST_VALIDATE_FAILED", post_result["message"], issues)
            post_error["postValidation"] = post_validation
            print(JSON.stringify(post_error))
            return

    root_node.free()

    var issue_counts = create_scene_blueprint_issue_counts(issues)
    var summary = dry_run_result["summary"].duplicate(true)
    summary["errorCount"] = issue_counts["errorCount"]
    summary["warningCount"] = issue_counts["warningCount"]
    summary["infoCount"] = issue_counts["infoCount"]

    var result = {
        "success": true,
        "projectPath": project_path,
        "scenePath": scene_path,
        "created": true,
        "overwritten": target_existed_before,
        "valid": issue_counts["errorCount"] == 0,
        "severity": create_scene_blueprint_severity_from_counts(issue_counts),
        "summary": summary,
        "issues": issues,
        "write": {
            "saved": true,
            "resourceSaverCode": save_error,
            "bytesWritten": bytes_written,
            "createdDirectories": directory_result["createdDirectories"]
        },
        "postValidation": post_validation,
        "limits": dry_run_result["limits"]
    }

    if include_plan and dry_run_result.has("plan"):
        result["plan"] = dry_run_result["plan"]

    print(JSON.stringify(result))

func get_asset_type_from_extension(extension):
    if [".png", ".jpg", ".jpeg", ".webp", ".svg", ".tga", ".bmp"].has(extension):
        return "texture"
    if [".tscn", ".scn"].has(extension):
        return "scene"
    if [".glb", ".gltf", ".obj", ".fbx"].has(extension):
        return "model"
    if [".wav", ".ogg", ".mp3"].has(extension):
        return "audio"
    if [".ttf", ".otf"].has(extension):
        return "font"
    if extension == ".gd":
        return "script"
    if [".json", ".cfg"].has(extension):
        return "data"
    if [".tres", ".res"].has(extension):
        return "resource"
    return "unknown"

func create_empty_asset_info_summary():
    return {
        "texture": 0,
        "scene": 0,
        "model": 0,
        "audio": 0,
        "font": 0,
        "script": 0,
        "data": 0,
        "resource": 0,
        "unknown": 0,
        "failed": 0
    }

func collect_asset_dependencies(asset_path):
    var dependencies = []
    var raw_dependencies = ResourceLoader.get_dependencies(asset_path)
    for dependency in raw_dependencies:
        var dependency_path = str(dependency)
        if dependency_path.begins_with("res://") and not dependencies.has(dependency_path):
            dependencies.append(dependency_path)
    return dependencies

func accumulate_scene_preview_node(node, preview):
    var node_type = node.get_class()
    preview["totalNodes"] += 1
    if not preview["nodeTypes"].has(node_type):
        preview["nodeTypes"][node_type] = 0
    preview["nodeTypes"][node_type] += 1

    for child in node.get_children():
        accumulate_scene_preview_node(child, preview)

func build_scene_preview_from_root(root):
    var preview = {
        "rootName": str(root.name),
        "rootType": root.get_class(),
        "childCount": root.get_child_count(),
        "totalNodes": 0,
        "nodeTypes": {}
    }
    accumulate_scene_preview_node(root, preview)
    return preview

func build_scene_preview_from_packed_scene(packed_scene):
    if packed_scene == null or not (packed_scene is PackedScene):
        return null

    var scene_root = packed_scene.instantiate()
    if scene_root == null:
        return null

    var preview = build_scene_preview_from_root(scene_root)
    scene_root.free()
    return preview

func build_mesh_metadata(mesh):
    var metadata = {
        "meshType": mesh.get_class(),
        "surfaceCount": mesh.get_surface_count()
    }

    var aabb = mesh.get_aabb()
    metadata["approximateAabb"] = {
        "position": vector3_to_array(aabb.position),
        "size": vector3_to_array(aabb.size)
    }
    return metadata

func build_texture_metadata(asset_path, resource):
    var metadata = {}
    var width = 0
    var height = 0

    if resource != null and resource is Texture2D:
        width = resource.get_width()
        height = resource.get_height()
    else:
        var image = Image.new()
        if image.load(asset_path) == OK:
            width = image.get_width()
            height = image.get_height()

    if width > 0 and height > 0:
        metadata["width"] = width
        metadata["height"] = height
        metadata["size"] = [width, height]
        metadata["aspectRatio"] = float(width) / float(height)

    return metadata

func build_audio_metadata(resource):
    var metadata = {}
    if resource != null and resource is AudioStream:
        metadata["resourceType"] = resource.get_class()
        if resource.has_method("get_length"):
            metadata["length"] = resource.get_length()
    return metadata

func build_placement_hints(asset_path, asset_type, resource):
    var lower_path = asset_path.to_lower()
    var suggested_node = "unknown"
    var default_anchor = "unknown"
    var suggested_pivot = "unknown"
    var notes = []

    if asset_type == "texture":
        suggested_node = "Sprite2D"
        default_anchor = "center"
        suggested_pivot = "center"
        notes.append("Use Sprite2D.texture for this asset.")
        if lower_path.contains("character") or lower_path.contains("player") or lower_path.contains("npc") or lower_path.contains("enemy"):
            default_anchor = "bottom_center"
            suggested_pivot = "bottom_center"
            notes.append("For character-like textures, consider bottom-center placement manually.")
        elif lower_path.contains("ui") or lower_path.contains("button") or lower_path.contains("panel") or lower_path.contains("icon") or lower_path.contains("hud") or lower_path.contains("menu"):
            notes.append("For UI textures, consider TextureRect if the asset is used in a Control layout.")
    elif asset_type == "scene":
        suggested_node = "PackedScene instance"
        default_anchor = "scene_root"
        suggested_pivot = "scene_root"
        notes.append("Instantiate this PackedScene as a scene child.")
    elif asset_type == "model":
        if resource != null and resource is PackedScene:
            suggested_node = "PackedScene instance"
            default_anchor = "scene_root"
            suggested_pivot = "scene_root"
            notes.append("Instantiate this model scene as a child in 3D space.")
        else:
            suggested_node = "MeshInstance3D"
            default_anchor = "origin"
            suggested_pivot = "origin"
            notes.append("Assign this mesh to MeshInstance3D.mesh.")
    elif asset_type == "audio":
        suggested_node = "AudioStreamPlayer"
        default_anchor = "none"
        suggested_pivot = "none"
        notes.append("Assign this stream to an AudioStreamPlayer node.")
    elif asset_type == "font":
        suggested_node = "Label"
        default_anchor = "baseline"
        suggested_pivot = "label"
        notes.append("Use this font with Label or other Control text theme settings.")
    elif asset_type == "script":
        suggested_node = "Node"
        default_anchor = "none"
        suggested_pivot = "none"
        notes.append("Attach this script to a compatible node type; do not instantiate script paths blindly.")

    return {
        "suggestedNode": suggested_node,
        "defaultAnchor": default_anchor,
        "suggestedPivot": suggested_pivot,
        "alignmentNotes": notes
    }

func build_asset_failure(asset_path, asset_type, error_code, message, exists):
    var file_name = asset_path.get_file()
    var extension = "." + asset_path.get_extension().to_lower()
    return {
        "success": false,
        "path": asset_path,
        "fileName": file_name,
        "name": file_name.get_basename(),
        "extension": extension,
        "exists": exists,
        "resourceLoadable": false,
        "assetType": asset_type,
        "error": error_code,
        "message": message
    }

func inspect_asset(asset_path, options):
    var file_name = asset_path.get_file()
    var extension = "." + asset_path.get_extension().to_lower()
    var asset_type = get_asset_type_from_extension(extension)

    if not FileAccess.file_exists(asset_path):
        return build_asset_failure(asset_path, asset_type, "ASSET_NOT_FOUND", "Asset file does not exist.", false)

    var resource_exists = ResourceLoader.exists(asset_path)
    var resource = ResourceLoader.load(asset_path)
    if resource == null:
        if asset_type == "texture":
            var fallback_metadata = build_texture_metadata(asset_path, null)
            if fallback_metadata.has("width") and fallback_metadata.has("height"):
                var fallback_placement_hints = null
                if options["includePlacementHints"]:
                    fallback_placement_hints = build_placement_hints(asset_path, asset_type, null)
                return {
                    "success": true,
                    "path": asset_path,
                    "fileName": file_name,
                    "name": file_name.get_basename(),
                    "extension": extension,
                    "exists": true,
                    "resourceLoadable": false,
                    "resourceType": "Image",
                    "assetType": asset_type,
                    "metadata": fallback_metadata,
                    "dependencies": [],
                    "scenePreview": null,
                    "placementHints": fallback_placement_hints
                }
        return build_asset_failure(asset_path, asset_type, "ASSET_LOAD_FAILED", "Asset could not be loaded by Godot ResourceLoader.", true)

    var metadata = {}
    if asset_type == "texture":
        metadata = build_texture_metadata(asset_path, resource)
    elif asset_type == "model" and resource is Mesh:
        metadata = build_mesh_metadata(resource)
    elif asset_type == "audio":
        metadata = build_audio_metadata(resource)
    elif resource != null:
        metadata["resourceType"] = resource.get_class()

    if resource != null and not metadata.has("resourceType"):
        metadata["resourceType"] = resource.get_class()

    var scene_preview = null
    if options["includeScenePreview"]:
        if asset_type == "scene" and resource is PackedScene:
            scene_preview = build_scene_preview_from_packed_scene(resource)
        elif asset_type == "model" and resource is PackedScene:
            scene_preview = build_scene_preview_from_packed_scene(resource)

    var dependencies = []
    if options["includeDependencies"]:
        dependencies = collect_asset_dependencies(asset_path)

    var placement_hints = null
    if options["includePlacementHints"]:
        placement_hints = build_placement_hints(asset_path, asset_type, resource)

    return {
        "success": true,
        "path": asset_path,
        "fileName": file_name,
        "name": file_name.get_basename(),
        "extension": extension,
        "exists": true,
        "resourceLoadable": resource != null,
        "resourceType": resource.get_class(),
        "assetType": asset_type,
        "metadata": metadata,
        "dependencies": dependencies,
        "scenePreview": scene_preview,
        "placementHints": placement_hints
    }

func get_asset_info(params):
    if not params.has("asset_paths"):
        print_json_error("MISSING_ASSET_PATH", "asset_paths is required.")
        return

    var asset_paths = params.asset_paths
    var options = {
        "includeDependencies": params.include_dependencies if params.has("include_dependencies") else true,
        "includeScenePreview": params.include_scene_preview if params.has("include_scene_preview") else true,
        "includePlacementHints": params.include_placement_hints if params.has("include_placement_hints") else true
    }

    var assets = []
    var summary = create_empty_asset_info_summary()
    for asset_path in asset_paths:
        var normalized_asset_path = normalize_resource_scene_path(asset_path)
        var item = inspect_asset(normalized_asset_path, options)
        assets.append(item)
        if item["success"]:
            summary[item["assetType"]] += 1
        else:
            summary["failed"] += 1

    var result = {
        "success": true,
        "projectPath": params.project_path if params.has("project_path") else ProjectSettings.globalize_path("res://"),
        "totalRequested": params.total_requested if params.has("total_requested") else asset_paths.size(),
        "totalReturned": assets.size(),
        "maxResultsRequested": params.max_results_requested if params.has("max_results_requested") else null,
        "maxResultsApplied": params.max_results_applied if params.has("max_results_applied") else assets.size(),
        "maxResultsClamped": params.max_results_clamped if params.has("max_results_clamped") else false,
        "assets": assets,
        "summary": summary
    }

    print(JSON.stringify(result))

# Create a new scene with a specified root node type
func create_scene(params):
    print("Creating scene: " + params.scene_path)
    
    # Get project paths and log them for debugging
    var project_res_path = "res://"
    var project_user_path = "user://"
    var global_res_path = ProjectSettings.globalize_path(project_res_path)
    var global_user_path = ProjectSettings.globalize_path(project_user_path)
    
    if debug_mode:
        print("Project paths:")
        print("- res:// path: " + project_res_path)
        print("- user:// path: " + project_user_path)
        print("- Globalized res:// path: " + global_res_path)
        print("- Globalized user:// path: " + global_user_path)
        
        # Print some common environment variables for debugging
        print("Environment variables:")
        var env_vars = ["PATH", "HOME", "USER", "TEMP", "GODOT_PATH"]
        for env_var in env_vars:
            if OS.has_environment(env_var):
                print("  " + env_var + " = " + OS.get_environment(env_var))
    
    # Normalize the scene path
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    if debug_mode:
        print("Scene path (with res://): " + full_scene_path)
    
    # Convert resource path to an absolute path
    var absolute_scene_path = ProjectSettings.globalize_path(full_scene_path)
    if debug_mode:
        print("Absolute scene path: " + absolute_scene_path)
    
    # Get the scene directory paths
    var scene_dir_res = full_scene_path.get_base_dir()
    var scene_dir_abs = absolute_scene_path.get_base_dir()
    if debug_mode:
        print("Scene directory (resource path): " + scene_dir_res)
        print("Scene directory (absolute path): " + scene_dir_abs)
    
    # Only do extensive testing in debug mode
    if debug_mode:
        # Try to create a simple test file in the project root to verify write access
        var initial_test_file_path = "res://godot_mcp_test_write.tmp"
        var initial_test_file = FileAccess.open(initial_test_file_path, FileAccess.WRITE)
        if initial_test_file:
            initial_test_file.store_string("Test write access")
            initial_test_file.close()
            print("Successfully wrote test file to project root: " + initial_test_file_path)
            
            # Verify the test file exists
            var initial_test_file_exists = FileAccess.file_exists(initial_test_file_path)
            print("Test file exists check: " + str(initial_test_file_exists))
            
            # Clean up the test file
            if initial_test_file_exists:
                var remove_error = DirAccess.remove_absolute(ProjectSettings.globalize_path(initial_test_file_path))
                print("Test file removal result: " + str(remove_error))
        else:
            var write_error = FileAccess.get_open_error()
            printerr("Failed to write test file to project root: " + str(write_error))
            printerr("This indicates a serious permission issue with the project directory")
    
    # Use traditional if-else statement for better compatibility
    var root_node_type = "Node2D"  # Default value
    if params.has("root_node_type"):
        root_node_type = params.root_node_type
    if debug_mode:
        print("Root node type: " + root_node_type)
    
    # Create the root node
    var scene_root = instantiate_class(root_node_type)
    if not scene_root:
        printerr("Failed to instantiate node of type: " + root_node_type)
        printerr("Make sure the class exists and can be instantiated")
        printerr("Check if the class is registered in ClassDB or available as a script")
        quit(1)
    
    scene_root.name = "root"
    if debug_mode:
        print("Root node created with name: " + scene_root.name)
    
    # Set the owner of the root node to itself (important for scene saving)
    scene_root.owner = scene_root
    
    # Pack the scene
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if debug_mode:
        print("Pack result: " + str(result) + " (OK=" + str(OK) + ")")
    
    if result == OK:
        # Only do extensive testing in debug mode
        if debug_mode:
            # First, let's verify we can write to the project directory
            print("Testing write access to project directory...")
            var test_write_path = "res://test_write_access.tmp"
            var test_write_abs = ProjectSettings.globalize_path(test_write_path)
            var test_file = FileAccess.open(test_write_path, FileAccess.WRITE)
            
            if test_file:
                test_file.store_string("Write test")
                test_file.close()
                print("Successfully wrote test file to project directory")
                
                # Clean up test file
                if FileAccess.file_exists(test_write_path):
                    var remove_error = DirAccess.remove_absolute(test_write_abs)
                    print("Test file removal result: " + str(remove_error))
            else:
                var write_error = FileAccess.get_open_error()
                printerr("Failed to write test file to project directory: " + str(write_error))
                printerr("This may indicate permission issues with the project directory")
                # Continue anyway, as the scene directory might still be writable
        
        # Ensure the scene directory exists using DirAccess
        if debug_mode:
            print("Ensuring scene directory exists...")
        
        # Get the scene directory relative to res://
        var scene_dir_relative = scene_dir_res.substr(6)  # Remove "res://" prefix
        if debug_mode:
            print("Scene directory (relative to res://): " + scene_dir_relative)
        
        # Create the directory if needed
        if not scene_dir_relative.is_empty():
            # First check if it exists
            var dir_exists = DirAccess.dir_exists_absolute(scene_dir_abs)
            if debug_mode:
                print("Directory exists check (absolute): " + str(dir_exists))
            
            if not dir_exists:
                if debug_mode:
                    print("Directory doesn't exist, creating: " + scene_dir_relative)
                
                # Try to create the directory using DirAccess
                var dir = DirAccess.open("res://")
                if dir == null:
                    var open_error = DirAccess.get_open_error()
                    printerr("Failed to open res:// directory: " + str(open_error))
                    
                    # Try alternative approach with absolute path
                    if debug_mode:
                        print("Trying alternative directory creation approach...")
                    var make_dir_error = DirAccess.make_dir_recursive_absolute(scene_dir_abs)
                    if debug_mode:
                        print("Make directory result (absolute): " + str(make_dir_error))
                    
                    if make_dir_error != OK:
                        printerr("Failed to create directory using absolute path")
                        printerr("Error code: " + str(make_dir_error))
                        quit(1)
                else:
                    # Create the directory using the DirAccess instance
                    if debug_mode:
                        print("Creating directory using DirAccess: " + scene_dir_relative)
                    var make_dir_error = dir.make_dir_recursive(scene_dir_relative)
                    if debug_mode:
                        print("Make directory result: " + str(make_dir_error))
                    
                    if make_dir_error != OK:
                        printerr("Failed to create directory: " + scene_dir_relative)
                        printerr("Error code: " + str(make_dir_error))
                        quit(1)
                
                # Verify the directory was created
                dir_exists = DirAccess.dir_exists_absolute(scene_dir_abs)
                if debug_mode:
                    print("Directory exists check after creation: " + str(dir_exists))
                
                if not dir_exists:
                    printerr("Directory reported as created but does not exist: " + scene_dir_abs)
                    printerr("This may indicate a problem with path resolution or permissions")
                    quit(1)
            elif debug_mode:
                print("Directory already exists: " + scene_dir_abs)
        
        # Save the scene
        if debug_mode:
            print("Saving scene to: " + full_scene_path)
        var save_error = ResourceSaver.save(packed_scene, full_scene_path)
        if debug_mode:
            print("Save result: " + str(save_error) + " (OK=" + str(OK) + ")")
        
        if save_error == OK:
            # Only do extensive testing in debug mode
            if debug_mode:
                # Wait a moment to ensure file system has time to complete the write
                print("Waiting for file system to complete write operation...")
                OS.delay_msec(500)  # 500ms delay
                
                # Verify the file was actually created using multiple methods
                var file_check_abs = FileAccess.file_exists(absolute_scene_path)
                print("File exists check (absolute path): " + str(file_check_abs))
                
                var file_check_res = FileAccess.file_exists(full_scene_path)
                print("File exists check (resource path): " + str(file_check_res))
                
                var res_exists = ResourceLoader.exists(full_scene_path)
                print("Resource exists check: " + str(res_exists))
                
                # If file doesn't exist by absolute path, try to create a test file in the same directory
                if not file_check_abs and not file_check_res:
                    printerr("Scene file not found after save. Trying to diagnose the issue...")
                    
                    # Try to write a test file to the same directory
                    var test_scene_file_path = scene_dir_res + "/test_scene_file.tmp"
                    var test_scene_file = FileAccess.open(test_scene_file_path, FileAccess.WRITE)
                    
                    if test_scene_file:
                        test_scene_file.store_string("Test scene directory write")
                        test_scene_file.close()
                        print("Successfully wrote test file to scene directory: " + test_scene_file_path)
                        
                        # Check if the test file exists
                        var test_file_exists = FileAccess.file_exists(test_scene_file_path)
                        print("Test file exists: " + str(test_file_exists))
                        
                        if test_file_exists:
                            # Directory is writable, so the issue is with scene saving
                            printerr("Directory is writable but scene file wasn't created.")
                            printerr("This suggests an issue with ResourceSaver.save() or the packed scene.")
                            
                            # Try saving with a different approach
                            print("Trying alternative save approach...")
                            var alt_save_error = ResourceSaver.save(packed_scene, test_scene_file_path + ".tscn")
                            print("Alternative save result: " + str(alt_save_error))
                            
                            # Clean up test files
                            DirAccess.remove_absolute(ProjectSettings.globalize_path(test_scene_file_path))
                            if alt_save_error == OK:
                                DirAccess.remove_absolute(ProjectSettings.globalize_path(test_scene_file_path + ".tscn"))
                        else:
                            printerr("Test file couldn't be verified. This suggests filesystem access issues.")
                    else:
                        var write_error = FileAccess.get_open_error()
                        printerr("Failed to write test file to scene directory: " + str(write_error))
                        printerr("This confirms there are permission or path issues with the scene directory.")
                    
                    # Return error since we couldn't create the scene file
                    printerr("Failed to create scene: " + params.scene_path)
                    quit(1)
                
                # If we get here, at least one of our file checks passed
                if file_check_abs or file_check_res or res_exists:
                    print("Scene file verified to exist!")
                    
                    # Try to load the scene to verify it's valid
                    var test_load = ResourceLoader.load(full_scene_path)
                    if test_load:
                        print("Scene created and verified successfully at: " + params.scene_path)
                        print("Scene file can be loaded correctly.")
                    else:
                        print("Scene file exists but cannot be loaded. It may be corrupted or incomplete.")
                        # Continue anyway since the file exists
                    
                    print("Scene created successfully at: " + params.scene_path)
                else:
                    printerr("All file existence checks failed despite successful save operation.")
                    printerr("This indicates a serious issue with file system access or path resolution.")
                    quit(1)
            else:
                # In non-debug mode, just check if the file exists
                var file_exists = FileAccess.file_exists(full_scene_path)
                if file_exists:
                    print("Scene created successfully at: " + params.scene_path)
                else:
                    printerr("Failed to create scene: " + params.scene_path)
                    quit(1)
        else:
            # Handle specific error codes
            var error_message = "Failed to save scene. Error code: " + str(save_error)
            
            if save_error == ERR_CANT_CREATE:
                error_message += " (ERR_CANT_CREATE - Cannot create the scene file)"
            elif save_error == ERR_CANT_OPEN:
                error_message += " (ERR_CANT_OPEN - Cannot open the scene file for writing)"
            elif save_error == ERR_FILE_CANT_WRITE:
                error_message += " (ERR_FILE_CANT_WRITE - Cannot write to the scene file)"
            elif save_error == ERR_FILE_NO_PERMISSION:
                error_message += " (ERR_FILE_NO_PERMISSION - No permission to write the scene file)"
            
            printerr(error_message)
            quit(1)
    else:
        printerr("Failed to pack scene: " + str(result))
        printerr("Error code: " + str(result))
        quit(1)

# Add a node to an existing scene
func add_node(params):
    print("Adding node to scene: " + params.scene_path)
    
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    if debug_mode:
        print("Scene path (with res://): " + full_scene_path)
    
    var absolute_scene_path = ProjectSettings.globalize_path(full_scene_path)
    if debug_mode:
        print("Absolute scene path: " + absolute_scene_path)
    
    if not FileAccess.file_exists(absolute_scene_path):
        printerr("Scene file does not exist at: " + absolute_scene_path)
        quit(1)
    
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    if debug_mode:
        print("Scene loaded successfully")
    var scene_root = scene.instantiate()
    if debug_mode:
        print("Scene instantiated")
    
    # Use traditional if-else statement for better compatibility
    var parent_path = "root"  # Default value
    if params.has("parent_node_path"):
        parent_path = params.parent_node_path
    if debug_mode:
        print("Parent path: " + parent_path)
    
    var parent = scene_root
    if parent_path != "root":
        parent = scene_root.get_node(parent_path.replace("root/", ""))
        if not parent:
            printerr("Parent node not found: " + parent_path)
            quit(1)
    if debug_mode:
        print("Parent node found: " + parent.name)
    
    if debug_mode:
        print("Instantiating node of type: " + params.node_type)
    var new_node = instantiate_class(params.node_type)
    if not new_node:
        printerr("Failed to instantiate node of type: " + params.node_type)
        printerr("Make sure the class exists and can be instantiated")
        printerr("Check if the class is registered in ClassDB or available as a script")
        quit(1)
    new_node.name = params.node_name
    if debug_mode:
        print("New node created with name: " + new_node.name)
    
    if params.has("properties"):
        if debug_mode:
            print("Setting properties on node")
        var properties = params.properties
        for property in properties:
            if debug_mode:
                print("Setting property: " + property + " = " + str(properties[property]))
            var value = properties[property]
            if typeof(value) == TYPE_STRING and value.begins_with("res://"):
                value = load(value)
                if debug_mode:
                    print("Loaded resource for property: " + property + " -> " + str(value))
            new_node.set(property, value)
    
    parent.add_child(new_node)
    new_node.owner = scene_root
    if debug_mode:
        print("Node added to parent and ownership set")
    
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if debug_mode:
        print("Pack result: " + str(result) + " (OK=" + str(OK) + ")")
    
    if result == OK:
        if debug_mode:
            print("Saving scene to: " + absolute_scene_path)
        var save_error = ResourceSaver.save(packed_scene, absolute_scene_path)
        if debug_mode:
            print("Save result: " + str(save_error) + " (OK=" + str(OK) + ")")
        if save_error == OK:
            if debug_mode:
                var file_check_after = FileAccess.file_exists(absolute_scene_path)
                print("File exists check after save: " + str(file_check_after))
                if file_check_after:
                    print("Node '" + params.node_name + "' of type '" + params.node_type + "' added successfully")
                else:
                    printerr("File reported as saved but does not exist at: " + absolute_scene_path)
            else:
                print("Node '" + params.node_name + "' of type '" + params.node_type + "' added successfully")
        else:
            printerr("Failed to save scene: " + str(save_error))
    else:
        printerr("Failed to pack scene: " + str(result))

# Load a sprite into a Sprite2D node
func load_sprite(params):
    print("Loading sprite into scene: " + params.scene_path)
    
    # Ensure the scene path starts with res:// for Godot's resource system
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    
    if debug_mode:
        print("Full scene path (with res://): " + full_scene_path)
    
    # Check if the scene file exists
    var file_check = FileAccess.file_exists(full_scene_path)
    if debug_mode:
        print("Scene file exists check: " + str(file_check))
    
    if not file_check:
        printerr("Scene file does not exist at: " + full_scene_path)
        # Get the absolute path for reference
        var absolute_path = ProjectSettings.globalize_path(full_scene_path)
        printerr("Absolute file path that doesn't exist: " + absolute_path)
        quit(1)
    
    # Ensure the texture path starts with res:// for Godot's resource system
    var full_texture_path = params.texture_path
    if not full_texture_path.begins_with("res://"):
        full_texture_path = "res://" + full_texture_path
    
    if debug_mode:
        print("Full texture path (with res://): " + full_texture_path)
    
    # Load the scene
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    if debug_mode:
        print("Scene loaded successfully")
    
    # Instance the scene
    var scene_root = scene.instantiate()
    if debug_mode:
        print("Scene instantiated")
    
    # Find the sprite node
    var node_path = params.node_path
    if debug_mode:
        print("Original node path: " + node_path)
    
    if node_path.begins_with("root/"):
        node_path = node_path.substr(5)  # Remove "root/" prefix
        if debug_mode:
            print("Node path after removing 'root/' prefix: " + node_path)
    
    var sprite_node = null
    if node_path == "":
        # If no node path, assume root is the sprite
        sprite_node = scene_root
        if debug_mode:
            print("Using root node as sprite node")
    else:
        sprite_node = scene_root.get_node(node_path)
        if sprite_node and debug_mode:
            print("Found sprite node: " + sprite_node.name)
    
    if not sprite_node:
        printerr("Node not found: " + params.node_path)
        quit(1)
    
    # Check if the node is a Sprite2D or compatible type
    if debug_mode:
        print("Node class: " + sprite_node.get_class())
    if not (sprite_node is Sprite2D or sprite_node is Sprite3D or sprite_node is TextureRect):
        printerr("Node is not a sprite-compatible type: " + sprite_node.get_class())
        quit(1)
    
    # Load the texture
    if debug_mode:
        print("Loading texture from: " + full_texture_path)
    var texture = load(full_texture_path)
    if not texture:
        printerr("Failed to load texture: " + full_texture_path)
        quit(1)
    
    if debug_mode:
        print("Texture loaded successfully")
    
    # Set the texture on the sprite
    if sprite_node is Sprite2D or sprite_node is Sprite3D:
        sprite_node.texture = texture
        if debug_mode:
            print("Set texture on Sprite2D/Sprite3D node")
    elif sprite_node is TextureRect:
        sprite_node.texture = texture
        if debug_mode:
            print("Set texture on TextureRect node")
    
    # Save the modified scene
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if debug_mode:
        print("Pack result: " + str(result) + " (OK=" + str(OK) + ")")
    
    if result == OK:
        if debug_mode:
            print("Saving scene to: " + full_scene_path)
        var error = ResourceSaver.save(packed_scene, full_scene_path)
        if debug_mode:
            print("Save result: " + str(error) + " (OK=" + str(OK) + ")")
        
        if error == OK:
            # Verify the file was actually updated
            if debug_mode:
                var file_check_after = FileAccess.file_exists(full_scene_path)
                print("File exists check after save: " + str(file_check_after))
                
                if file_check_after:
                    print("Sprite loaded successfully with texture: " + full_texture_path)
                    # Get the absolute path for reference
                    var absolute_path = ProjectSettings.globalize_path(full_scene_path)
                    print("Absolute file path: " + absolute_path)
                else:
                    printerr("File reported as saved but does not exist at: " + full_scene_path)
            else:
                print("Sprite loaded successfully with texture: " + full_texture_path)
        else:
            printerr("Failed to save scene: " + str(error))
    else:
        printerr("Failed to pack scene: " + str(result))

# Export a scene as a MeshLibrary resource
func export_mesh_library(params):
    print("Exporting MeshLibrary from scene: " + params.scene_path)
    
    # Ensure the scene path starts with res:// for Godot's resource system
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    
    if debug_mode:
        print("Full scene path (with res://): " + full_scene_path)
    
    # Ensure the output path starts with res:// for Godot's resource system
    var full_output_path = params.output_path
    if not full_output_path.begins_with("res://"):
        full_output_path = "res://" + full_output_path
    
    if debug_mode:
        print("Full output path (with res://): " + full_output_path)
    
    # Check if the scene file exists
    var file_check = FileAccess.file_exists(full_scene_path)
    if debug_mode:
        print("Scene file exists check: " + str(file_check))
    
    if not file_check:
        printerr("Scene file does not exist at: " + full_scene_path)
        # Get the absolute path for reference
        var absolute_path = ProjectSettings.globalize_path(full_scene_path)
        printerr("Absolute file path that doesn't exist: " + absolute_path)
        quit(1)
    
    # Load the scene
    if debug_mode:
        print("Loading scene from: " + full_scene_path)
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    if debug_mode:
        print("Scene loaded successfully")
    
    # Instance the scene
    var scene_root = scene.instantiate()
    if debug_mode:
        print("Scene instantiated")
    
    # Create a new MeshLibrary
    var mesh_library = MeshLibrary.new()
    if debug_mode:
        print("Created new MeshLibrary")
    
    # Get mesh item names if provided
    var mesh_item_names = params.mesh_item_names if params.has("mesh_item_names") else []
    var use_specific_items = mesh_item_names.size() > 0
    
    if debug_mode:
        if use_specific_items:
            print("Using specific mesh items: " + str(mesh_item_names))
        else:
            print("Using all mesh items in the scene")
    
    # Process all child nodes
    var item_id = 0
    if debug_mode:
        print("Processing child nodes...")
    
    for child in scene_root.get_children():
        if debug_mode:
            print("Checking child node: " + child.name)
        
        # Skip if not using all items and this item is not in the list
        if use_specific_items and not (child.name in mesh_item_names):
            if debug_mode:
                print("Skipping node " + child.name + " (not in specified items list)")
            continue
            
        # Check if the child has a mesh
        var mesh_instance = null
        if child is MeshInstance3D:
            mesh_instance = child
            if debug_mode:
                print("Node " + child.name + " is a MeshInstance3D")
        else:
            # Try to find a MeshInstance3D in the child's descendants
            if debug_mode:
                print("Searching for MeshInstance3D in descendants of " + child.name)
            for descendant in child.get_children():
                if descendant is MeshInstance3D:
                    mesh_instance = descendant
                    if debug_mode:
                        print("Found MeshInstance3D in descendant: " + descendant.name)
                    break
        
        if mesh_instance and mesh_instance.mesh:
            if debug_mode:
                print("Adding mesh: " + child.name)
            
            # Add the mesh to the library
            mesh_library.create_item(item_id)
            mesh_library.set_item_name(item_id, child.name)
            mesh_library.set_item_mesh(item_id, mesh_instance.mesh)
            if debug_mode:
                print("Added mesh to library with ID: " + str(item_id))
            
            # Add collision shape if available
            var collision_added = false
            for collision_child in child.get_children():
                if collision_child is CollisionShape3D and collision_child.shape:
                    mesh_library.set_item_shapes(item_id, [collision_child.shape])
                    if debug_mode:
                        print("Added collision shape from: " + collision_child.name)
                    collision_added = true
                    break
            
            if debug_mode and not collision_added:
                print("No collision shape found for mesh: " + child.name)
            
            # Add preview if available
            if mesh_instance.mesh:
                mesh_library.set_item_preview(item_id, mesh_instance.mesh)
                if debug_mode:
                    print("Added preview for mesh: " + child.name)
            
            item_id += 1
        elif debug_mode:
            print("Node " + child.name + " has no valid mesh")
    
    if debug_mode:
        print("Processed " + str(item_id) + " meshes")
    
    # Create directory if it doesn't exist
    var dir = DirAccess.open("res://")
    if dir == null:
        printerr("Failed to open res:// directory")
        printerr("DirAccess error: " + str(DirAccess.get_open_error()))
        quit(1)
        
    var output_dir = full_output_path.get_base_dir()
    if debug_mode:
        print("Output directory: " + output_dir)
    
    if output_dir != "res://" and not dir.dir_exists(output_dir.substr(6)):  # Remove "res://" prefix
        if debug_mode:
            print("Creating directory: " + output_dir)
        var error = dir.make_dir_recursive(output_dir.substr(6))  # Remove "res://" prefix
        if error != OK:
            printerr("Failed to create directory: " + output_dir + ", error: " + str(error))
            quit(1)
    
    # Save the mesh library
    if item_id > 0:
        if debug_mode:
            print("Saving MeshLibrary to: " + full_output_path)
        var error = ResourceSaver.save(mesh_library, full_output_path)
        if debug_mode:
            print("Save result: " + str(error) + " (OK=" + str(OK) + ")")
        
        if error == OK:
            # Verify the file was actually created
            if debug_mode:
                var file_check_after = FileAccess.file_exists(full_output_path)
                print("File exists check after save: " + str(file_check_after))
                
                if file_check_after:
                    print("MeshLibrary exported successfully with " + str(item_id) + " items to: " + full_output_path)
                    # Get the absolute path for reference
                    var absolute_path = ProjectSettings.globalize_path(full_output_path)
                    print("Absolute file path: " + absolute_path)
                else:
                    printerr("File reported as saved but does not exist at: " + full_output_path)
            else:
                print("MeshLibrary exported successfully with " + str(item_id) + " items to: " + full_output_path)
        else:
            printerr("Failed to save MeshLibrary: " + str(error))
    else:
        printerr("No valid meshes found in the scene")

# Find files with a specific extension recursively
func find_files(path, extension):
    var files = []
    var dir = DirAccess.open(path)
    
    if dir:
        dir.list_dir_begin()
        var file_name = dir.get_next()
        
        while file_name != "":
            if dir.current_is_dir() and not file_name.begins_with("."):
                files.append_array(find_files(path + file_name + "/", extension))
            elif file_name.ends_with(extension):
                files.append(path + file_name)
            
            file_name = dir.get_next()
    
    return files

# Get UID for a specific file
func get_uid(params):
    if not params.has("file_path"):
        printerr("File path is required")
        quit(1)
    
    # Ensure the file path starts with res:// for Godot's resource system
    var file_path = params.file_path
    if not file_path.begins_with("res://"):
        file_path = "res://" + file_path
    
    print("Getting UID for file: " + file_path)
    if debug_mode:
        print("Full file path (with res://): " + file_path)
    
    # Get the absolute path for reference
    var absolute_path = ProjectSettings.globalize_path(file_path)
    if debug_mode:
        print("Absolute file path: " + absolute_path)
    
    # Ensure the file exists
    var file_check = FileAccess.file_exists(file_path)
    if debug_mode:
        print("File exists check: " + str(file_check))
    
    if not file_check:
        printerr("File does not exist at: " + file_path)
        printerr("Absolute file path that doesn't exist: " + absolute_path)
        quit(1)
    
    # Check if the UID file exists
    var uid_path = file_path + ".uid"
    if debug_mode:
        print("UID file path: " + uid_path)
    
    var uid_check = FileAccess.file_exists(uid_path)
    if debug_mode:
        print("UID file exists check: " + str(uid_check))
    
    var f = FileAccess.open(uid_path, FileAccess.READ)
    
    if f:
        # Read the UID content
        var uid_content = f.get_as_text()
        f.close()
        if debug_mode:
            print("UID content read successfully")
        
        # Return the UID content
        var result = {
            "file": file_path,
            "absolutePath": absolute_path,
            "uid": uid_content.strip_edges(),
            "exists": true
        }
        if debug_mode:
            print("UID result: " + JSON.stringify(result))
        print(JSON.stringify(result))
    else:
        if debug_mode:
            print("UID file does not exist or could not be opened")
        
        # UID file doesn't exist
        var result = {
            "file": file_path,
            "absolutePath": absolute_path,
            "exists": false,
            "message": "UID file does not exist for this file. Use resave_resources to generate UIDs."
        }
        if debug_mode:
            print("UID result: " + JSON.stringify(result))
        print(JSON.stringify(result))

# Resave all resources to update UID references
func resave_resources(params):
    print("Resaving all resources to update UID references...")
    
    # Get project path if provided
    var project_path = "res://"
    if params.has("project_path"):
        project_path = params.project_path
        if not project_path.begins_with("res://"):
            project_path = "res://" + project_path
        if not project_path.ends_with("/"):
            project_path += "/"
    
    if debug_mode:
        print("Using project path: " + project_path)
    
    # Get all .tscn files
    if debug_mode:
        print("Searching for scene files in: " + project_path)
    var scenes = find_files(project_path, ".tscn")
    if debug_mode:
        print("Found " + str(scenes.size()) + " scenes")
    
    # Resave each scene
    var success_count = 0
    var error_count = 0
    
    for scene_path in scenes:
        if debug_mode:
            print("Processing scene: " + scene_path)
        
        # Check if the scene file exists
        var file_check = FileAccess.file_exists(scene_path)
        if debug_mode:
            print("Scene file exists check: " + str(file_check))
        
        if not file_check:
            printerr("Scene file does not exist at: " + scene_path)
            error_count += 1
            continue
        
        # Load the scene
        var scene = load(scene_path)
        if scene:
            if debug_mode:
                print("Scene loaded successfully, saving...")
            var error = ResourceSaver.save(scene, scene_path)
            if debug_mode:
                print("Save result: " + str(error) + " (OK=" + str(OK) + ")")
            
            if error == OK:
                success_count += 1
                if debug_mode:
                    print("Scene saved successfully: " + scene_path)
                
                    # Verify the file was actually updated
                    var file_check_after = FileAccess.file_exists(scene_path)
                    print("File exists check after save: " + str(file_check_after))
                
                    if not file_check_after:
                        printerr("File reported as saved but does not exist at: " + scene_path)
            else:
                error_count += 1
                printerr("Failed to save: " + scene_path + ", error: " + str(error))
        else:
            error_count += 1
            printerr("Failed to load: " + scene_path)
    
    # Get all .gd and .shader files
    if debug_mode:
        print("Searching for script and shader files in: " + project_path)
    var scripts = find_files(project_path, ".gd") + find_files(project_path, ".shader") + find_files(project_path, ".gdshader")
    if debug_mode:
        print("Found " + str(scripts.size()) + " scripts/shaders")
    
    # Check for missing .uid files
    var missing_uids = 0
    var generated_uids = 0
    
    for script_path in scripts:
        if debug_mode:
            print("Checking UID for: " + script_path)
        var uid_path = script_path + ".uid"
        
        var uid_check = FileAccess.file_exists(uid_path)
        if debug_mode:
            print("UID file exists check: " + str(uid_check))
        
        var f = FileAccess.open(uid_path, FileAccess.READ)
        if not f:
            missing_uids += 1
            if debug_mode:
                print("Missing UID file for: " + script_path + ", generating...")
            
            # Force a save to generate UID
            var res = load(script_path)
            if res:
                var error = ResourceSaver.save(res, script_path)
                if debug_mode:
                    print("Save result: " + str(error) + " (OK=" + str(OK) + ")")
                
                if error == OK:
                    generated_uids += 1
                    if debug_mode:
                        print("Generated UID for: " + script_path)
                    
                        # Verify the UID file was actually created
                        var uid_check_after = FileAccess.file_exists(uid_path)
                        print("UID file exists check after save: " + str(uid_check_after))
                    
                        if not uid_check_after:
                            printerr("UID file reported as generated but does not exist at: " + uid_path)
                else:
                    printerr("Failed to generate UID for: " + script_path + ", error: " + str(error))
            else:
                printerr("Failed to load resource: " + script_path)
        elif debug_mode:
            print("UID file already exists for: " + script_path)
    
    if debug_mode:
        print("Summary:")
        print("- Scenes processed: " + str(scenes.size()))
        print("- Scenes successfully saved: " + str(success_count))
        print("- Scenes with errors: " + str(error_count))
        print("- Scripts/shaders missing UIDs: " + str(missing_uids))
        print("- UIDs successfully generated: " + str(generated_uids))
    print("Resave operation complete")

# Save changes to a scene file
func save_scene(params):
    print("Saving scene: " + params.scene_path)
    
    # Ensure the scene path starts with res:// for Godot's resource system
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    
    if debug_mode:
        print("Full scene path (with res://): " + full_scene_path)
    
    # Check if the scene file exists
    var file_check = FileAccess.file_exists(full_scene_path)
    if debug_mode:
        print("Scene file exists check: " + str(file_check))
    
    if not file_check:
        printerr("Scene file does not exist at: " + full_scene_path)
        # Get the absolute path for reference
        var absolute_path = ProjectSettings.globalize_path(full_scene_path)
        printerr("Absolute file path that doesn't exist: " + absolute_path)
        quit(1)
    
    # Load the scene
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    if debug_mode:
        print("Scene loaded successfully")
    
    # Instance the scene
    var scene_root = scene.instantiate()
    if debug_mode:
        print("Scene instantiated")
    
    # Determine save path
    var save_path = params.new_path if params.has("new_path") else full_scene_path
    if params.has("new_path") and not save_path.begins_with("res://"):
        save_path = "res://" + save_path
    
    if debug_mode:
        print("Save path: " + save_path)
    
    # Create directory if it doesn't exist
    if params.has("new_path"):
        var dir = DirAccess.open("res://")
        if dir == null:
            printerr("Failed to open res:// directory")
            printerr("DirAccess error: " + str(DirAccess.get_open_error()))
            quit(1)
            
        var scene_dir = save_path.get_base_dir()
        if debug_mode:
            print("Scene directory: " + scene_dir)
        
        if scene_dir != "res://" and not dir.dir_exists(scene_dir.substr(6)):  # Remove "res://" prefix
            if debug_mode:
                print("Creating directory: " + scene_dir)
            var error = dir.make_dir_recursive(scene_dir.substr(6))  # Remove "res://" prefix
            if error != OK:
                printerr("Failed to create directory: " + scene_dir + ", error: " + str(error))
                quit(1)
    
    # Create a packed scene
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if debug_mode:
        print("Pack result: " + str(result) + " (OK=" + str(OK) + ")")
    
    if result == OK:
        if debug_mode:
            print("Saving scene to: " + save_path)
        var error = ResourceSaver.save(packed_scene, save_path)
        if debug_mode:
            print("Save result: " + str(error) + " (OK=" + str(OK) + ")")
        
        if error == OK:
            # Verify the file was actually created/updated
            if debug_mode:
                var file_check_after = FileAccess.file_exists(save_path)
                print("File exists check after save: " + str(file_check_after))
                
                if file_check_after:
                    print("Scene saved successfully to: " + save_path)
                    # Get the absolute path for reference
                    var absolute_path = ProjectSettings.globalize_path(save_path)
                    print("Absolute file path: " + absolute_path)
                else:
                    printerr("File reported as saved but does not exist at: " + save_path)
            else:
                print("Scene saved successfully to: " + save_path)
        else:
            printerr("Failed to save scene: " + str(error))
    else:
        printerr("Failed to pack scene: " + str(result))
