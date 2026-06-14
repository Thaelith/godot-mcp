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
    var quiet_output = operation == "read_scene_tree" or operation == "validate_scene" or operation == "get_asset_info" or operation == "dry_run_scene_blueprint" or operation == "create_scene_from_blueprint"

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
