struct ShadowMap {
    lightViewProjMatrix : mat4x4f
};

struct ObjectData {
    model: array<mat4x4f>,
};

@binding(0) @group(0) var<uniform> shadow: ShadowMap;
@binding(1) @group(0) var<storage, read> objects: ObjectData;

@vertex
fn vs_main(@location(0) position: vec3f, @builtin(instance_index) ID: u32) -> @builtin(position) vec4f {
    return shadow.lightViewProjMatrix * objects.model[ID] * vec4(position, 1.0);
}