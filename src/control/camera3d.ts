import { type Mat4, type Vec3, vec3, mat4 } from "wgpu-matrix";
import { Deg2Rad } from "../model/common_math";

export class Camera3D {
	position: Vec3;
	eulers: Vec3;
	view!: Mat4;
	forwards: Vec3;
	right: Vec3;
	up: Vec3;
	fov: number;
	near: number;
	far: number;
	height: number;
	width: number;
	projectionMatrix: Mat4;
	reverseProjectionMatrix: Mat4;
	invViewMatrix: Mat4;
	viewProjectionMatrix: Mat4;

	private fovSlider: HTMLInputElement | null;
	private fovValue: HTMLElement | null;
	private nearSlider: HTMLInputElement | null;
	private nearValue: HTMLElement | null;
	private farSlider: HTMLInputElement | null;
	private farValue: HTMLElement | null;

	constructor(
		position: Vec3,
		theta: number,
		phi: number,
		height: number,
		width: number,
	) {
		this.position = position;
		this.eulers = vec3.create(0, phi, theta);
		this.forwards = vec3.create();
		this.right = vec3.create();
		this.up = vec3.create();

		this.fov = 60;
		this.near = 0.1;
		this.far = 3000;
		this.height = height;
		this.width = width;

		this.projectionMatrix = mat4.perspective(
			Deg2Rad(this.fov),
			width / height,
			this.near,
			this.far,
		);

		const depthRangeRemapMatrix = mat4.identity();
		depthRangeRemapMatrix[10] = -1;
		depthRangeRemapMatrix[14] = 1;
		this.reverseProjectionMatrix = mat4.multiply(
			depthRangeRemapMatrix,
			this.projectionMatrix,
		);

		this.fovSlider = document.getElementById("camera-fov") as HTMLInputElement;
		this.fovValue = document.getElementById("camera-fov-value");
		this.nearSlider = document.getElementById(
			"camera-near",
		) as HTMLInputElement;
		this.nearValue = document.getElementById("camera-near-value");
		this.farSlider = document.getElementById("camera-far") as HTMLInputElement;
		this.farValue = document.getElementById("camera-far-value");

		this.setupSliderListeners();
	}

	private setupSliderListeners(): void {
		if (this.fovSlider) {
			this.fovSlider.addEventListener("input", (e: Event) => {
				const target = e.target as HTMLInputElement;
				this.fov = parseFloat(target.value);
				if (this.fovValue) {
					this.fovValue.textContent = this.fov.toFixed(2);
				}
			});
		}

		if (this.nearSlider) {
			this.nearSlider.addEventListener("input", (e: Event) => {
				const target = e.target as HTMLInputElement;
				this.near = parseFloat(target.value);
				if (this.nearValue) {
					this.nearValue.textContent = this.near.toFixed(3);
				}
			});
		}

		if (this.farSlider) {
			this.farSlider.addEventListener("input", (e: Event) => {
				const target = e.target as HTMLInputElement;
				this.far = parseFloat(target.value);
				if (this.farValue) {
					this.farValue.textContent = this.far.toFixed(2);
				}
			});
		}
	}

	update() {
		this.forwards = vec3.create(0, 0, 0);
		this.forwards[0] =
			Math.cos(Deg2Rad(this.eulers[2])) * Math.cos(Deg2Rad(this.eulers[1]));
		this.forwards[1] =
			Math.sin(Deg2Rad(this.eulers[2])) * Math.cos(Deg2Rad(this.eulers[1]));
		this.forwards[2] = Math.sin(Deg2Rad(this.eulers[1]));

		this.right = vec3.cross(this.forwards, [0, 0, 1]);

		this.up = vec3.cross(this.right, this.forwards);

		var target: Vec3 = vec3.add(this.position, this.forwards);

		this.view = mat4.lookAt(this.position, target, this.up);

		this.projectionMatrix = mat4.perspective(
			Deg2Rad(this.fov),
			this.width / this.height,
			this.near,
			this.far,
		);

		const depthRangeRemapMatrix = mat4.identity();
		depthRangeRemapMatrix[10] = -1;
		depthRangeRemapMatrix[14] = 1;
		this.reverseProjectionMatrix = mat4.multiply(
			depthRangeRemapMatrix,
			this.projectionMatrix,
		);
	}

	get_view(): Mat4 {
		return this.view;
	}
}
