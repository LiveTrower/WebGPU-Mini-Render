import { vec3, mat4 } from "gl-matrix";

export class Light3D {
    color: vec3;
    energy: number;
    position: vec3;
    shadowEnabled: boolean;
    lightViewMatrix: mat4;
    lightProjectionMatrix: mat4;
    lightViewProjectionMatrix: mat4;

    lightBuffer: GPUBuffer;

    private colorPicker: HTMLInputElement | null;
    private energySlider: HTMLInputElement | null;
    private energyValue: HTMLElement | null;
    private posXInput: HTMLInputElement | null;
    private posYInput: HTMLInputElement | null;
    private posZInput: HTMLInputElement | null;
    private shadowCheckbox: HTMLInputElement | null;

    constructor(device: GPUDevice) {
        this.color = vec3.fromValues(1.0, 1.0, 1.0);
        this.energy = 2.0;
        this.position = vec3.fromValues(-50, -100, 100);
        this.shadowEnabled = true;
        const upVector = vec3.fromValues(0, 0, 1);
        const origin = vec3.fromValues(0, 0, 0);
        this.lightViewMatrix = mat4.create();
        mat4.lookAt(this.lightViewMatrix, this.position, origin, upVector);
        this.lightProjectionMatrix = mat4.create(); 
        const left = -5;
        const right = 5;
        const bottom = -5;
        const top = 5;
        const near = -200;
        const far = 300;
        mat4.ortho(this.lightProjectionMatrix, left, right, bottom, top, near, far);
        this.lightViewProjectionMatrix = mat4.create();
        mat4.multiply(this.lightViewProjectionMatrix, this.lightProjectionMatrix, this.lightViewMatrix);

        this.lightBuffer = device.createBuffer({
            label: "light_buffer",
            size: 16 * 2,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.colorPicker = document.getElementById('light-color') as HTMLInputElement;
        this.energySlider = document.getElementById('light-energy') as HTMLInputElement;
        this.energyValue = document.getElementById('light-energy-value');
        this.posXInput = document.getElementById('light-pos-x') as HTMLInputElement;
        this.posYInput = document.getElementById('light-pos-y') as HTMLInputElement;
        this.posZInput = document.getElementById('light-pos-z') as HTMLInputElement;

        this.shadowCheckbox = document.getElementById('shadow-checkbox') as HTMLInputElement;

        if (this.posXInput) this.posXInput.value = this.position[0].toString();
        if (this.posYInput) this.posYInput.value = this.position[1].toString();
        if (this.posZInput) this.posZInput.value = this.position[2].toString();

        this.setupColorPickerListener();
        this.setupSliderListeners();
        this.setupPositionListeners();
        this.setupShadowCheckboxListener();
    }

    private setupPositionListeners(): void {
        const updateFromInputs = () => {
            const x = this.posXInput ? parseFloat(this.posXInput.value) : this.position[0];
            const y = this.posYInput ? parseFloat(this.posYInput.value) : this.position[1];
            const z = this.posZInput ? parseFloat(this.posZInput.value) : this.position[2];

            this.position = vec3.fromValues(isNaN(x) ? this.position[0] : x,
                                            isNaN(y) ? this.position[1] : y,
                                            isNaN(z) ? this.position[2] : z);

            this.updateLightMatrices();
        };

        if (this.posXInput) {
            this.posXInput.addEventListener('input', () => updateFromInputs());
        }
        if (this.posYInput) {
            this.posYInput.addEventListener('input', () => updateFromInputs());
        }
        if (this.posZInput) {
            this.posZInput.addEventListener('input', () => updateFromInputs());
        }
    }

    private updateLightMatrices(): void {
        const upVector = vec3.fromValues(0, 0, 1);
        const origin = vec3.fromValues(0, 0, 0);
        mat4.lookAt(this.lightViewMatrix, this.position, origin, upVector);
        mat4.multiply(this.lightViewProjectionMatrix, this.lightProjectionMatrix, this.lightViewMatrix);
    }

    private setupSliderListeners(): void {
        if (this.energySlider) {
            this.energySlider.addEventListener('input', (e: Event) => {
                const target = e.target as HTMLInputElement;
                this.energy = parseFloat(target.value);
                if (this.energyValue) {
                    this.energyValue.textContent = this.energy.toFixed(2);
                }
            });
        }
    }

    private setupColorPickerListener(): void {
        if (this.colorPicker) {
            this.colorPicker.addEventListener('input', (e: Event) => {
                const target = e.target as HTMLInputElement;
                const hexColor = target.value;
                
                const r = parseInt(hexColor.substr(1, 2), 16) / 255.0;
                const g = parseInt(hexColor.substr(3, 2), 16) / 255.0;
                const b = parseInt(hexColor.substr(5, 2), 16) / 255.0;
                
                this.color = vec3.fromValues(r, g, b);
            });
        }
    }

    private setupShadowCheckboxListener(): void {
        if (this.shadowCheckbox) {
            this.shadowCheckbox.addEventListener('change', (e: Event) => {
                const target = e.target as HTMLInputElement;
                this.shadowEnabled = target.checked;
            });
        }
    }
}