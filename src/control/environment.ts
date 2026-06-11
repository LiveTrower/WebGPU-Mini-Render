import { Vec3, vec3 } from "wgpu-matrix";

export class Environment {
    fogEnabled: boolean;
    fogColor: Vec3;
    fogDensity: number;
    fogSkyEffect: number;
    fogDepth: boolean;
    fogNear: number;
    fogFar: number;

    private fogCheckbox: HTMLInputElement | null;
    private colorPicker: HTMLInputElement | null;
    private fogDensitySlider: HTMLInputElement | null;
    private fogDensityValue: HTMLElement | null;
    private fogSkyEffectSlider: HTMLInputElement | null;
    private fogSkyEffectValue: HTMLElement | null;
    private depthFogCheckbox: HTMLInputElement | null;
    private fogNearSlider: HTMLInputElement | null;
    private fogNearValue: HTMLElement | null;
    private fogFarSlider: HTMLInputElement | null;
    private fogFarValue: HTMLElement | null;

    constructor() {
        this.fogEnabled = true;
        this.fogColor = vec3.create(0.5, 0.5, 0.5);
        this.fogDensity = 0.02;
        this.fogSkyEffect = 0.5;
        this.fogDepth = false;
        this.fogNear = 1.0;
        this.fogFar = 4.0;

        this.fogCheckbox = document.getElementById('fog-checkbox') as HTMLInputElement;
        this.colorPicker = document.getElementById('fog-color') as HTMLInputElement;
        this.fogDensitySlider = document.getElementById('fog-density') as HTMLInputElement;
        this.fogDensityValue = document.getElementById('fog-density-value');
        this.fogSkyEffectSlider = document.getElementById('fog-sky-effect') as HTMLInputElement;
        this.fogSkyEffectValue = document.getElementById('fog-sky-effect-value');
        this.depthFogCheckbox = document.getElementById('depth-fog-checkbox') as HTMLInputElement;
        this.fogNearSlider = document.getElementById('fog-near') as HTMLInputElement;
        this.fogNearValue = document.getElementById('fog-near-value');
        this.fogFarSlider = document.getElementById('fog-far') as HTMLInputElement;
        this.fogFarValue = document.getElementById('fog-far-value');

        this.setupFogListener();
        this.setupColorPickerListener();
        this.setupDensitySliderListeners();
        this.setupSkyEffectSliderListeners();
        this.setupDepthFogListener();
        this.setupFogNearListener();
        this.setupFogFarListener();
    }

    private setupFogListener(): void {
        if (this.fogCheckbox) {
            this.fogCheckbox.addEventListener('change', (e: Event) => {
                const target = e.target as HTMLInputElement;
                this.fogEnabled = target.checked;
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
                
                this.fogColor = vec3.create(r, g, b);
            });
        }
    }

    private setupDensitySliderListeners(): void {
        if (this.fogDensitySlider) {
            this.fogDensitySlider.addEventListener('input', (e: Event) => {
                const target = e.target as HTMLInputElement;
                this.fogDensity = parseFloat(target.value);
                if (this.fogDensityValue) {
                    this.fogDensityValue.textContent = this.fogDensity.toFixed(3);
                }
            });
        }
    }

    private setupSkyEffectSliderListeners(): void {
        if (this.fogSkyEffectSlider) {
            this.fogSkyEffectSlider.addEventListener('input', (e: Event) => {
                const target = e.target as HTMLInputElement;
                this.fogSkyEffect = parseFloat(target.value);
                if (this.fogSkyEffectValue) {
                    this.fogSkyEffectValue.textContent = this.fogSkyEffect.toFixed(3);
                }
            });
        }
    }

    private setupDepthFogListener(): void {
        if (this.depthFogCheckbox) {
            this.depthFogCheckbox.addEventListener('change', (e: Event) => {
                const target = e.target as HTMLInputElement;
                this.fogDepth = target.checked;
                this.updateFogDepthUIVisibility();
            });
        }
        this.updateFogDepthUIVisibility();
    }

    private updateFogDepthUIVisibility(): void {
        const nearContainer = this.fogNearSlider?.closest('.property') as HTMLElement | null;
        const farContainer = this.fogFarSlider?.closest('.property') as HTMLElement | null;
        
        if (nearContainer) {
            nearContainer.style.display = this.fogDepth ? 'block' : 'none';
        }
        if (farContainer) {
            farContainer.style.display = this.fogDepth ? 'block' : 'none';
        }
    }

    private setupFogNearListener(): void {
        if (this.fogNearSlider) {
            this.fogNearSlider.addEventListener('input', (e: Event) => {
                const target = e.target as HTMLInputElement;
                this.fogNear = parseFloat(target.value);
                if (this.fogNearValue) {
                    this.fogNearValue.textContent = this.fogNear.toFixed(3);
                }
            });
        }
    }

    private setupFogFarListener(): void {
        if (this.fogFarSlider) {
            this.fogFarSlider.addEventListener('input', (e: Event) => {
                const target = e.target as HTMLInputElement;
                this.fogFar = parseFloat(target.value);
                if (this.fogFarValue) {
                    this.fogFarValue.textContent = this.fogFar.toFixed(3);
                }
            });
        }
    }
}