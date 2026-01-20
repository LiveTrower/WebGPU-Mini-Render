import post from "./shaders/post.wgsl";
import { RenderPipelineBuilder } from "./pipeline";
import { BindGroupLayoutBuilder } from "./bind_group_layout";
import { Framebuffer } from "../rendering/framebuffer";

export class PostProcessing {
    framebuffer: Framebuffer;
    buffer: GPUBuffer;
    format: GPUTextureFormat;
    pipeline: GPURenderPipeline;
    bindGroupLayout: GPUBindGroupLayout;

    async initialize(device: GPUDevice, canvas: HTMLCanvasElement, format: GPUTextureFormat) {
        this.framebuffer = new Framebuffer();
        const textureDescriptor: GPUTextureDescriptor = {
            size: {
                width: canvas.width,
                height: canvas.height,
            },
            mipLevelCount: 1,
            format: format,
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
            format: format,
            dimension: "2d",
            aspect: "all",
            baseMipLevel: 0,
            mipLevelCount: 1,
            baseArrayLayer: 0,
            arrayLayerCount: 1
        };
        this.framebuffer.initialize(device, textureDescriptor, samplerDescriptor, viewDescriptor);
        this.format = format;
    }

    async makeBindGroupsLayout(builder: BindGroupLayoutBuilder) {
        builder.addTexture(GPUShaderStage.FRAGMENT, "2d");
        this.bindGroupLayout = await builder.build();
    }
    
    async makePipeline(builder: RenderPipelineBuilder) {
        builder.addBindGroupLayout(this.bindGroupLayout);
        builder.setSourceCode(post, "fs");
        builder.addColorFormat(this.format);
        this.pipeline = await builder.buildRenderPipeline();
    }
}