import { vec2 } from "wgpu-matrix";
import type { Texture } from "../../resources/texture";
import type { RenderPipelineBuilder } from "../pipeline";
import type { BindGroupLayoutBuilder } from "../bind_group_layout";
import type { BindGroupBuilder } from "../bind_group";
import fxaa from "../shaders/fxaa.wgsl";

export class FXAA {
	buffer: GPUBuffer;
	pipeline: GPURenderPipeline;
	bindGroupLayout: GPUBindGroupLayout;
	bindGroup: GPUBindGroup;

	async initialize(device: GPUDevice) {
		const parameterBufferDescriptor: GPUBufferDescriptor = {
			label: "fxaa_buffer",
			size: 16,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		};
		this.buffer = device.createBuffer(parameterBufferDescriptor);
	}

	async makeBindGroupsLayout(builder: BindGroupLayoutBuilder) {
		builder.addBuffer(GPUShaderStage.FRAGMENT, "uniform");
		builder.addTexture(GPUShaderStage.FRAGMENT, "2d");
		this.bindGroupLayout = await builder.build();
	}

	async makeBindGroups(builder: BindGroupBuilder, colorBuffer: Texture) {
		builder.setLayout(this.bindGroupLayout);
		builder.addBuffer(this.buffer);
		builder.addTexture(colorBuffer.view, colorBuffer.sampler);
		this.bindGroup = await builder.build();
	}

	async makePipeline(builder: RenderPipelineBuilder, format: GPUTextureFormat) {
		builder.addBindGroupLayout(this.bindGroupLayout);
		builder.setSourceCode(fxaa, "fs");
		builder.addColorFormat(format);
		builder.setCullMode("front");
		this.pipeline = await builder.buildRenderPipeline();
	}

	writeBuffer(device: GPUDevice, height: number, width: number) {
		const data = new Float32Array(2);
		data.set(vec2.create(1.0 / width, 1.0 / height), 0);
		device.queue.writeBuffer(this.buffer, 0, data);
	}
}
