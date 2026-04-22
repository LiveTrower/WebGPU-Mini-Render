import { Mat4 } from "wgpu-matrix";

export enum object_types {
    TRIANGLE,
    QUAD
}

export interface RenderData {
    view_transform: Mat4;
    model_transforms: Float32Array;
    object_counts: {[obj in object_types]: number}
}

export interface SceneData {
    projectionMatrix: Mat4;
    viewMatrix: Mat4;
    viewProjectionMatrix: Mat4;
    modelViewProjectionMatrix: Mat4;
}