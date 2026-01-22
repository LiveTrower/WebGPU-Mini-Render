import sky_shader from "./shaders/sky_shader.wgsl";
import { mat4 } from "gl-matrix";
import { CubeMapTexture } from "../resources/cube_texture";
import { CubeMesh } from "../resources/cube_mesh";
import { RenderPipelineBuilder } from "./pipeline";
import { BindGroupLayoutBuilder } from "./bind_group_layout";
import { BindGroupBuilder } from "./bind_group";

export class Sky {
    texture: GPUTexture;
    buffer: GPUBuffer;
    pipeline: GPURenderPipeline;
    format: GPUTextureFormat;
    cubemap: CubeMapTexture;
    cubeMesh: CubeMesh;
    bindGroupLayout: GPUBindGroupLayout;
    bindGroup: GPUBindGroup;

    async initialize(device: GPUDevice, format: GPUTextureFormat) {
        const parameterBufferDescriptor: GPUBufferDescriptor = {
            label: "sky_buffer",
            size: 64,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        };
        this.buffer = device.createBuffer(parameterBufferDescriptor);

        this.cubemap = new CubeMapTexture();
        await this.cubemap.initialize(device, "cubemap_roughness/", 1024, 1024, 7);

        this.format = format;
        this.cubeMesh = new CubeMesh(device);
    }

    async makeBindGroupsLayout(builder: BindGroupLayoutBuilder) {
        builder.addBuffer(GPUShaderStage.VERTEX, "uniform");
        builder.addTexture(GPUShaderStage.FRAGMENT, "cube");
        this.bindGroupLayout = await builder.build();
    }

    async makeBindGroups(builder: BindGroupBuilder) {
        builder.setLayout(this.bindGroupLayout);
        builder.addBuffer(this.buffer);
        builder.addTexture(this.cubemap.view, this.cubemap.sampler);
        this.bindGroup = await builder.build();
    }

    async makePipeline(builder: RenderPipelineBuilder, depthStencil: GPUDepthStencilState) {
        builder.addBindGroupLayout(this.bindGroupLayout);
        builder.addVertexBufferDescription(this.cubeMesh.bufferLayout);
        builder.setSourceCode(sky_shader, "fs");
        builder.addColorFormat(this.format);
        builder.setDepthStencilState(depthStencil);
        builder.setCullMode("none");
        this.pipeline = await builder.buildRenderPipeline();
    }

    writeBuffer(device: GPUDevice, modelViewProjectionMatrix: mat4) {
        device.queue.writeBuffer(this.buffer, 0, new Float32Array(modelViewProjectionMatrix));
    }
}