import type { BindGroupBuilder } from "../bind_group";
import type { BindGroupLayoutBuilder } from "../bind_group_layout";
import type { RenderPipelineBuilder } from "../pipeline";
import { Texture } from "../../resources/texture";
import type { Vec2, Mat4 } from "wgpu-matrix";
import shadow_map_shader from "../shaders/shadow_map.wgsl";

export class ShadowMap {
	public readonly FORMAT: GPUTextureFormat = "depth16unorm";

	texture: Texture;
	buffer: GPUBuffer;
	pipeline: GPURenderPipeline;
	bindGroupLayout: GPUBindGroupLayout;
	bindGroup: GPUBindGroup;
	resolution: Vec2;

	async initialize(device: GPUDevice, resolution: Vec2) {
		this.resolution = resolution;

		this.texture = new Texture();
		this.texture.createDepthTexture(
			device,
			resolution[0],
			resolution[1],
			this.FORMAT,
		);

		const shadowBufferDescriptor: GPUBufferDescriptor = {
			label: "shadow_buffer",
			size: 64,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		};

		this.buffer = device.createBuffer(shadowBufferDescriptor);
	}

	async makeBindGroupsLayout(builder: BindGroupLayoutBuilder) {
		builder.addBuffer(GPUShaderStage.VERTEX, "uniform");
		builder.addBuffer(GPUShaderStage.VERTEX, "read-only-storage");
		this.bindGroupLayout = await builder.build();
	}

	async makeBindGroups(builder: BindGroupBuilder, objectBuffer: GPUBuffer) {
		builder.setLayout(this.bindGroupLayout);
		builder.addBuffer(this.buffer);
		builder.addBuffer(objectBuffer);
		this.bindGroup = await builder.build();
	}

	async makePipeline(
		builder: RenderPipelineBuilder,
		vertexBufferLayout: GPUVertexBufferLayout,
	) {
		builder.addBindGroupLayout(this.bindGroupLayout);
		builder.addVertexBufferDescription(vertexBufferLayout);
		builder.setSourceCode(shadow_map_shader, "vs");
		const depthStencil: GPUDepthStencilState = {
			format: this.FORMAT,
			depthWriteEnabled: true,
			depthCompare: "greater",
		};
		builder.setDepthStencilState(depthStencil);
		builder.setCullMode("back");
		this.pipeline = await builder.buildRenderPipeline();
	}

	writeBuffer(device: GPUDevice, lightProjection: Mat4) {
		device.queue.writeBuffer(this.buffer, 0, new Float32Array(lightProjection));
	}
}
