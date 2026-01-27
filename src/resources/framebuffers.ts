import { Texture } from "../resources/texture";

export class FrameBuffers {
    canvasFormat: GPUTextureFormat;

    colorBuffer: Texture;
    colorFormat: GPUTextureFormat;

    depthBuffer: Texture;
    depthFormat: GPUTextureFormat;
    depthStencilState: GPUDepthStencilState;
    depthStencilAttachment: GPURenderPassDepthStencilAttachment;

    colorMSAABuffer: Texture;

    async setupColorBuffer(device: GPUDevice, canvas: HTMLCanvasElement) {
        this.colorBuffer = new Texture();
        this.colorFormat = "rgba16float";

        const textureDescriptor: GPUTextureDescriptor = {
            size: {
                width: canvas.width,
                height: canvas.height,
            },
            mipLevelCount: 1,
            format: this.colorFormat,
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

        const viewColorDescriptor: GPUTextureViewDescriptor = {
            format: this.colorFormat,
            dimension: "2d",
            aspect: "all",
            baseMipLevel: 0,
            mipLevelCount: 1,
            baseArrayLayer: 0,
            arrayLayerCount: 1
        };

        this.colorBuffer.createCustomTexture(device, textureDescriptor, viewColorDescriptor, samplerDescriptor);
    }

    async setupDepthBuffer(device: GPUDevice, canvas: HTMLCanvasElement) {
        this.depthBuffer = new Texture();
        this.depthFormat = "depth24plus-stencil8";

        this.depthStencilState = {
            format: this.depthFormat,
            depthWriteEnabled: true,
            depthCompare: "less-equal",
        };

        const size: GPUExtent3D = {
            width: canvas.width,
            height: canvas.height,
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

    async setupMSAABuffer(device: GPUDevice, canvas: HTMLCanvasElement, context: GPUCanvasContext) {
        this.colorMSAABuffer = new Texture();
        this.canvasFormat = context.getCurrentTexture().format;

        const textureDescriptor: GPUTextureDescriptor = {
            size: {
                width: canvas.width,
                height: canvas.height,
            },
            format: this.canvasFormat,
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
            sampleCount: 4
        };

        this.colorMSAABuffer.createCustomTexture(device, textureDescriptor);
    }
}