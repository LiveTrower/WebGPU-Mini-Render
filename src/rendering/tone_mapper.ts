import post from "./shaders/tonemap.wgsl";
import { Texture } from "../resources/texture";
import { RenderPipelineBuilder } from "./pipeline";
import { BindGroupLayoutBuilder } from "./bind_group_layout";
import { BindGroupBuilder } from "./bind_group";

export class ToneMapper {
    framebuffer: Texture;
    width: number;
    height: number;
    buffer: GPUBuffer;
    format: GPUTextureFormat;
    pipeline: GPURenderPipeline;
    bindGroupLayout: GPUBindGroupLayout;
    bindGroup: GPUBindGroup;

    async initialize(device: GPUDevice, canvas: HTMLCanvasElement, format: GPUTextureFormat) {
        this.framebuffer = new Texture();

        this.width = canvas.width;
        this.height = canvas.height;

        const textureDescriptor: GPUTextureDescriptor = {
            size: {
                width: this.width,
                height: this.height,
            },
            mipLevelCount: 1,
            format: "rgba16float",
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
        };

        const samplerDescriptor: GPUSamplerDescriptor = {
            addressModeU: "repeat",
            addressModeV: "repeat",
            magFilter: "linear",
            minFilter: "linear",
            mipmapFilter: "linear",
            maxAnisotropy: 1
        };

        const viewDescriptor: GPUTextureViewDescriptor = {
            format: "rgba16float",
            dimension: "2d",
            aspect: "all",
            baseMipLevel: 0,
            mipLevelCount: 1,
            baseArrayLayer: 0,
            arrayLayerCount: 1
        };

        this.framebuffer.createCustomTexture(device, textureDescriptor, viewDescriptor, samplerDescriptor);
        this.format = format;

        const tonemapBufferDescriptor: GPUBufferDescriptor = {
            label: "tonemap_buffer",
            size: 8,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        };

        this.buffer = device.createBuffer(tonemapBufferDescriptor);
    }

    async makeBindGroupsLayout(builder: BindGroupLayoutBuilder) {
        builder.addBuffer(GPUShaderStage.FRAGMENT, "uniform");
        builder.addTexture(GPUShaderStage.FRAGMENT, "2d");
        this.bindGroupLayout = await builder.build();
    }

    async makeBindGroups(builder: BindGroupBuilder) {
        builder.setLayout(this.bindGroupLayout);
        builder.addBuffer(this.buffer);
        builder.addTexture(this.framebuffer.view, this.framebuffer.sampler);
        this.bindGroup = await builder.build();
    }
    
    async makePipeline(builder: RenderPipelineBuilder) {
        builder.addBindGroupLayout(this.bindGroupLayout);
        builder.setSourceCode(post, "fs");
        builder.addColorFormat(this.format);
        builder.setCullMode("front");
        this.pipeline = await builder.buildRenderPipeline();
    }

    writeBuffer(device: GPUDevice) {
        const tonemapData = new Float32Array(2);
        tonemapData[0] = 1.0 / this.width;
        tonemapData[1] = 1.0 / this.height;
        device.queue.writeBuffer(this.buffer, 0, tonemapData);
    }
}