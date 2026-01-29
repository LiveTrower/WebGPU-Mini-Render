import { Texture } from "../resources/texture";

export class FrameBuffers {
    canvasFormat: GPUTextureFormat;
    canvasHeight: number;
    canvasWidth: number;

    colorBuffer: Texture;
    colorFormat: GPUTextureFormat;

    tonemapBuffer: Texture;

    depthBuffer: Texture;
    depthFormat: GPUTextureFormat;
    depthStencilState: GPUDepthStencilState;
    depthStencilAttachment: GPURenderPassDepthStencilAttachment;

    async setCanvas(height: number, width: number, format: GPUTextureFormat) {
        this.canvasFormat = format;
        this.canvasHeight = height;
        this.canvasWidth = width;
    }

    async setupColorBuffer(device: GPUDevice) {
        this.colorBuffer = new Texture();
        this.colorFormat = "rgba16float";

        const textureDescriptor: GPUTextureDescriptor = {
            size: {
                width: this.canvasWidth,
                height: this.canvasHeight,
            },
            mipLevelCount: 1,
            format: this.colorFormat,
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
        };

        const viewColorDescriptor: GPUTextureViewDescriptor = {
            format: this.colorFormat,
            dimension: "2d",
            aspect: "all",
            baseMipLevel: 0,
            mipLevelCount: 1,
            baseArrayLayer: 0,
            arrayLayerCount: 1
        };

        const samplerDescriptor: GPUSamplerDescriptor = {
            addressModeU: "repeat",
            addressModeV: "repeat",
            magFilter: "linear",
            minFilter: "linear",
            mipmapFilter: "linear",
            maxAnisotropy: 1
        };

        this.colorBuffer.createCustomTexture(device, textureDescriptor, viewColorDescriptor, samplerDescriptor);
    }

    async setupDepthBuffer(device: GPUDevice) {
        this.depthBuffer = new Texture();
        this.depthFormat = "depth24plus-stencil8";

        this.depthStencilState = {
            format: this.depthFormat,
            depthWriteEnabled: true,
            depthCompare: "less-equal",
        };

        const size: GPUExtent3D = {
            width: this.canvasWidth,
            height: this.canvasHeight,
            depthOrArrayLayers: 1
        };
        const depthBufferDescriptor: GPUTextureDescriptor = {
            size: size,
            format: this.depthFormat,
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        }

        const viewDepthDescriptor: GPUTextureViewDescriptor = {
            format: this.depthFormat,
            dimension: "2d",
            aspect: "all"
        };

        this.depthBuffer.createCustomTexture(device, depthBufferDescriptor, viewDepthDescriptor);
        
        this.depthStencilAttachment = {
            view: this.depthBuffer.view,
            depthClearValue: 1.0,
            depthLoadOp: "clear",
            depthStoreOp: "store",
            stencilClearValue: 0,
            stencilLoadOp: "clear",
            stencilStoreOp: "store"
        };
    }

    async setupTonemapBuffer(device: GPUDevice) {
        this.tonemapBuffer = new Texture();

        const textureDescriptor: GPUTextureDescriptor = {
            size: {
                width: this.canvasWidth,
                height: this.canvasHeight,
            },
            mipLevelCount: 1,
            format: this.colorFormat,
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
        };

        const viewColorDescriptor: GPUTextureViewDescriptor = {
            format: this.colorFormat,
            dimension: "2d",
            aspect: "all",
            baseMipLevel: 0,
            mipLevelCount: 1,
            baseArrayLayer: 0,
            arrayLayerCount: 1
        };

        const samplerDescriptor: GPUSamplerDescriptor = {
            addressModeU: "repeat",
            addressModeV: "repeat",
            magFilter: "linear",
            minFilter: "linear",
            mipmapFilter: "linear",
            maxAnisotropy: 1
        };

        this.tonemapBuffer.createCustomTexture(device, textureDescriptor, viewColorDescriptor, samplerDescriptor);
    }
}