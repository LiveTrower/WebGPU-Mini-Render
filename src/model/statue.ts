import { vec3, mat4 } from "gl-matrix";
import { Deg2Rad } from "./common_math";

export class Statue {

    name: String;
    position: vec3;
    eulers: vec3;
    model!: mat4;
    animation: boolean;

    constructor(name: String, position: vec3, eulers: vec3, animation: boolean) {
        this.name = name;
        this.position = position;
        this.eulers = eulers;
        this.animation = animation;
    }

    update() {
        this.model = mat4.create();
        mat4.translate(this.model, this.model, this.position);

        if (this.animation) {
            this.eulers[2] += 1;
            this.eulers[2] %= 360;
            mat4.rotateY(this.model, this.model, Deg2Rad(this.eulers[1]));
            mat4.rotateZ(this.model, this.model, Deg2Rad(this.eulers[2]));
        }
    }

    get_model(): mat4 {
        return this.model;
    }
}