import { Camera3D } from "../control/camera3d";
import { vec3 } from "wgpu-matrix";
import { object_types, type RenderData } from "./definitions";
import { Statue } from "./statue";

export class Scene {
	statues: Statue[];
	suzanne: Statue;
	plane: Statue;
	player: Camera3D;
	objectData: Float32Array;

	constructor(canvas: HTMLCanvasElement) {
		this.statues = [];
		this.objectData = new Float32Array(16 * 1024);

		this.add_statue(
			new Statue("Suzanne", vec3.create(0, 0, 1), vec3.create(0, 0, 0), false),
		);
		this.add_statue(
			new Statue("Plane", vec3.create(0, 0, 0), vec3.create(0, 0, 0), false),
		);

		this.player = new Camera3D(
			vec3.create(-3, 0, 1.0),
			0,
			0,
			canvas.height,
			canvas.width,
		);
	}

	add_statue(statue: Statue) {
		this.statues.push(statue);
	}

	update() {
		var i: number = 0;

		this.statues.forEach((statue) => {
			statue.update();
			var model = statue.get_model();
			for (var j: number = 0; j < 16; j++) {
				this.objectData[16 * i + j] = <number>model[j];
			}
			i++;
		});

		this.player.update();
	}

	get_player(): Camera3D {
		return this.player;
	}

	get_renderables(): RenderData {
		return {
			view_transform: this.player.get_view(),
			model_transforms: this.objectData,
			object_counts: {
				[object_types.TRIANGLE]: 0,
				[object_types.QUAD]: 0,
			},
		};
	}

	spin_player(dX: number, dY: number) {
		this.player.eulers[2] -= dX;
		this.player.eulers[2] %= 360;

		this.player.eulers[1] = Math.min(
			89,
			Math.max(-89, this.player.eulers[1] - dY),
		);
	}

	move_player(forwards_amount: number, right_amount: number) {
		this.player.position = vec3.addScaled(
			this.player.position,
			this.player.forwards,
			forwards_amount,
		);
		this.player.position = vec3.addScaled(
			this.player.position,
			this.player.right,
			right_amount,
		);
	}
}
