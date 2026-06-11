struct SkyUniforms {
   forwards: vec3f,
   right: vec3f,
   up: vec3f,
   fog_color: vec3f,
   fog_sky_effect: f32,
   fog_enabled: u32
}

@group(0) @binding(0) var<uniform> sky: SkyUniforms;
@group(0) @binding(1) var skyTexture: texture_cube<f32>;
@group(0) @binding(2) var skySampler: sampler;

struct VertexOutput {
    @builtin(position) Position : vec4f,
    @location(0) direction : vec3f,
}

const positions = array<vec2<f32>, 6>(
    vec2f( 1.0,  1.0),
    vec2f( 1.0, -1.0),
    vec2f(-1.0, -1.0),
    vec2f( 1.0,  1.0),
    vec2f(-1.0, -1.0),
    vec2f(-1.0,  1.0)
);

@vertex
fn vs_main(@builtin(vertex_index) VertexIndex : u32) -> VertexOutput {
    var output : VertexOutput;

    output.Position = vec4<f32>(positions[VertexIndex], 0.0, 1.0);
    var x: f32 = positions[VertexIndex].x;
    var y: f32 = positions[VertexIndex].y;

    output.direction = normalize(sky.forwards + x * sky.right + y * sky.up);
    return output;
}

fn apply_fog(color: vec3f) -> vec3f {
    return mix(color, sky.fog_color, sky.fog_sky_effect);
}

@fragment
fn fs_main(@location(0) direction : vec3f) -> @location(0) vec4f {
    var sky_color = textureSample(skyTexture, skySampler, direction).rgb;
    if (sky.fog_enabled == 1u) { sky_color = apply_fog(sky_color); }
    return vec4(sky_color, 1.0);
}