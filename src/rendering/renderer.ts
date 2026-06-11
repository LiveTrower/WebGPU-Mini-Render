import { type Mat4, mat4, vec2 } from "wgpu-matrix";
import { Texture } from "../resources/texture";
import type { RenderData } from "../model/definitions";
import { ObjMesh } from "../resources/obj_mesh";
import type { Camera3D } from "../control/camera3d";
import { Light3D } from "../control/light3d";
import { Material3D } from "../control/material3d";
import { BindGroupLayoutBuilder } from "./bind_group_layout";
import { BindGroupBuilder } from "./bind_group";
import { RenderPipelineBuilder } from "./pipeline";
import { ToneMapper } from "./effects/tone_mapper";
import { Fog } from "./effects/fog";
import { Environment } from "../control/environment";
import { Sky } from "./effects/sky";
import { ShadowMap } from "./effects/shadow_map";
import { FXAA } from "./effects/fxaa";
import { FrameBuffers } from "../resources/framebuffers";
import light_shader from "./shaders/lighting.wgsl";

export class Renderer {
	canvas: HTMLCanvasElement;

	// Device/Context objects
	adapter: GPUAdapter;
	device: GPUDevice;
	context: GPUCanvasContext;

	viewMatrix: Mat4;
	invViewMatrix: Mat4;
	viewProjectionMatrix: Mat4;

	// Pipeline objects
	dataBuffer: GPUBuffer;
	lightPipeline: GPURenderPipeline;
	lightBindGroupLayout: GPUBindGroupLayout;
	materialGroupLayout: GPUBindGroupLayout;
	lightBindGroup: GPUBindGroup;
	materialBindGroup: GPUBindGroup;

	// Assets
	shadowMap: ShadowMap;
	environment: Environment;
	fog: Fog;
	sky: Sky;
	toneMapper: ToneMapper;
	fxaa: FXAA;
	statueMesh: ObjMesh;
	planeMesh: ObjMesh;
	material3D: Material3D;
	woodAlbedoTexture: Texture;
	woodORMTexture: Texture;
	woodNormalTexture: Texture;
	objectBuffer: GPUBuffer;
	light: Light3D;

	framebuffers: FrameBuffers;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.environment = new Environment();
		this.shadowMap = new ShadowMap();
		this.sky = new Sky();
		this.fog = new Fog();
		this.toneMapper = new ToneMapper();
		this.fxaa = new FXAA();
		this.framebuffers = new FrameBuffers();
	}

	async Initialize() {
		await this.setupDevice();

		await this.makeBindGroupLayouts();

		await this.createAssets();

		await this.setupFrameBuffers();

		await this.makePipelines();

		await this.makeBindGroups();
	}

	async setupDevice() {
		//adapter: wrapper around (physical) GPU.
		//Describes features and limits
		this.adapter = <GPUAdapter>await navigator.gpu?.requestAdapter();
		//device: wrapper around GPU functionality
		//Function calls are made through the device
		this.device = <GPUDevice>await this.adapter?.requestDevice();
		//context: similar to vulkan instance (or OpenGL context)
		this.context = <GPUCanvasContext>this.canvas.getContext("webgpu");
		const format = navigator.gpu.getPreferredCanvasFormat();
		this.context.configure({
			device: this.device,
			format: format,
			alphaMode: "opaque",
		});
	}

	async setupFrameBuffers() {
		this.framebuffers.setCanvas(
			this.canvas.height,
			this.canvas.width,
			navigator.gpu.getPreferredCanvasFormat(),
		);
		this.framebuffers.setupColorBuffer(this.device);
		this.framebuffers.setupDepthBuffer(this.device);
		this.framebuffers.setupTonemapBuffer(this.device);
	}

	async makeBindGroupLayouts() {
		var builder = new BindGroupLayoutBuilder(this.device);

		await this.shadowMap.makeBindGroupsLayout(builder);
		await this.sky.makeBindGroupsLayout(builder);

		builder.addBuffer(
			GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
			"uniform",
		);
		builder.addBuffer(GPUShaderStage.FRAGMENT, "uniform");
		builder.addBuffer(GPUShaderStage.FRAGMENT, "uniform");
		builder.addBuffer(GPUShaderStage.FRAGMENT, "uniform");
		builder.addBuffer(GPUShaderStage.VERTEX, "read-only-storage");
		builder.addDepthTexture(GPUShaderStage.FRAGMENT, "2d");
		this.lightBindGroupLayout = await builder.build();

		builder.addTexture(GPUShaderStage.FRAGMENT, "2d");
		builder.addTexture(GPUShaderStage.FRAGMENT, "2d");
		builder.addTexture(GPUShaderStage.FRAGMENT, "2d");
		builder.addTexture(GPUShaderStage.FRAGMENT, "cube");
		this.materialGroupLayout = await builder.build();

		await this.toneMapper.makeBindGroupsLayout(builder);
		await this.fxaa.makeBindGroupsLayout(builder);
	}

	async makePipelines() {
		var builder: RenderPipelineBuilder = new RenderPipelineBuilder(this.device);

		await this.shadowMap.makePipeline(builder, this.statueMesh.bufferLayout);
		await this.sky.makePipeline(
			builder,
			this.framebuffers.colorFormat,
			this.framebuffers.depthStencilState,
		);

		builder.addBindGroupLayout(this.lightBindGroupLayout);
		builder.addBindGroupLayout(this.materialGroupLayout);
		builder.addVertexBufferDescription(this.statueMesh.bufferLayout);
		builder.setSourceCode(light_shader, "fs");
		builder.addColorFormat(this.framebuffers.colorFormat);
		builder.setDepthStencilState(this.framebuffers.depthStencilState);
		builder.setCullMode("back");
		this.lightPipeline = await builder.buildRenderPipeline();

		await this.toneMapper.makePipeline(builder, this.framebuffers.colorFormat);
		await this.fxaa.makePipeline(builder, this.framebuffers.canvasFormat);
	}

	async createAssets() {
		this.statueMesh = new ObjMesh();
		this.planeMesh = new ObjMesh();
		await this.statueMesh.initialize(
			this.device,
			"src/assets/models/Suzanne.obj",
		);
		await this.planeMesh.initialize(this.device, "src/assets/models/Plane.obj");
		this.material3D = new Material3D(this.device);
		this.woodAlbedoTexture = new Texture();
		this.woodORMTexture = new Texture();
		this.woodNormalTexture = new Texture();
		this.light = new Light3D(this.device);

		await this.shadowMap.initialize(this.device, vec2.create(1024, 1024));
		await this.sky.initialize(this.device);
		await this.fog.initialize(this.device);

		this.objectBuffer = this.device.createBuffer({
			label: "model_buffer",
			size: 64 * 1024,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		});

		this.dataBuffer = this.device.createBuffer({
			label: "data_buffer",
			size: 64 * 5 + 16,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});

		await this.woodAlbedoTexture.createTexture(
			this.device,
			"Planks/PlanksAlbedo",
			1024,
			1024,
			11,
		);
		await this.woodORMTexture.createTexture(
			this.device,
			"Planks/PlanksORM",
			1024,
			1024,
			11,
		);
		await this.woodNormalTexture.createTexture(
			this.device,
			"Planks/PlanksNormal",
			1024,
			1024,
			11,
		);

		await this.fxaa.initialize(this.device);
	}

	async makeBindGroups() {
		var builder: BindGroupBuilder = new BindGroupBuilder(this.device);

		await this.shadowMap.makeBindGroups(builder, this.objectBuffer);
		await this.sky.makeBindGroups(builder);

		builder.setLayout(this.lightBindGroupLayout);
		builder.addBuffer(this.dataBuffer);
		builder.addBuffer(this.light.lightBuffer);
		builder.addBuffer(this.fog.fogBuffer);
		builder.addBuffer(this.material3D.materialBuffer);
		builder.addBuffer(this.objectBuffer);
		builder.addTexture(
			this.shadowMap.texture.view,
			this.shadowMap.texture.sampler,
		);
		this.lightBindGroup = await builder.build();

		builder.setLayout(this.materialGroupLayout);
		builder.addTexture(
			this.woodAlbedoTexture.view,
			this.woodAlbedoTexture.sampler,
		);
		builder.addTexture(this.woodORMTexture.view, this.woodORMTexture.sampler);
		builder.addTexture(
			this.woodNormalTexture.view,
			this.woodNormalTexture.sampler,
		);
		builder.addTexture(this.sky.cubemap.view, this.sky.cubemap.sampler);
		this.materialBindGroup = await builder.build();

		await this.toneMapper.makeBindGroups(
			builder,
			this.framebuffers.colorBuffer,
		);
		await this.fxaa.makeBindGroups(builder, this.framebuffers.tonemapBuffer);
	}

	setupMatrices(renderables: RenderData, camera: Camera3D) {
		//make transforms
		this.viewMatrix = renderables.view_transform;

		this.invViewMatrix = mat4.invert(this.viewMatrix);

		this.viewProjectionMatrix = mat4.multiply(
			camera.reverseProjectionMatrix,
			this.viewMatrix,
		);
	}

	drawShadowMaps(commandEncoder: GPUCommandEncoder) {
		this.shadowMap.writeBuffer(
			this.device,
			this.light.lightViewProjectionMatrix,
		);

		const renderpass: GPURenderPassEncoder = commandEncoder.beginRenderPass({
			colorAttachments: [],
			depthStencilAttachment: {
				view: this.shadowMap.texture.view,
				depthClearValue: 0,
				depthLoadOp: "clear",
				depthStoreOp: "store",
			},
		});

		renderpass.setPipeline(this.shadowMap.pipeline);
		renderpass.setBindGroup(0, this.shadowMap.bindGroup);

		renderpass.setVertexBuffer(0, this.statueMesh.buffer);
		renderpass.draw(this.statueMesh.vertexCount, 1, 0, 0);

		renderpass.end();
	}

	prepareScene(renderables: RenderData, camera: Camera3D) {
		this.sky.writeBuffer(
			this.device,
			camera,
			this.framebuffers.canvasHeight,
			this.framebuffers.canvasWidth,
			this.environment.fogEnabled,
			this.environment.fogColor,
			this.environment.fogSkyEffect,
		);

		this.device.queue.writeBuffer(
			this.objectBuffer,
			0,
			new Float32Array(renderables.model_transforms),
			0,
			renderables.model_transforms.length,
		);

		const sceneData = new Float32Array(83);
		sceneData.set(this.viewMatrix, 0);
		sceneData.set(this.invViewMatrix, 16);
		sceneData.set(camera.reverseProjectionMatrix, 32);
		sceneData.set(this.viewProjectionMatrix, 48);
		sceneData.set(this.light.lightViewProjectionMatrix, 64);
		sceneData.set(camera.position, 80);
		this.device.queue.writeBuffer(this.dataBuffer, 0, sceneData);

		const lightData = new Float32Array(8);
		lightData.set(this.light.color, 0);
		lightData[3] = this.light.energy;
		lightData.set(this.light.position, 4);
		lightData[7] = this.light.shadowEnabled ? 1.0 : 0.0;
		this.device.queue.writeBuffer(this.light.lightBuffer, 0, lightData);

		this.fog.writeBuffer(
			this.device,
			this.environment.fogEnabled,
			this.environment.fogColor,
			this.environment.fogDensity,
			this.environment.fogDepth,
			this.environment.fogNear,
			this.environment.fogFar,
		);

		const materialData = new Float32Array(8);
		materialData.set(this.material3D.color, 0);
		materialData[3] = this.material3D.metallic;
		materialData[4] = this.material3D.specular;
		materialData[5] = this.material3D.roughness;
		this.device.queue.writeBuffer(
			this.material3D.materialBuffer,
			0,
			materialData,
		);
	}

	drawScene(
		renderables: RenderData,
		camera: Camera3D,
		commandEncoder: GPUCommandEncoder,
	) {
		this.prepareScene(renderables, camera);

		const renderpass: GPURenderPassEncoder = commandEncoder.beginRenderPass({
			colorAttachments: [
				{
					view: this.framebuffers.colorBuffer.view,
					loadOp: "clear",
					storeOp: "store",
				},
			],
			depthStencilAttachment: this.framebuffers.depthStencilAttachment,
		});

		renderpass.setPipeline(this.sky.pipeline);
		renderpass.setBindGroup(0, this.sky.bindGroup);
		renderpass.draw(6, 1, 0, 0);

		renderpass.setPipeline(this.lightPipeline);
		renderpass.setBindGroup(0, this.lightBindGroup);

		var objects_drawn: number = 0;

		renderpass.setVertexBuffer(0, this.statueMesh.buffer);
		renderpass.setBindGroup(1, this.materialBindGroup);
		renderpass.draw(this.statueMesh.vertexCount, 1, 0, objects_drawn);
		objects_drawn += 1;

		renderpass.setVertexBuffer(0, this.planeMesh.buffer);
		renderpass.setBindGroup(1, this.materialBindGroup);
		renderpass.draw(this.planeMesh.vertexCount, 1, 0, objects_drawn);
		objects_drawn += 1;

		renderpass.end();
	}

	async applyToneMapping(commandEncoder: GPUCommandEncoder) {
		const renderpass: GPURenderPassEncoder = commandEncoder.beginRenderPass({
			colorAttachments: [
				{
					view: this.framebuffers.tonemapBuffer.view,
					loadOp: "clear",
					storeOp: "store",
				},
			],
		});

		renderpass.setPipeline(this.toneMapper.pipeline);
		renderpass.setBindGroup(0, this.toneMapper.bindGroup);
		renderpass.draw(3, 1, 0, 0);

		renderpass.end();
	}

	async applyFXAA(commandEncoder: GPUCommandEncoder) {
		this.fxaa.writeBuffer(
			this.device,
			this.framebuffers.canvasHeight,
			this.framebuffers.canvasWidth,
		);

		//texture view: image view to the color buffer in this case
		const textureView: GPUTextureView = this.context
			.getCurrentTexture()
			.createView();
		const renderpass: GPURenderPassEncoder = commandEncoder.beginRenderPass({
			colorAttachments: [
				{
					view: textureView,
					loadOp: "load",
					storeOp: "store",
				},
			],
		});

		renderpass.setPipeline(this.fxaa.pipeline);
		renderpass.setBindGroup(0, this.fxaa.bindGroup);
		renderpass.draw(3, 1, 0, 0);

		renderpass.end();
	}

	async render(renderables: RenderData, camera: Camera3D) {
		//Early exit tests
		if (!this.device || !this.lightPipeline) {
			return;
		}

		//command encoder: records draw commands for submission
		const commandEncoder: GPUCommandEncoder =
			this.device.createCommandEncoder();

		this.setupMatrices(renderables, camera);

		if (this.light.shadowEnabled) {
			this.drawShadowMaps(commandEncoder);
		}

		this.drawScene(renderables, camera, commandEncoder);

		this.applyToneMapping(commandEncoder);

		this.applyFXAA(commandEncoder);

		this.device.queue.submit([commandEncoder.finish()]);
	}
}
