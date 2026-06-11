export class RenderPipelineBuilder {
	device: GPUDevice;
	bindGroupLayouts: GPUBindGroupLayout[];
	src_code: string;
	vertex_entry: string;
	fragment_entry: string;
	compute_entry: string;
	buffers: GPUVertexBufferLayout[];
	colorTargetStates: GPUColorTargetState[];
	depthStencilState: GPUDepthStencilState | undefined;
	cullMode: GPUCullMode;

	constructor(device: GPUDevice) {
		this.bindGroupLayouts = [];
		this.device = device;
		this.buffers = [];
		this.colorTargetStates = [];
		this.depthStencilState = undefined;
		this.reset();
	}

	reset() {
		this.bindGroupLayouts = [];
		this.buffers = [];
		this.src_code = "";
		this.vertex_entry = "";
		this.fragment_entry = "";
		this.compute_entry = "";
		this.colorTargetStates = [];
		this.depthStencilState = undefined;
	}

	async addBindGroupLayout(layout: GPUBindGroupLayout) {
		this.bindGroupLayouts.push(layout);
	}

	setSourceCode(src_code: string, type: string) {
		this.src_code = src_code;
		if (type === "vs") {
			this.vertex_entry = "vs_main";
		} else if (type === "fs") {
			this.vertex_entry = "vs_main";
			this.fragment_entry = "fs_main";
		} else if (type === "cs") {
			this.compute_entry = "cs_main";
		}
	}

	addVertexBufferDescription(vertexBufferLayout: GPUVertexBufferLayout) {
		this.buffers.push(vertexBufferLayout);
	}

	addColorFormat(format: GPUTextureFormat) {
		this.colorTargetStates.push({
			format: format,
		});
	}

	setDepthStencilState(depthStencil: GPUDepthStencilState) {
		this.depthStencilState = depthStencil;
	}

	setCullMode(cullMode: GPUCullMode) {
		this.cullMode = cullMode;
	}

	async buildRenderPipeline(): Promise<GPURenderPipeline> {
		const layout = this.device.createPipelineLayout({
			bindGroupLayouts: this.bindGroupLayouts,
		});

		const pipelineDescriptor: GPURenderPipelineDescriptor = {
			layout: layout,

			vertex: {
				module: this.device.createShaderModule({
					code: this.src_code,
				}),
				entryPoint: this.vertex_entry,
				buffers: this.buffers,
			},

			primitive: {
				topology: "triangle-list",
				frontFace: "ccw",
				cullMode: this.cullMode,
			},
		};

		if (this.fragment_entry) {
			pipelineDescriptor.fragment = {
				module: this.device.createShaderModule({
					code: this.src_code,
				}),
				entryPoint: this.fragment_entry,
				targets: this.colorTargetStates,
			};
		}

		if (this.depthStencilState) {
			pipelineDescriptor.depthStencil = this.depthStencilState;
		}

		const pipeline = await this.device.createRenderPipeline(pipelineDescriptor);

		this.reset();

		return pipeline;
	}

	async buildComputePipeline(): Promise<GPUComputePipeline> {
		const pipelineDescriptor: GPUComputePipelineDescriptor = {
			layout: this.device.createPipelineLayout({
				bindGroupLayouts: this.bindGroupLayouts,
			}),
			compute: {
				module: this.device.createShaderModule({
					code: this.src_code,
				}),
				entryPoint: this.compute_entry,
			},
		};

		const pipeline =
			await this.device.createComputePipeline(pipelineDescriptor);

		this.reset();

		return pipeline;
	}
}
