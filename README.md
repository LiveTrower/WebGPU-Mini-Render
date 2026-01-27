# WebGPU Mini Render
This is a personal project aimed at learning WebGPU technology and real-time computer graphics.
If you want to see the project in action, visit the WebGPU Mini Render page at this [link](https://livetrower.github.io/WebGPU-Mini-Render/).

## Render features
These are the graphics features I have implemented so far:
- Classic Forward Rendering
- Physical Based Rendering
- GGX + Disney
- L2 Spherical Harmonics for irradiance map
- Image Based Lighting
- Simple Shadow Maps
- Screen Space Dithering (to avoid banding artifacts)
- ACES Tonemapping

## Building
To run the project locally, follow these steps:
- Install [Node.js](https://nodejs.org/en/)
- Download the project or clone it using: `git clone https://github.com/LiveTrower/WebGPU-Mini-Render.git`
- Run the command: `npm start`
- It will install the remaining dependencies and launch the project locally at: http://127.0.0.1:8080/

## References
https://github.com/webgpu/webgpu-samples

https://github.com/amengede/webgpu-for-beginners

https://webgpufundamentals.org/
