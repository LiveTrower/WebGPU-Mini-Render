import { mat4 } from "gl-matrix";

export enum object_types {
    TRIANGLE,
    QUAD
}

export interface RenderData {
    view_transform: mat4;
    model_transforms: Float32Array;
    object_counts: {[obj in object_types]: number}
}

export interface SceneData {
    projectionMatrix: mat4;
    viewMatrix: mat4;
    viewProjectionMatrix: mat4;
    modelViewProjectionMatrix: mat4;
}