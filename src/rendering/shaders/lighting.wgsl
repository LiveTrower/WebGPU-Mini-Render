struct RenderData {
    viewMatrix: mat4x4f,
	invViewMatrix: mat4x4f,
    projectionMatrix: mat4x4f,
    viewProjectionMatrix: mat4x4f,
    lightViewProjMatrix: mat4x4f,
    cameraPos: vec3f
};

struct ObjectData {
    model: array<mat4x4f>,
};

struct LightData {
    color: vec3f,
	energy: f32,
    positionWS: vec3f,
	shadow_enabled: u32
};

struct MaterialData {
	color: vec3f,
	metallic: f32,
	specular: f32,
	roughness: f32
}

@binding(0) @group(0) var<uniform> data: RenderData;
@binding(1) @group(0) var<uniform> light: LightData;
@binding(2) @group(0) var<uniform> material: MaterialData;
@binding(3) @group(0) var<storage, read> objects: ObjectData;
@binding(4) @group(0) var shadowMap: texture_depth_2d;
@binding(5) @group(0) var shadowSampler: sampler_comparison;

@binding(0) @group(1) var albedoTexture: texture_2d<f32>;
@binding(1) @group(1) var albedoSampler: sampler;
@binding(2) @group(1) var ormTexture: texture_2d<f32>;
@binding(3) @group(1) var ormSampler: sampler;
@binding(4) @group(1) var normalTexture: texture_2d<f32>;
@binding(5) @group(1) var normalSampler: sampler;
@binding(6) @group(1) var radianceCubemap: texture_cube<f32>;
@binding(7) @group(1) var radianceSampler: sampler;

struct Vertex {
    @location(0) position: vec3f,
    @location(1) uv: vec2f,
    @location(2) normal: vec3f,
	@location(3) tangent: vec3f,
	@location(4) bitangent: vec3f
}

struct VSOutput {
    @builtin(position) positionCS : vec4f,
	@location(0) positionWS : vec3f,
    @location(1) uv : vec2f,
    @location(2) normalVS : vec3f,
	@location(3) tangentVS: vec3f,
	@location(4) bitangentVS: vec3f,
    @location(5) shadowPos : vec3f
};

@vertex
fn vs_main(@builtin(instance_index) ID: u32, vert: Vertex) -> VSOutput {
    var output : VSOutput;

    output.positionCS = data.viewProjectionMatrix * objects.model[ID] * vec4(vert.position, 1.0);
	output.positionWS = (objects.model[ID] * vec4(vert.position, 1.0)).xyz;
    output.uv = vert.uv;
    output.normalVS = (data.viewMatrix * objects.model[ID] * vec4(vert.normal, 0.0)).xyz;
	output.tangentVS = (data.viewMatrix * objects.model[ID] * vec4(vert.tangent, 0.0)).xyz;
	output.bitangentVS = (data.viewMatrix * objects.model[ID] * vec4(vert.bitangent, 0.0)).xyz;

	let shadowProj = data.lightViewProjMatrix * objects.model[ID] * vec4(vert.position, 1.0);
	let posFromLight = shadowProj.xyz / shadowProj.w;
    output.shadowPos = vec3(
		posFromLight.xy * vec2(0.5, -0.5) + vec2(0.5),
		posFromLight.z
	);

    return output;
}

const PI = 3.14159265359;
const MAX_ROUGHNESS_LOD = 6;

const sh_coeffs: array<vec3<f32>, 9> = array<vec3<f32>, 9>(
	vec3( 0.543959677219391,  0.164066195487976,  0.040713261812925),
	vec3( 0.141621246933937,  0.035147476941347, -0.022765627130866),
	vec3( 0.054172057658434,  0.087201274931431,  0.020457500591874),
	vec3(-0.053483195602894, -0.085505209863186, -0.024140112102032),
	vec3(-0.032904889434576, -0.050404582172632, -0.010197551921010),
	vec3( 0.050611767917871,  0.063504226505756,  0.015232804231346),
	vec3( 0.006130429916084,  0.001481170067564, -0.001802364480682),
	vec3(-0.008516887202859, -0.046114228665829, -0.020401680842042),
	vec3( 0.017266416922212,  0.001390290097333, -0.007492312230170),
);

fn pow5(x: f32) -> f32 {
	let x2 = x * x;
	return x2 * x2 * x;
}

fn F_Schlick(f0: f32, f90: f32, u: f32) -> f32 {
	return f0 + (f90 - f0) * pow5(1.0 - u);
}

fn Diffuse_Burley(LdotH: f32, NdotV: f32, NdotL: f32, roughness: f32) -> f32 {
	let f90 = 0.5 + 2.0 * LdotH * LdotH * roughness;
	let FdV = F_Schlick(1.0, f90, NdotL);
	let FdL = F_Schlick(1.0, f90, NdotV);
	return (1.0 / PI) * FdV * FdL;
}

fn D_GGX(roughness: f32, NdotH: f32) -> f32 {
	let a = NdotH * roughness;
	let k = roughness / (1.0 - NdotH * NdotH + a * a);
	return k * k * (1.0 / PI);
}

// From Earl Hammon, Jr. "PBR Diffuse Lighting for GGX+Smith Microsurfaces" https://www.gdcvault.com/play/1024478/PBR-Diffuse-Lighting-for-GGX
fn V_GGX(alpha: f32, NdotL: f32, NdotV: f32) -> f32 {
	return 0.5 / mix(2.0 * NdotL * NdotV, NdotL + NdotV, alpha);
}

fn F0(metallic: f32, specular: f32, albedo: vec3f) -> vec3f {
	let dielectric = 0.16 * specular * specular;
	// use albedo * metallic as colored specular reflectance at 0 angle for metallic materials;
	// see https://google.github.io/filament/Filament.md.html
	return mix(vec3(dielectric), albedo, vec3(metallic));
}

fn compute_diffuse_color(albedo: vec3f, metallic: f32) -> vec3f {
    return albedo * (1.0 - metallic);
}

fn SchlickFresnel(f0: vec3f, f90: f32, u: f32) -> vec3f {
	return f0 + (f90 - f0) * pow5(1.0 - u);
}

fn specular_lobe(roughness: f32, metallic: f32, f0: vec3f, cNdotH: f32, cNdotL: f32, cNdotV: f32, cLdotH: f32) -> vec3f {
	let alpha_ggx = roughness * roughness;

	let D = D_GGX(alpha_ggx, cNdotH);
	let G = V_GGX(alpha_ggx, cNdotL, cNdotV);

	// Calculate Fresnel using specular occlusion term from Filament:
	// https://google.github.io/filament/Filament.html#lighting/occlusion/specularocclusion
	let f90 = clamp(dot(f0, vec3(50.0 * 0.33)), metallic, 1.0);
	let F = SchlickFresnel(f0, f90, cLdotH);
	return D * G * F;
}

fn shadows(shadowPos: vec3f) -> f32 {
	var visibility = 1.0;

	if (light.shadow_enabled == 0u) {
		return visibility;
	}

	let oneOverShadowDepthTextureSize = 1.0 / 1024.0;
	for (var y = -1; y <= 1; y++) {
    	for (var x = -1; x <= 1; x++) {
			let offset = vec2f(vec2(x, y)) * oneOverShadowDepthTextureSize;
			
			visibility += textureSampleCompare(
				shadowMap, shadowSampler,
				shadowPos.xy + offset, shadowPos.z - 0.001
			);
		}
	}
	return visibility / 9.0;
}

fn shading(diffuse_color: vec3f, roughness: f32, f0: vec3f, cLdotH: f32, cNdotH: f32, cNdotV: f32, cNdotL: f32, shadowPos: vec3f, color: ptr<function, vec3f>) {
	let direct_diffuse_light = diffuse_color * vec3(Diffuse_Burley(cLdotH, cNdotV, cNdotL, roughness));
	let direct_specular_light = specular_lobe(max(roughness, 0.01), material.metallic, f0, cNdotH, cNdotL, cNdotV, cLdotH);
	let visibility = shadows(shadowPos);

	if (cNdotL != 0.0) {
		*color = (direct_diffuse_light + direct_specular_light) * light.energy * light.color * cNdotL * visibility;
	} else {
		*color = vec3(0.0);
	}
}

fn BRDF_Aprox(roughness: f32, NoV: f32) -> vec2f {
	let c0 = vec4(-1.0, -0.0275, -0.572, 0.022);
	let c1 = vec4(1.0, 0.0425, 1.04, -0.04);
	var r = roughness * c0 + c1;

	var a004 = min(r.x * r.x, exp2(-9.28 * NoV)) * r.x + r.y;
	return vec2(-1.04, 1.04) * a004 + r.zw;
}

fn get_reflected_vector(roughness: f32, v: vec3f, n: vec3f) -> vec3f {
	let ref_vec = reflect(-v, n);
    return mix(ref_vec, n, roughness * roughness);
}

fn prefiltered_radiance(r: vec3f, lod: f32) -> vec3f {
    return textureSampleLevel(radianceCubemap, radianceSampler, r, lod).rgb;
}

fn irradiance_spherical_harmonics(n: vec3f) -> vec3f {
	var sphericalHarmonics = sh_coeffs[0];
	sphericalHarmonics +=
				sh_coeffs[1] * (n.y)
                + sh_coeffs[2] * (n.z)
                + sh_coeffs[3] * (n.x)
                + sh_coeffs[4] * (n.y * n.x)
                + sh_coeffs[5] * (n.y * n.z)
                + sh_coeffs[6] * (3.0 * n.z * n.z - 1.0)
                + sh_coeffs[7] * (n.z * n.x)
                + sh_coeffs[8] * (n.x * n.x - n.y * n.y);

	return max(sphericalHarmonics, vec3(0.0));
}

fn ibl(diffuse_color: vec3f, roughness: f32, ao: f32, f0: vec3f, position: vec3f, normal: vec3f, cNdotV: f32, color: ptr<function, vec3f>) {
	let viewWS = position - data.cameraPos;
	let normalWS = (data.invViewMatrix * vec4(normal, 0.0)).xyz;
	let r = get_reflected_vector(roughness, viewWS, normalWS) * vec3(-1.0, -1.0, -1.0);
	let roughness_lod = sqrt(roughness) * MAX_ROUGHNESS_LOD;

	// cheap luminance approximation
	let f90 = clamp(50.0 * f0.g, material.metallic, 1.0);
	let envBRDF = BRDF_Aprox(roughness, cNdotV);
	let E = envBRDF.x * f0 + envBRDF.y * f90;

	let diffuse_irradiance = irradiance_spherical_harmonics(normalWS);
	let indirect_diffuse_light = diffuse_color * diffuse_irradiance * (1.0 - E) * ao;

	let indirect_specular_light = E * prefiltered_radiance(r, roughness_lod);

	*color += indirect_diffuse_light + indirect_specular_light;
}

fn directional_light(albedo: vec3f, roughness: f32, ao: f32, position: vec3f, normal: vec3f, shadowPos: vec3f) -> vec3f {
	let positionVS = (data.viewMatrix * vec4(position, 1.0)).xyz;
	let lightVS = (data.viewMatrix * vec4(light.positionWS, 0.0)).xyz;
	let f0 = F0(material.metallic, material.specular, albedo);
	let diffuse_color = compute_diffuse_color(albedo, material.metallic);

	let V = normalize(-positionVS);
	let N = normalize(normal);
	let L = normalize(lightVS);
	let H = normalize(V + L);
	let cNdotL = saturate(dot(N, L));
	let cNdotV = saturate(dot(N, V));
	let cNdotH = saturate(dot(N, H));
	let cLdotH = saturate(dot(L, H));

	var color = vec3(0.0);

	shading(diffuse_color, roughness, f0, cLdotH, cNdotH, cNdotV, cNdotL, shadowPos, &color);
	ibl(diffuse_color, roughness, ao, f0, position, normal, cNdotV, &color);

	return color;
}

fn point_light(albedo: vec3f, roughness: f32, ao: f32, position: vec3f, normal: vec3f, shadowPos: vec3f) -> vec3f {
	let positionVS = (data.viewMatrix * vec4(position, 1.0)).xyz;
	let lightVS = (data.viewMatrix * vec4(light.positionWS, 1.0)).xyz;
    let lightVec = normalize(lightVS - positionVS);

    let dist = length(lightVec);
    let a = 3.0;
	let b = 0.7;
	let inten = 1.0 / (a * dist * dist + b * dist + 1.0);

	let f0 = F0(material.metallic, material.specular, albedo);
	let diffuse_color = compute_diffuse_color(albedo, material.metallic);

	let V = normalize(-positionVS);
	let N = normalize(normal);
	let L = normalize(lightVec);
	let H = normalize(V + L);
	let cNdotL = saturate(dot(N, L));
	let cNdotV = saturate(dot(N, V));
	let cNdotH = saturate(dot(N, H));
	let cLdotH = saturate(dot(L, H));

	var color = vec3(0.0);

	shading(diffuse_color, roughness, f0, cLdotH, cNdotH, cNdotV, cNdotL, shadowPos, &color);
	ibl(diffuse_color, roughness, ao, f0, position, normal, cNdotV, &color);

    return color;
}

fn normal_tangent(normal_map: vec2f, tbnMatrix: mat3x3f) -> vec3f {
	let xy = normal_map * 2.0 - 1.0;
	let z = sqrt(max(0.0, 1.0 - dot(xy, xy)));
	let normal = vec3(xy, z);
	return tbnMatrix * normal;
}

@fragment
fn fs_main(vsOut: VSOutput) -> @location(0) vec4f {
	let tbnMatrix = mat3x3f(vsOut.tangentVS, vsOut.bitangentVS, vsOut.normalVS);
    let albedo_map = textureSample(albedoTexture, albedoSampler, vsOut.uv * 2.0).rgb;
	let orm_map = textureSample(ormTexture, ormSampler, vsOut.uv * 2.0).rg;
	let normal_map = textureSample(normalTexture, normalSampler, vsOut.uv * 2.0).rg;
	let albedo = material.color * albedo_map;
	let roughness = material.roughness * orm_map.g;
	let ao = orm_map.r;
	let normal = normal_tangent(normal_map, tbnMatrix); // Normal view-space
    let color = directional_light(albedo, roughness, ao, vsOut.positionWS, normal, vsOut.shadowPos);
    return vec4(color, 1.0);
}