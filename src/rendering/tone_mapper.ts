import tonemap from "./shaders/tonemap.wgsl";
import { Texture } from "../resources/texture";
import { RenderPipelineBuilder } from "./pipeline";
import { BindGroupLayoutBuilder } from "./bind_group_layout";
import { BindGroupBuilder } from "./bind_group";

export class ToneMapper {
    pipeline: GPURenderPipeline;
    bindGroupLayout: GPUBindGroupLayout;
    bindGroup: GPUBindGroup;

    async makeBindGroupsLayout(builder: BindGroupLayoutBuilder) {
        builder.addTexture(GPUShaderStage.FRAGMENT, "2d");
        this.bindGroupLayout = await builder.build();
    }

    async makeBindGroups(builder: BindGroupBuilder, colorFramebuffer: Texture) {
        builder.setLayout(this.bindGroupLayout);
        builder.addTexture(colorFramebuffer.view, colorFramebuffer.sampler);
        this.bindGroup = await builder.build();
    }
    
    async makePipeline(builder: RenderPipelineBuilder, format: GPUTextureFormat) {
        builder.addBindGroupLayout(this.bindGroupLayout);
        builder.setSourceCode(tonemap, "fs");
        builder.addColorFormat(format);
        builder.setCullMode("front");
        //builder.setMSAASamples(4);
        this.pipeline = await builder.buildRenderPipeline();
    }
}