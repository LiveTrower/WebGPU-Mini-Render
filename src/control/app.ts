import { Renderer } from "../rendering/renderer";
import { Scene } from "../model/scene";
import $ from "jquery";

export class App {

    canvas: HTMLCanvasElement;
    renderer: Renderer;
    scene: Scene;

    mouse: boolean = false;
    forwards_amount: number;
    right_amount: number;
    speed: number = 2.0;
    
    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;

        this.renderer = new Renderer(canvas);

        this.scene = new Scene(canvas);

        this.forwards_amount = 0;
        this.right_amount = 0;
        
        this.canvas.onclick = () => {
            this.canvas.requestPointerLock();
            this.turn_on_controls();
        };
        document.addEventListener("pointerlockchange", () => {
            if (document.pointerLockElement !== this.canvas) {
                this.turn_off_controls();
            }
        });
        this.canvas.addEventListener(
            "mousemove",
            (event: MouseEvent) => {this.handle_mouse_move(event);}
        );
    }

    async InitializeRenderer() {
        await this.renderer.Initialize();
    }

    run = () => {

        var running: boolean = true;

        this.scene.update();
        this.scene.move_player(this.forwards_amount, this.right_amount);

        this.renderer.render(
            this.scene.get_renderables(),
            this.scene.player
        );

        if (running) {
            requestAnimationFrame(this.run);
        }
    }

    turn_on_controls() {
        this.mouse = true;
        $(document).on(
            "keydown", 
            (event) => {
                this.handle_keypress(event);
            }
        );
        $(document).on(
            "keyup", 
            (event) => {
                this.handle_keyrelease(event);
            }
        );
    }

    turn_off_controls() {
        this.mouse = false;
        $(document).off("keyup");
        $(document).off("keydown");
    }

    handle_keypress(event: JQuery.KeyDownEvent) {
        if (event.code == "KeyW") {
            this.forwards_amount = 0.02 * this.speed;
        }
        if (event.code == "KeyS") {
            this.forwards_amount = -0.02 * this.speed;
        }
        if (event.code == "KeyA") {
            this.right_amount = -0.02 * this.speed;
        }
        if (event.code == "KeyD") {
            this.right_amount = 0.02 * this.speed;
        }
    }

    handle_keyrelease(event: JQuery.KeyUpEvent) {
        if (event.code == "KeyW") {
            this.forwards_amount = 0;
        }
        if (event.code == "KeyS") {
            this.forwards_amount = 0;
        }
        if (event.code == "KeyA") {
            this.right_amount = 0;
        }
        if (event.code == "KeyD") {
            this.right_amount = 0;
        }

    }

    handle_mouse_move(event: MouseEvent) {
        if (this.mouse) {
            this.scene.spin_player(
                event.movementX / 5, event.movementY / 5
            );
        }
    }

}