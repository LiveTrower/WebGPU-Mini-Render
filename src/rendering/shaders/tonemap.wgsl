// Based on Godot Tonemapper https://github.com/godotengine/godot/blob/master/servers/rendering/renderer_rd/shaders/effects/tonemap.glsl

@binding(0) @group(0) var colorTexture: texture_2d<f32>;
@binding(1) @group(0) var colorSampler: sampler;

struct VSOutput {
    @builtin(position) Position: vec4f,
    @location(0) TexCoord: vec2f
};

@vertex
fn vs_main(@builtin(vertex_index) VertexIndex: u32) -> VSOutput {

	var vertex_base = vec2f(0.0);
	if (VertexIndex == 0) {
		vertex_base = vec2(-1.0, -1.0);
	} else if (VertexIndex == 1) {
		vertex_base = vec2(-1.0, 3.0);
	} else {
		vertex_base = vec2(3.0, -1.0);
	}

    var output : VSOutput;

    output.Position = vec4(vertex_base, 0.0, 1.0);
    output.TexCoord = saturate(vec2(vertex_base * vec2(1.0, -1.0))) * 2.0;

    return output;
}

fn linear_to_srgb(color: vec3f) -> vec3f {
	let a = vec3(0.055f);
    var b = vec3(0.0);
    if (color.r < 0.0031308f) {
        b.x = 1.0;
    }
    if (color.g < 0.0031308f) {
        b.y = 1.0;
    }
    if (color.b < 0.0031308f) {
        b.z = 1.0;
    }
	return mix((vec3(1.0f) + a) * pow(color.rgb, vec3(1.0f / 2.4f)) - a, 12.92f * color.rgb, b);
}

// From https://alex.vlachos.com/graphics/Alex_Vlachos_Advanced_VR_Rendering_GDC2015.pdf
// and https://www.shadertoy.com/view/MslGR8 (5th one starting from the bottom)
// NOTE: `frag_coord` is in pixels (i.e. not normalized UV).
// This dithering must be applied after encoding changes (linear/nonlinear) have been applied
// as the final step before quantization from floating point to integer values.
fn screen_space_dither(frag_coord : vec2f, bit_alignment_diviser : f32) -> vec3f {
	// Iestyn's RGB dither (7 asm instructions) from Portal 2 X360, slightly modified for VR.
	// Removed the time component to avoid passing time into this shader.
	var dither = vec3(dot(vec2(171.0, 231.0), frag_coord));
	dither = fract(dither.rgb / vec3(103.0, 71.0, 97.0));

	// Subtract 0.5 to avoid slightly brightening the whole viewport.
	// Use a dither strength of 100% rather than the 37.5% suggested by the original source.
	return (dither.rgb - 0.5) / bit_alignment_diviser;
}

// Adapted from https://github.com/TheRealMJP/BakingLab/blob/master/BakingLab/ACES.hlsl
// (MIT License).
fn tonemap_aces(color: vec3f) -> vec3f {
	// These constants must match the those in the C++ code that calculates the parameters.
	let exposure_bias = 1.8f;
	let A = 0.0245786f;
	let B = 0.000090537f;
	let C = 0.983729f;
	let D = 0.432951f;
	let E = 0.238081f;

	// Exposure bias baked into transform to save shader instructions. Equivalent to `color *= exposure_bias`
	let rgb_to_rrt = mat3x3f(
			vec3(0.59719f * exposure_bias, 0.35458f * exposure_bias, 0.04823f * exposure_bias),
			vec3(0.07600f * exposure_bias, 0.90834f * exposure_bias, 0.01566f * exposure_bias),
			vec3(0.02840f * exposure_bias, 0.13383f * exposure_bias, 0.83777f * exposure_bias));

	let odt_to_rgb = mat3x3f(
			vec3(1.60475f, -0.53108f, -0.07367f),
			vec3(-0.10208f, 1.10813f, -0.00605f),
			vec3(-0.00327f, -0.07276f, 1.07602f));

	let new_color = max(vec3(0.0), color) * rgb_to_rrt;
	var color_tonemapped = (new_color * (new_color + A) - B) / (new_color * (C * new_color + D) + E);
	color_tonemapped *= odt_to_rgb;

	return color_tonemapped;
}

@fragment
fn fs_main(vsOut: VSOutput) -> @location(0) vec4<f32> {
    var color: vec4<f32> = textureSample(colorTexture, colorSampler, vsOut.TexCoord);
	var finalColor = linear_to_srgb(tonemap_aces(color.rgb));

	// Debanding should be done at the end of tonemapping, but before writing to the LDR buffer.
	// Otherwise, we're adding noise to an already-quantized image.
    finalColor += screen_space_dither(vsOut.Position.xy, 255.0);
    return vec4f(finalColor, color.a);
}