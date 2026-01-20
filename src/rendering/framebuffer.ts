import { Texture } from "../resources/texture";
import { vec2 } from "gl-matrix";
import { BindGroupLayoutBuilder } from "./bind_group_layout";
import { BindGroupBuilder } from "./bind_group";

export class Framebuffer {
    texture: Texture;
    bindGroupLayout: GPUBindGroupLayout;
    bindGroup: GPUBindGroup;

    async initialize(device: GPUDevice, textureDescriptor: GPUTextureDescriptor, samplerDescriptor: GPUSamplerDescriptor, viewDescriptor: GPUTextureViewDescriptor) {
        this.texture = new Texture();
        this.texture.createCustomTexture(device, textureDescriptor, viewDescriptor, samplerDescriptor);

        const builderLayout = new BindGroupLayoutBuilder(device);
        builderLayout.addTexture(GPUShaderStage.FRAGMENT, "2d");
        this.bindGroupLayout = await builderLayout.build();

        const builder = new BindGroupBuilder(device);
        builder.setLayout(this.bindGroupLayout);
        builder.addTexture(this.texture.view, this.texture.sampler);
        this.bindGroup = await builder.build();
    }
}