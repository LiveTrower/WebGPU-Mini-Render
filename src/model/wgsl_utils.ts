export class WGSLUtils {
	static async loadShader(name: string): Promise<string> {
		return this.loadShaderModule(name);
	}

	private static async loadShaderModule(name: string): Promise<string> {
		const basePath = "src/rendering/shaders";
		const modulePath = `${basePath}/${name}.wgsl`;

		try {
			const response = await fetch(modulePath);
			if (!response.ok) {
				throw new Error(`Shader not found: ${modulePath}`);
			}
			const moduleSource = await response.text();
			let moduleString = "";

			const lines = moduleSource.split("\n");
			const firstLine = lines[0];

			if (firstLine.startsWith("//!include")) {
				const includes = firstLine.split(/\s+/).slice(1);
				for (const include of includes) {
					moduleString += await this.loadShaderModule(include);
				}
			}

			moduleString += moduleSource;
			return moduleString;
		} catch (error) {
			throw new Error(`Failed to load shader: ${name}. ${error}`);
		}
	}
}
