import { type Mat4, type Vec3, mat4 } from "wgpu-matrix";
import { Deg2Rad } from "./common_math";

export class Statue {
	name: string;
	position: Vec3;
	eulers: Vec3;
	model!: Mat4;
	animation: boolean;

	constructor(name: string, position: Vec3, eulers: Vec3, animation: boolean) {
		this.name = name;
		this.position = position;
		this.eulers = eulers;
		this.animation = animation;
	}

	update() {
		this.model = mat4.translate(mat4.identity(), this.position);

		if (this.animation) {
			this.eulers[2] += 1;
			this.eulers[2] %= 360;
			this.model = mat4.rotateY(this.model, Deg2Rad(this.eulers[1]));
			this.model = mat4.rotateZ(this.model, Deg2Rad(this.eulers[2]));
		}
	}

	get_model(): Mat4 {
		return this.model;
	}
}
