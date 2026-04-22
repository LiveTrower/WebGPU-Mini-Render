export class Texture {
    texture: GPUTexture
    view: GPUTextureView
    sampler: GPUSampler

    async createTexture(device: GPUDevice, name: string, width: number, height: number, mipCount: number) {
        const textureDescriptor: GPUTextureDescriptor = {
            size: {
                width: width,
                height: height
            },
            mipLevelCount: mipCount,
            format: "rgba8unorm",
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
        };

        this.texture = device.createTexture(textureDescriptor);

        for (var i = 0; i < mipCount; i += 1) {
            const filename: string = "src/assets/" + name + String(i) + ".png";
            const response: Response = await fetch(filename);
            const blob: Blob = await response.blob();
            const imageData: ImageBitmap = await createImageBitmap(blob);
            await this.loadImageBitmap(device, imageData, i);
            imageData.close();
        }

        const viewDescriptor: GPUTextureViewDescriptor = {
            format: "rgba8unorm",
            dimension: "2d",
            aspect: "all",
            baseMipLevel: 0,
            mipLevelCount: mipCount,
            baseArrayLayer: 0,
            arrayLayerCount: 1
        };
        this.view = this.texture.createView(viewDescriptor);

        const samplerDescriptor: GPUSamplerDescriptor = {
            addressModeU: "repeat",
            addressModeV: "repeat",
            magFilter: "linear",
            minFilter: "linear",
            mipmapFilter: "linear",
            maxAnisotropy: 8
        };
        this.sampler = device.createSampler(samplerDescriptor);
    }

    createDepthTexture(device: GPUDevice, width: number, height: number, format: GPUTextureFormat) {
        const textureDescriptor: GPUTextureDescriptor = {
            size: {
                width: width,
                height: height
            },
            format: format,
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
        };

        const samplerDescriptor: GPUSamplerDescriptor = {
            compare: "greater"
        };

        this.texture = device.createTexture(textureDescriptor);
        this.view = this.texture.createView();
        this.sampler = device.createSampler(samplerDescriptor);
    }

    createCustomTexture(device: GPUDevice,
        textureDescriptor: GPUTextureDescriptor,
        viewDescriptor?: GPUTextureViewDescriptor,
        samplerDescriptor?: GPUSamplerDescriptor) {
        this.texture = device.createTexture(textureDescriptor);
        
        if (viewDescriptor) {
            this.view = this.texture.createView(viewDescriptor);
        } else {
            this.view = this.texture.createView();
        }

        if (samplerDescriptor)
            this.sampler = device.createSampler(samplerDescriptor);
    }

    async loadImageBitmap(device: GPUDevice, imageData: ImageBitmap, mipLevel: number) {
        device.queue.copyExternalImageToTexture(
            {source: imageData},
            {
                texture: this.texture,
                mipLevel: mipLevel
            },
            {   
                width: imageData.width,
                height: imageData.height
            }
        );
    }
}