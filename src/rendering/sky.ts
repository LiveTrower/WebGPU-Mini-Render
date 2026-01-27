import sky_shader from "./shaders/sky_shader.wgsl";
import { Camera3D } from "../control/camera3d";
import { CubeMapTexture } from "../resources/cube_texture";
import { RenderPipelineBuilder } from "./pipeline";
import { BindGroupLayoutBuilder } from "./bind_group_layout";
import { BindGroupBuilder } from "./bind_group";

export class Sky {
    buffer: GPUBuffer;
    pipeline: GPURenderPipeline;
    cubemap: CubeMapTexture;
    bindGroupLayout: GPUBindGroupLayout;
    bindGroup: GPUBindGroup;

    async initialize(device: GPUDevice) {
        const parameterBufferDescriptor: GPUBufferDescriptor = {
            label: "sky_buffer",
            size: 48,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        };
        this.buffer = device.createBuffer(parameterBufferDescriptor);

        this.cubemap = new CubeMapTexture();
        await this.cubemap.initialize(device, "cubemap_roughness/", 1024, 1024, 7);
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

    async makePipeline(builder: RenderPipelineBuilder, format: GPUTextureFormat, depthStencil: GPUDepthStencilState) {
        builder.addBindGroupLayout(this.bindGroupLayout);
        builder.setSourceCode(sky_shader, "fs");
        builder.addColorFormat(format);
        builder.setDepthStencilState(depthStencil);
        builder.setCullMode("front");
        this.pipeline = await builder.buildRenderPipeline();
    }

    writeBuffer(device: GPUDevice, camera: Camera3D, height: number, width: number) {
        const dy = Math.tan(Math.PI/8);
        const dx = dy * width / height;

        device.queue.writeBuffer(
            this.buffer, 0,
            new Float32Array(
                [
                    camera.forwards[0],
                    camera.forwards[1],
                    camera.forwards[2],
                    0.0,
                    dx * camera.right[0],
                    dx * camera.right[1],
                    dx * camera.right[2],
                    0.0,
                    dy * camera.up[0],
                    dy * camera.up[1],
                    dy * camera.up[2],
                    0.0
                ]
            ), 0, 12
        )
    }
}