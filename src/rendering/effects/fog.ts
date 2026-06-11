import type { Vec3 } from "wgpu-matrix";

export class Fog {
	fogBuffer: GPUBuffer;
	pipeline: GPURenderPipeline;
	bindGroupLayout: GPUBindGroupLayout;
	bindGroup: GPUBindGroup;

	async initialize(device: GPUDevice) {
		const parameterBufferDescriptor: GPUBufferDescriptor = {
			label: "fog_buffer",
			size: 56,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		};
		this.fogBuffer = device.createBuffer(parameterBufferDescriptor);
	}

	writeBuffer(
		device: GPUDevice,
		fogEnabled: boolean,
		fogColor: Vec3,
		fogDensity: number,
		fogDepth: boolean,
		fogNear: number,
		fogFar: number,
	) {
		const fogDataFloat = new Float32Array(4);
		fogDataFloat[0] = fogColor[0];
		fogDataFloat[1] = fogColor[1];
		fogDataFloat[2] = fogColor[2];
		fogDataFloat[3] = fogDensity;
		device.queue.writeBuffer(this.fogBuffer, 0, fogDataFloat);

		const fogDataUint1 = new Uint32Array(1);
		fogDataUint1[0] = fogEnabled ? 1 : 0;
		device.queue.writeBuffer(this.fogBuffer, 16, fogDataUint1);

		const fogDataNearFar = new Float32Array(2);
		fogDataNearFar[0] = fogNear;
		fogDataNearFar[1] = fogFar;
		device.queue.writeBuffer(this.fogBuffer, 20, fogDataNearFar);

		const fogDataUint2 = new Uint32Array(1);
		fogDataUint2[0] = fogDepth ? 1 : 0;
		device.queue.writeBuffer(this.fogBuffer, 28, fogDataUint2);
	}
}
