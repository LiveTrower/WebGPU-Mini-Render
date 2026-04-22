import { Vec3, vec3 } from "wgpu-matrix";

export class Material3D {
    color: Vec3
    metallic: number
    specular: number
    roughness: number

    materialBuffer: GPUBuffer;

    private metallicSlider: HTMLInputElement | null;
    private metallicValue: HTMLElement | null;
    private specularSlider: HTMLInputElement | null;
    private specularValue: HTMLElement | null;
    private roughnessSlider: HTMLInputElement | null;
    private roughnessValue: HTMLElement | null;
    private colorPicker: HTMLInputElement | null;

    constructor(device: GPUDevice) {
        this.color = vec3.create(1.0, 1.0, 1.0);
        this.metallic = 0.0;
        this.specular = 0.5;
        this.roughness = 1.0;

        this.materialBuffer = device.createBuffer({
            label: "material_buffer",
            size: 16 * 2,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.metallicSlider = document.getElementById('material-metallic') as HTMLInputElement;
        this.metallicValue = document.getElementById('material-metallic-value');
        this.specularSlider = document.getElementById('material-specular') as HTMLInputElement;
        this.specularValue = document.getElementById('material-specular-value');
        this.roughnessSlider = document.getElementById('material-roughness') as HTMLInputElement;
        this.roughnessValue = document.getElementById('material-roughness-value');
        this.colorPicker = document.getElementById('material-color') as HTMLInputElement;

        this.setupSliderListeners();
        this.setupColorPickerListener();
    }

    private setupSliderListeners(): void {
        if (this.metallicSlider) {
            this.metallicSlider.addEventListener('input', (e: Event) => {
                const target = e.target as HTMLInputElement;
                this.metallic = parseFloat(target.value);
                if (this.metallicValue) {
                    this.metallicValue.textContent = this.metallic.toFixed(2);
                }
            });
        }

        if (this.specularSlider) {
            this.specularSlider.addEventListener('input', (e: Event) => {
                const target = e.target as HTMLInputElement;
                this.specular = parseFloat(target.value);
                if (this.specularValue) {
                    this.specularValue.textContent = this.specular.toFixed(2);
                }
            });
        }

        if (this.roughnessSlider) {
            this.roughnessSlider.addEventListener('input', (e: Event) => {
                const target = e.target as HTMLInputElement;
                this.roughness = parseFloat(target.value);
                if (this.roughnessValue) {
                    this.roughnessValue.textContent = this.roughness.toFixed(2);
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
                
                this.color = vec3.create(r, g, b);
            });
        }
    }
}
