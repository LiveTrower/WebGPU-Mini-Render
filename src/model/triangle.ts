import { type Mat4, type Vec3, vec3, mat4 } from "wgpu-matrix";
import { Deg2Rad } from "./common_math";

export class Triangle {
	position: Vec3;
	eulers: Vec3;
	model!: Mat4;

	constructor(position: Vec3, theta: number) {
		this.position = position;
		this.eulers = vec3.create();
		this.eulers[2] = theta;
	}

	update() {
		this.eulers[2] += 1;
		this.eulers[2] %= 360;

		this.model = mat4.translate(mat4.identity(), this.position);
		this.model = mat4.rotateZ(this.model, Deg2Rad(this.eulers[2]));
	}

	get_model(): Mat4 {
		return this.model;
	}
}
