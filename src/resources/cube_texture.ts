export class CubeMapTexture {
    
    texture: GPUTexture
    view: GPUTextureView
    sampler: GPUSampler

    async initialize(device: GPUDevice, dir: string, width: number, height: number, mipCount: number) {
        const faceNames = [
            "nz",
            "pz",
            "px",
            "nx",
            "py",
            "ny",
        ]

        const textureDescriptor: GPUTextureDescriptor = {
            dimension: "2d",
            size: {
                width: width,
                height: height,
                depthOrArrayLayers: 6
            },
            mipLevelCount: mipCount,
            format: "rgba8unorm",
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
        };

        this.texture = device.createTexture(textureDescriptor);

        for (var faceIndex = 0; faceIndex < 6; faceIndex += 1) {
            for (var mipLevel = 0; mipLevel < mipCount; mipLevel += 1) {
                const filename: string = "dist/img/" + dir + String(mipLevel) + "_" + faceNames[faceIndex] + ".png"
                const response: Response = await fetch(filename);
                const blob: Blob = await response.blob();
                const imageData: ImageBitmap = await createImageBitmap(blob);
                await this.loadImageBitmap(device, imageData, mipLevel, faceIndex);
                imageData.close();
            }
        }

        const viewDescriptor: GPUTextureViewDescriptor = {
            format: "rgba8unorm",
            dimension: "cube",
            aspect: "all",
            baseMipLevel: 0,
            mipLevelCount: mipCount,
            baseArrayLayer: 0,
            arrayLayerCount: 6
        };
        this.view = this.texture.createView(viewDescriptor);

        const samplerDescriptor: GPUSamplerDescriptor = {
            addressModeU: "repeat",
            addressModeV: "repeat",
            magFilter: "linear",
            minFilter: "linear",
            mipmapFilter: "linear",
            maxAnisotropy: 1
        };
        this.sampler = device.createSampler(samplerDescriptor);
    }

    async loadImageBitmap(device: GPUDevice, imageData: ImageBitmap, mipLevel: number, faceIndex: number) {

        device.queue.copyExternalImageToTexture(
            {source: imageData},
            {
                texture: this.texture,
                mipLevel: mipLevel,
                origin: [0, 0, faceIndex]
            },
            {
                width: imageData.width,
                height: imageData.height
            }
        );
    }
}