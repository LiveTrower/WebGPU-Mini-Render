struct Uniforms {
    skyMatrix : mat4x4f,
};

@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var skyTexture: texture_cube<f32>;
@group(0) @binding(2) var skySampler: sampler;

struct VSOutput {
    @builtin(position) Position : vec4f,
    @location(0) fragUV : vec2f,
    @location(1) fragPosition : vec4f
};

@vertex
fn vs_main(@location(0) position: vec4f, @location(1) uv: vec2f) -> VSOutput {
    var output : VSOutput;
    output.Position = uniforms.skyMatrix * position;
    output.fragUV = uv;
    output.fragPosition = 0.5 * (position + vec4(1.0, 1.0, 1.0, 1.0));
    return output;
}

@fragment
fn fs_main(vsOut: VSOutput) -> @location(0) vec4<f32> {
    // Our camera and the skybox cube are both centered at (0, 0, 0)
    // so we can use the cube geometry position to get viewing vector to sample
    // the cube texture. The magnitude of the vector doesn't matter.
    var cubemapVec = vsOut.fragPosition.xyz - vec3(0.5);
    return textureSampleLevel(skyTexture, skySampler, cubemapVec, 0.0);
}