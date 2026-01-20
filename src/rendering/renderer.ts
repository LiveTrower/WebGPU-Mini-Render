import light_shader from "./shaders/lighting.wgsl";
import { mat4, vec3 } from "gl-matrix";
import { Texture } from "../resources/texture";
import { RenderData } from "../model/definitions";
import { ObjMesh } from "../resources/obj_mesh";
import { Camera } from "../model/camera";
import { Light3D } from "../control/light3d";
import { Material3D } from "../control/material3d";
import { BindGroupLayoutBuilder } from "./bind_group_layout";
import { BindGroupBuilder } from "./bind_group";
import { RenderPipelineBuilder } from "./pipeline";
import { PostProcessing } from "./post_processing";
import { Sky } from "./sky";
import { ShadowMap } from "./shadow_map";
import { Deg2Rad } from "../model/common_math";

export class Renderer {
    canvas: HTMLCanvasElement;

    // Device/Context objects
    adapter: GPUAdapter;
    device: GPUDevice;
    context: GPUCanvasContext;
    format : GPUTextureFormat;

    projectionMatrix: mat4;
    viewMatrix: mat4;
    invViewMatrix: mat4;
    viewProjectionMatrix: mat4;
    skyMatrix: mat4;

    // Pipeline objects
    dataBuffer: GPUBuffer;
    lightPipeline: GPURenderPipeline;
    lightBindGroupLayout: GPUBindGroupLayout;
    materialGroupLayout: GPUBindGroupLayout;
    lightBindGroup: GPUBindGroup;
    materialBindGroup: GPUBindGroup;

    // Depth stuff
    depthTexture: Texture;
    depthStencilState: GPUDepthStencilState;
    depthStencilAttachment: GPURenderPassDepthStencilAttachment;

    // Assets
    shadowMap: ShadowMap;
    sky: Sky;
    //postProcessing: PostProcessing;
    statueMesh: ObjMesh;
    planeMesh: ObjMesh;
    material3D: Material3D;
    woodAlbedoTexture: Texture;
    woodORMTexture: Texture;
    woodNormalTexture: Texture;
    objectBuffer: GPUBuffer;
    light: Light3D;

    constructor(canvas: HTMLCanvasElement){
        this.canvas = canvas;
        this.shadowMap = new ShadowMap();
        this.sky = new Sky();
        //this.postProcessing = new PostProcessing();
    }

    async Initialize() {
        await this.setupDevice();

        await this.makeBindGroupLayouts();

        await this.createAssets();

        await this.makeDepthBufferResources();
    
        await this.makePipelines();

        await this.makeBindGroups();
    }

    async setupDevice() {
        //adapter: wrapper around (physical) GPU.
        //Describes features and limits
        this.adapter = <GPUAdapter> await navigator.gpu?.requestAdapter();
        //device: wrapper around GPU functionality
        //Function calls are made through the device
        this.device = <GPUDevice> await this.adapter?.requestDevice();
        //context: similar to vulkan instance (or OpenGL context)
        this.context = <GPUCanvasContext> this.canvas.getContext("webgpu");
        this.format = navigator.gpu.getPreferredCanvasFormat();
        this.context.configure({
            device: this.device,
            format: this.format,
            alphaMode: "opaque"
        });
    }

    async makeDepthBufferResources() {
        this.depthTexture = new Texture();

        this.depthStencilState = {
            format: "depth24plus-stencil8",
            depthWriteEnabled: true,
            depthCompare: "less",
        };

        const size: GPUExtent3D = {
            width: this.canvas.width,
            height: this.canvas.height,
            depthOrArrayLayers: 1
        };
        const depthBufferDescriptor: GPUTextureDescriptor = {
            size: size,
            format: "depth24plus-stencil8",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        }

        const viewDescriptor: GPUTextureViewDescriptor = {
            format: "depth24plus-stencil8",
            dimension: "2d",
            aspect: "all"
        };

        this.depthTexture.createCustomTexture(this.device, depthBufferDescriptor, viewDescriptor);
        
        this.depthStencilAttachment = {
            view: this.depthTexture.view,
            depthClearValue: 1.0,
            depthLoadOp: "clear",
            depthStoreOp: "store",
            stencilClearValue: 0,
            stencilLoadOp: "clear",
            stencilStoreOp: "store"
        };
    }

    async makeBindGroupLayouts() {
        var builder = new BindGroupLayoutBuilder(this.device);

        await this.shadowMap.makeBindGroupsLayout(builder);
        await this.sky.makeBindGroupsLayout(builder);

        builder.addBuffer(GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, "uniform");
        builder.addBuffer(GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, "uniform");
        builder.addBuffer(GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, "uniform");
        builder.addBuffer(GPUShaderStage.VERTEX, "read-only-storage");
        builder.addDepthTexture(GPUShaderStage.FRAGMENT, "2d");
        this.lightBindGroupLayout = await builder.build();

        builder.addTexture(GPUShaderStage.FRAGMENT, "2d");
        builder.addTexture(GPUShaderStage.FRAGMENT, "2d");
        builder.addTexture(GPUShaderStage.FRAGMENT, "2d");
        builder.addTexture(GPUShaderStage.FRAGMENT, "cube");
        this.materialGroupLayout = await builder.build();

        //await this.postProcessing.makeBindGroupsLayout(builder);
    }

    async makePipelines() {
        var builder: RenderPipelineBuilder = new RenderPipelineBuilder(this.device);

        await this.shadowMap.makePipeline(builder, this.statueMesh.bufferLayout);
        await this.sky.makePipeline(builder, this.depthStencilState);

        builder.addBindGroupLayout(this.lightBindGroupLayout);
        builder.addBindGroupLayout(this.materialGroupLayout);
        builder.addVertexBufferDescription(this.statueMesh.bufferLayout);
        builder.setSourceCode(light_shader, "fs");
        builder.addColorFormat(this.format);
        builder.setDepthStencilState(this.depthStencilState);
        builder.setCullMode("back");
        this.lightPipeline = await builder.buildRenderPipeline();
        
        //await this.postProcessing.makePipeline(builder);
    }

    async createAssets() {
        this.statueMesh = new ObjMesh();
        this.planeMesh = new ObjMesh();
        await this.statueMesh.initialize(this.device, "dist/models/Suzanne.obj");
        await this.planeMesh.initialize(this.device, "dist/models/Plane.obj");
        this.material3D = new Material3D(this.device);  
        this.woodAlbedoTexture = new Texture();
        this.woodORMTexture = new Texture();
        this.woodNormalTexture = new Texture();
        this.light = new Light3D(this.device);

        await this.shadowMap.initialize(this.device, [1024, 1024]);
        await this.sky.initialize(this.device, this.format);

        this.objectBuffer = this.device.createBuffer({
            label: "model_buffer",
            size: 64 * 1024,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });

        this.dataBuffer = this.device.createBuffer({
            label: "data_buffer",
            size: (64 * 5) + 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        await this.woodAlbedoTexture.createTexture(this.device, "Planks/PlanksAlbedo");
        await this.woodORMTexture.createTexture(this.device, "Planks/PlanksORM");
        await this.woodNormalTexture.createTexture(this.device, "Planks/PlanksNormal");

        //await this.postProcessing.initialize(this.device, this.canvas, this.format);
    }

    async makeBindGroups() {
        var builder: BindGroupBuilder = new BindGroupBuilder(this.device);

        await this.shadowMap.makeBindGroups(builder, this.objectBuffer);
        await this.sky.makeBindGroups(builder);

        builder.setLayout(this.lightBindGroupLayout);
        builder.addBuffer(this.dataBuffer);
        builder.addBuffer(this.light.lightBuffer);
        builder.addBuffer(this.material3D.materialBuffer);
        builder.addBuffer(this.objectBuffer);
        builder.addTexture(this.shadowMap.texture.view, this.shadowMap.texture.sampler);
        this.lightBindGroup = await builder.build();

        builder.setLayout(this.materialGroupLayout);
        builder.addTexture(this.woodAlbedoTexture.view, this.woodAlbedoTexture.sampler);
        builder.addTexture(this.woodORMTexture.view, this.woodORMTexture.sampler);
        builder.addTexture(this.woodNormalTexture.view, this.woodNormalTexture.sampler);
        builder.addTexture(this.sky.cubemap.view, this.sky.cubemap.sampler);
        this.materialBindGroup = await builder.build();
    }

    setupMatrices(renderables: RenderData) {
        //make transforms
        this.projectionMatrix = mat4.create();
        mat4.perspective(this.projectionMatrix, Deg2Rad(60), this.canvas.width/this.canvas.height, 0.1, 3000);

        this.viewMatrix = renderables.view_transform;

        this.invViewMatrix = mat4.create();
        mat4.invert(this.invViewMatrix, this.viewMatrix);

        this.viewProjectionMatrix = mat4.create();
        mat4.multiply(this.viewProjectionMatrix, this.projectionMatrix, this.viewMatrix);

        const modelMatrix = mat4.create();
        mat4.fromScaling(modelMatrix, vec3.fromValues(1000, 1000, 1000));
        this.skyMatrix = mat4.create();
        mat4.multiply(this.skyMatrix, this.viewProjectionMatrix, modelMatrix);
    }

    drawShadowMaps(commandEncoder: GPUCommandEncoder) {
        this.shadowMap.writeBuffer(this.device, this.light.lightViewProjectionMatrix);

        const renderpass : GPURenderPassEncoder = commandEncoder.beginRenderPass({
            colorAttachments: [],
            depthStencilAttachment: {
                view: this.shadowMap.texture.view,
                depthClearValue: 1.0,
                depthLoadOp: "clear",
                depthStoreOp: "store"
            }
        });

        renderpass.setPipeline(this.shadowMap.pipeline);
        renderpass.setBindGroup(0, this.shadowMap.bindGroup);

        renderpass.setVertexBuffer(0, this.statueMesh.buffer);
        renderpass.draw(this.statueMesh.vertexCount, 1, 0, 0);

        renderpass.end();
    }

    prepareScene(renderables: RenderData, camera: Camera) {
        this.sky.writeBuffer(this.device, this.skyMatrix);

        this.device.queue.writeBuffer(
            this.objectBuffer, 0, 
            new Float32Array(renderables.model_transforms), 0, 
            renderables.model_transforms.length
        );

        this.device.queue.writeBuffer(this.dataBuffer, 0, new Float32Array(this.viewMatrix));
        this.device.queue.writeBuffer(this.dataBuffer, 64, new Float32Array(this.invViewMatrix)); 
        this.device.queue.writeBuffer(this.dataBuffer, 128, new Float32Array(this.projectionMatrix));
        this.device.queue.writeBuffer(this.dataBuffer, 192, new Float32Array(this.viewProjectionMatrix));
        this.device.queue.writeBuffer(this.dataBuffer, 256, new Float32Array(this.light.lightViewProjectionMatrix));
        this.device.queue.writeBuffer(this.dataBuffer, 320, new Float32Array(camera.position));

        const lightData = new Float32Array(8);
        lightData.set(this.light.color, 0);
        lightData[3] = this.light.energy;
        lightData.set(this.light.position, 4);
        lightData[7] = this.light.shadowEnabled ? 1.0 : 0.0;
        this.device.queue.writeBuffer(this.light.lightBuffer, 0, lightData);
        
        const materialData = new Float32Array(8);
        materialData.set(this.material3D.color, 0);
        materialData[3] = this.material3D.metallic;
        materialData[4] = this.material3D.specular;
        materialData[5] = this.material3D.roughness;
        this.device.queue.writeBuffer(this.material3D.materialBuffer, 0, materialData);
    }

    drawScene(renderables: RenderData, camera: Camera, commandEncoder: GPUCommandEncoder) {
        this.prepareScene(renderables, camera);

        const textureView : GPUTextureView = this.context.getCurrentTexture().createView();

        //renderpass: holds draw commands, allocated from command encoder
        const renderpass : GPURenderPassEncoder = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: textureView,
                loadOp: "clear",
                storeOp: "store"
            }],
            depthStencilAttachment: this.depthStencilAttachment,
        });

        renderpass.setPipeline(this.sky.pipeline);
        renderpass.setBindGroup(0, this.sky.bindGroup);
        renderpass.setVertexBuffer(0, this.sky.cubeMesh.buffer);
        renderpass.draw(36);
        
        renderpass.setPipeline(this.lightPipeline);
        renderpass.setBindGroup(0, this.lightBindGroup);

        var objects_drawn: number = 0;

        renderpass.setVertexBuffer(0, this.statueMesh.buffer);
        renderpass.setBindGroup(1, this.materialBindGroup);
        renderpass.draw(
            this.statueMesh.vertexCount, 1, 
            0, objects_drawn
        );
        objects_drawn += 1;

        renderpass.setVertexBuffer(0, this.planeMesh.buffer);
        renderpass.setBindGroup(1, this.materialBindGroup);
        renderpass.draw(
            this.planeMesh.vertexCount, 1, 
            0, objects_drawn
        );
        objects_drawn += 1;

        renderpass.end();
    }

    /*async applyPostProcessing(commandEncoder: GPUCommandEncoder) {
        //texture view: image view to the color buffer in this case
        const textureView : GPUTextureView = this.context.getCurrentTexture().createView();
        //renderpass: holds draw commands, allocated from command encoder
        const renderpass : GPURenderPassEncoder = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: textureView,
                loadOp: "clear",
                storeOp: "store"
            }]
        });

        renderpass.setPipeline(this.postProcessing.pipeline);
        renderpass.setBindGroup(0, this.postProcessing.framebuffer.bindGroup);
        renderpass.draw(6, 1, 0, 0);

        renderpass.end();
    }*/

    async render(renderables: RenderData, camera: Camera) {
        //Early exit tests
        if (!this.device || !this.lightPipeline) {
            return;
        }

        //command encoder: records draw commands for submission
        const commandEncoder : GPUCommandEncoder = this.device.createCommandEncoder();

        this.setupMatrices(renderables);

        if (this.light.shadowEnabled) {
            this.drawShadowMaps(commandEncoder);
        }

        this.drawScene(renderables, camera, commandEncoder);

        //this.applyPostProcessing(commandEncoder);
    
        this.device.queue.submit([commandEncoder.finish()]);
    }
}