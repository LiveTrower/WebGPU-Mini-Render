import { Vec3, Vec2, vec3, vec2 } from "wgpu-matrix";

export class ObjMesh {

    buffer!: GPUBuffer
    bufferLayout!: GPUVertexBufferLayout
    v: Vec3[]
    vt: Vec2[]
    vn: Vec3[]
    vertices!: Float32Array
    vertexCount!: number

    constructor() {
        this.v = [];
        this.vt = [];
        this.vn = [];
    }

    async initialize(device: GPUDevice, url: string) {

        // x y z u v nx ny nz tx ty tz btx bty btz
        await this.readFile(url);
        this.vertexCount = this.vertices.length / 14;

        const usage: GPUBufferUsageFlags = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
        //VERTEX: the buffer can be used as a vertex buffer
        //COPY_DST: data can be copied to the buffer

        const descriptor: GPUBufferDescriptor = {
            size: this.vertices.byteLength,
            usage: usage,
            mappedAtCreation: true // similar to HOST_VISIBLE, allows buffer to be written by the CPU
        };
        this.buffer = device.createBuffer(descriptor);

        //Buffer has been created, now load in the vertices
        new Float32Array(this.buffer.getMappedRange()).set(this.vertices);
        this.buffer.unmap();

        //now define the buffer layout
        this.bufferLayout = {
            arrayStride: 56,
            attributes: [
                {
                    shaderLocation: 0,
                    format: "float32x3",
                    offset: 0 // position
                },
                {
                    shaderLocation: 1,
                    format: "float32x2",
                    offset: 12 // uv
                },
                {
                    shaderLocation: 2,
                    format: "float32x3",
                    offset: 20 // normal
                },
                {
                    shaderLocation: 3,
                    format: "float32x3",
                    offset: 32 // tangent
                },
                {
                    shaderLocation: 4,
                    format: "float32x3",
                    offset: 44 // bitangent
                }
            ]
        }

    }

    async readFile(url: string) {

        var result: number[] = [];

        const response: Response = await fetch(url);
        const blob: Blob = await response.blob();
        const file_contents = (await blob.text())
        const lines = file_contents.split("\n");

        lines.forEach(
            (line) => {
                //console.log(line);
                if (line[0] == "v" && line[1] == " ") {
                    this.read_vertex_data(line);
                }
                else if (line[0] == "v" && line[1] == "t") {
                    this.read_texcoord_data(line);
                }
                else if (line[0] == "v" && line[1] == "n") {
                    this.read_normal_data(line);
                }
                else if (line[0] == "f") {
                    this.read_face_data(line, result);
                }
            }
        )

        this.calculateTangentsAndBitangents(result);
        this.vertices = new Float32Array(result);
    }

    read_vertex_data(line: string) {

        const components = line.split(" ");
        // ["v", "x", "y", "z"]
        const new_vertex: Vec3 = vec3.create(
            Number(components[1]).valueOf(),
            Number(components[2]).valueOf(),
            Number(components[3]).valueOf()
        );

        this.v.push(new_vertex);
    }

    read_texcoord_data(line: string) {
        const components = line.split(" ");
        // ["vt", "u", "v"]
        const new_texcoord: Vec2 = vec2.create(
            Number(components[1]).valueOf(),
            Number(components[2]).valueOf()
        );

        this.vt.push(new_texcoord);
    }

    read_normal_data(line: string) {
        const components = line.split(" ");
        // ["vn", "nx", "ny", "nz"]
        const new_normal: Vec3 = vec3.create(
            Number(components[1]).valueOf(),
            Number(components[2]).valueOf(),
            Number(components[3]).valueOf()
        );

        this.vn.push(new_normal);
    }

    read_face_data(line: string, result: number[]) {

        line = line.replace("\n", "");
        const vertex_descriptions = line.split(" ");
        // ["f", "v1", "v2", ...]
        /*
            triangle fan setup, eg.
            v1 v2 v3 v4 => (v1, v2, v3), (v1, v3, v4)

            no. of triangles = no. of vertices - 2
        */

       const triangle_count = vertex_descriptions.length - 3; // accounting also for "f"
       for (var i = 0; i < triangle_count; i++) {
            //corner a
            this.read_corner(vertex_descriptions[1], result);
            this.read_corner(vertex_descriptions[2 + i], result);
            this.read_corner(vertex_descriptions[3 + i], result);
       }
    }

    read_corner(vertex_description: string, result: number[]) {
        const v_vt_vn = vertex_description.split("/");
        const v = this.v[Number(v_vt_vn[0]).valueOf() - 1];
        const vt = this.vt[Number(v_vt_vn[1]).valueOf() - 1];
        const vn = this.vn[Number(v_vt_vn[2]).valueOf() - 1];
        result.push(v[0]);
        result.push(v[1]);
        result.push(v[2]);
        result.push(vt[0]);
        result.push(vt[1]);
        result.push(vn[0]);
        result.push(vn[1]);
        result.push(vn[2]);
    }

    calculateTangentsAndBitangents(result: number[]) {
        const stride = 8;
        const vertexCount = result.length / stride;

        const tangents: Vec3[] = [];
        const bitangents: Vec3[] = [];
        
        for (let i = 0; i < vertexCount; i += 3) {
            const i0 = i * stride;
            const i1 = (i + 1) * stride;
            const i2 = (i + 2) * stride;

            // Positions
            const v0: Vec3 = vec3.create(result[i0], result[i0 + 1], result[i0 + 2]);
            const v1: Vec3 = vec3.create(result[i1], result[i1 + 1], result[i1 + 2]);
            const v2: Vec3 = vec3.create(result[i2], result[i2 + 1], result[i2 + 2]);

            // UVs
            const uv0: Vec2 = vec2.create(result[i0 + 3], result[i0 + 4]);
            const uv1: Vec2 = vec2.create(result[i1 + 3], result[i1 + 4]);
            const uv2: Vec2 = vec2.create(result[i2 + 3], result[i2 + 4]);

            const deltaPos1 = vec3.subtract(v1, v0);
            const deltaPos2 = vec3.subtract(v2, v0);

            const deltaUV1 = vec2.subtract(uv1, uv0);
            const deltaUV2 = vec2.subtract(uv2, uv0);

            const denom = deltaUV1[0] * deltaUV2[1] - deltaUV1[1] * deltaUV2[0];
            const r = denom !== 0 ? 1.0 / denom : 0;
            
            const tangent: Vec3 = vec3.create(
                r * (deltaUV2[1] * deltaPos1[0] - deltaUV1[1] * deltaPos2[0]),
                r * (deltaUV2[1] * deltaPos1[1] - deltaUV1[1] * deltaPos2[1]),
                r * (deltaUV2[1] * deltaPos1[2] - deltaUV1[1] * deltaPos2[2])
            );

            const bitangent: Vec3 = vec3.create(
                r * (-deltaUV2[0] * deltaPos1[0] + deltaUV1[0] * deltaPos2[0]),
                r * (-deltaUV2[0] * deltaPos1[1] + deltaUV1[0] * deltaPos2[1]),
                r * (-deltaUV2[0] * deltaPos1[2] + deltaUV1[0] * deltaPos2[2])
            );

            const normalizedTangent = vec3.normalize(tangent);
            const normalizedBitangent = vec3.normalize(bitangent);

            for (let j = 0; j < 3; j++) {
                const idx = (i + j) * stride;
                
                const normal: Vec3 = vec3.create(result[idx + 5], result[idx + 6], result[idx + 7]);
                const dot = vec3.dot(normal, normalizedTangent);
                const t = vec3.normalize(vec3.subtract(normalizedTangent, vec3.scale(normal, dot)));
                const b = vec3.cross(normal, t);

                tangents.push(t as Vec3);
                bitangents.push(b as Vec3);
            }
        }

        const newResult: number[] = [];
        
        for (let i = 0; i < vertexCount; i++) {
            const oldIdx = i * stride;
            
            // Copy position, uv, normal
            for (let j = 0; j < 8; j++) {
                newResult.push(result[oldIdx + j]);
            }
            
            newResult.push(tangents[i][0], tangents[i][1], tangents[i][2]);

            newResult.push(bitangents[i][0], bitangents[i][1], bitangents[i][2]);
        }

        result.length = 0;
        for (let i = 0; i < newResult.length; i++) {
            result.push(newResult[i]);
        }
    }
}