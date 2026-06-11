import sky_shader from "../shaders/sky_shader.wgsl";
import { type Vec3, vec3 } from "wgpu-matrix";
import type { Camera3D } from "../../control/camera3d";
import { CubeMapTexture } from "../../resources/cube_texture";
import type { RenderPipelineBuilder } from "../pipeline";
import type { BindGroupLayoutBuilder } from "../bind_group_layout";
import type { BindGroupBuilder } from "../bind_group";

export class Sky {
	buffer: GPUBuffer;
	pipeline: GPURenderPipeline;
	cubemap: CubeMapTexture;
	bindGroupLayout: GPUBindGroupLayout;
	bindGroup: GPUBindGroup;

	async initialize(device: GPUDevice) {
		const parameterBufferDescriptor: GPUBufferDescriptor = {
			label: "sky_buffer",
			size: 128,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		};
		this.buffer = device.createBuffer(parameterBufferDescriptor);

		this.cubemap = new CubeMapTexture();
		await this.cubemap.initialize(device, "cubemap_roughness/", 1024, 1024, 7);
	}

	async makeBindGroupsLayout(builder: BindGroupLayoutBuilder) {
		builder.addBuffer(
			GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
			"uniform",
		);
		builder.addTexture(GPUShaderStage.FRAGMENT, "cube");
		this.bindGroupLayout = await builder.build();
	}

	async makeBindGroups(builder: BindGroupBuilder) {
		builder.setLayout(this.bindGroupLayout);
		builder.addBuffer(this.buffer);
		builder.addTexture(this.cubemap.view, this.cubemap.sampler);
		this.bindGroup = await builder.build();
	}

	async makePipeline(
		builder: RenderPipelineBuilder,
		format: GPUTextureFormat,
		depthStencil: GPUDepthStencilState,
	) {
		builder.addBindGroupLayout(this.bindGroupLayout);
		builder.setSourceCode(sky_shader, "fs");
		builder.addColorFormat(format);
		builder.setDepthStencilState(depthStencil);
		builder.setCullMode("front");
		this.pipeline = await builder.buildRenderPipeline();
	}

	writeBuffer(
		device: GPUDevice,
		camera: Camera3D,
		height: number,
		width: number,
		fog_enabled: boolean,
		fog_color: Vec3,
		sky_effect: number,
	) {
		const dy = Math.tan(Math.PI / 8);
		const dx = (dy * width) / height;

		const skyData = new Float32Array(32);
		const rightScaled = vec3.scale(camera.right, dx);
		const upScaled = vec3.scale(camera.up, dy);

		skyData.set(camera.forwards, 0);
		skyData.set(rightScaled, 4);
		skyData.set(upScaled, 8);
		skyData.set(fog_color, 12);
		skyData[15] = sky_effect;

		const dataView = new DataView(skyData.buffer);
		dataView.setUint32(64, fog_enabled ? 1 : 0, true);

		device.queue.writeBuffer(this.buffer, 0, skyData);
	}
}
