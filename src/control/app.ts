import { Renderer } from "../rendering/renderer";
import { Scene } from "../model/scene";
import $ from "jquery";

export class App {
	canvas: HTMLCanvasElement;
	renderer: Renderer;
	scene: Scene;

	mouse: boolean = false;
	forwardsAmount: number;
	rightAmount: number;
	speed: number = 2.0;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;

		this.renderer = new Renderer(canvas);

		this.scene = new Scene(canvas);

		this.forwardsAmount = 0;
		this.rightAmount = 0;

		this.canvas.onclick = () => {
			this.canvas.requestPointerLock();
			this.turn_on_controls();
		};
		document.addEventListener("pointerlockchange", () => {
			if (document.pointerLockElement !== this.canvas) {
				this.turn_off_controls();
			}
		});
		this.canvas.addEventListener("mousemove", (event: MouseEvent) => {
			this.handle_mouse_move(event);
		});
	}

	async InitializeRenderer() {
		await this.renderer.Initialize();
	}

	run = () => {
		var running: boolean = true;

		this.scene.update();
		this.scene.move_player(this.forwardsAmount, this.rightAmount);

		this.renderer.render(this.scene.get_renderables(), this.scene.player);

		if (running) {
			requestAnimationFrame(this.run);
		}
	};

	turn_on_controls() {
		this.mouse = true;
		$(document).on("keydown", (event) => {
			this.handle_keypress(event);
		});
		$(document).on("keyup", (event) => {
			this.handle_keyrelease(event);
		});
	}

	turn_off_controls() {
		this.mouse = false;
		$(document).off("keyup");
		$(document).off("keydown");
	}

	handle_keypress(event: JQuery.KeyDownEvent) {
		if (event.code == "KeyW") {
			this.forwardsAmount = 0.02 * this.speed;
		}
		if (event.code == "KeyS") {
			this.forwardsAmount = -0.02 * this.speed;
		}
		if (event.code == "KeyA") {
			this.rightAmount = -0.02 * this.speed;
		}
		if (event.code == "KeyD") {
			this.rightAmount = 0.02 * this.speed;
		}
	}

	handle_keyrelease(event: JQuery.KeyUpEvent) {
		if (event.code == "KeyW") {
			this.forwardsAmount = 0;
		}
		if (event.code == "KeyS") {
			this.forwardsAmount = 0;
		}
		if (event.code == "KeyA") {
			this.rightAmount = 0;
		}
		if (event.code == "KeyD") {
			this.rightAmount = 0;
		}
	}

	handle_mouse_move(event: MouseEvent) {
		if (this.mouse) {
			this.scene.spin_player(event.movementX / 5, event.movementY / 5);
		}
	}

	minimizeMaximizeCard() {
		// Card minimize/maximize functionality
		document.querySelectorAll(".card-toggle").forEach((button) => {
			button.addEventListener("click", (e: Event) => {
				e.stopPropagation();
				const card = (button as HTMLElement).closest(".card");
				if (card) {
					card.classList.toggle("minimized");
					const isMinimized = card.classList.contains("minimized");
					button.textContent = isMinimized ? "+" : "−";
					(button as HTMLButtonElement).setAttribute(
						"aria-label",
						isMinimized ? "Expand card" : "Minimize card",
					);
				}
			});
		});

		// Also allow clicking on the title to minimize/maximize
		document.querySelectorAll(".card-title").forEach((title) => {
			title.addEventListener("click", (e: Event) => {
				const target = e.target as HTMLElement;
				if (target === title || target.classList.contains("card-title-text")) {
					const button = title.querySelector(
						".card-toggle",
					) as HTMLButtonElement;
					button.click();
				}
			});
		});
	}
}
