// FXAA 3.11 compact, Ported from https://github.com/kosua20/Rendu/blob/master/resources/common/shaders/screens/fxaa.frag
///////////////////////////////////////////////////////////////////////////////////
// MIT License
//
// Copyright (c) 2017 Simon Rodriguez
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
///////////////////////////////////////////////////////////////////////////////////

// Nvidia Original FXAA 3.11 License
//----------------------------------------------------------------------------------
// File:        es3-kepler\FXAA/FXAA3_11.h
// SDK Version: v3.00
// Email:       gameworks@nvidia.com
// Site:        http://developer.nvidia.com/
//
// Copyright (c) 2014-2015, NVIDIA CORPORATION. All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
//  * Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in the
//    documentation and/or other materials provided with the distribution.
//  * Neither the name of NVIDIA CORPORATION nor the names of its
//    contributors may be used to endorse or promote products derived
//    from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS ``AS IS'' AND ANY
// EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
// PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR
// CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
// EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
// PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
// PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
// OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//----------------------------------------------------------------------------------
//
//                    NVIDIA FXAA 3.11 by TIMOTHY LOTTES
//
//----------------------------------------------------------------------------------

struct TonemapData {
    pixel_size: vec2f
};

@binding(0) @group(0) var<uniform> data: TonemapData;

fn QUALITY(q: f32) -> f32 {
	if (q < 5) {
        return 1.0;
    } else if (q > 5) {
        if (q < 10) {
            return 2.0;
        } else if (q < 11) {
            return 4.0;
        } else {
            return 8.0;
        }
    } else {
        return 1.5;
    }
}

fn rgb2luma(rgb: vec3f) -> f32 {
	return sqrt(dot(rgb, vec3(0.299, 0.587, 0.114)));
}

fn do_fxaa(color: vec3f, uv_interp: vec2f) -> vec3f {
	let EDGE_THRESHOLD_MIN = 0.0312;
	let EDGE_THRESHOLD_MAX = 0.125;
	let ITERATIONS = 12;
	let SUBPIXEL_QUALITY = 0.75;

	let lumaUp = rgb2luma(textureSampleLevel(colorTexture, colorSampler, uv_interp, 0.0, vec2i(0, 1)).xyz);
	let lumaDown = rgb2luma(textureSampleLevel(colorTexture, colorSampler, uv_interp, 0.0, vec2i(0, -1)).xyz);
	let lumaLeft = rgb2luma(textureSampleLevel(colorTexture, colorSampler, uv_interp, 0.0, vec2i(-1, 0)).xyz);
	let lumaRight = rgb2luma(textureSampleLevel(colorTexture, colorSampler, uv_interp, 0.0, vec2i(1, 0)).xyz);

	let lumaCenter = rgb2luma(color);

	let lumaMin = min(lumaCenter, min(min(lumaUp, lumaDown), min(lumaLeft, lumaRight)));
	let lumaMax = max(lumaCenter, max(max(lumaUp, lumaDown), max(lumaLeft, lumaRight)));

	let lumaRange = lumaMax - lumaMin;

	if (lumaRange < max(EDGE_THRESHOLD_MIN, lumaMax * EDGE_THRESHOLD_MAX)) {
		return color;
	}

	let lumaDownLeft = rgb2luma(textureSampleLevel(colorTexture, colorSampler, uv_interp, 0.0, vec2i(-1, -1)).xyz);
	let lumaUpRight = rgb2luma(textureSampleLevel(colorTexture, colorSampler, uv_interp, 0.0, vec2i(1, 1)).xyz);
	let lumaUpLeft = rgb2luma(textureSampleLevel(colorTexture, colorSampler, uv_interp, 0.0, vec2i(-1, 1)).xyz);
	let lumaDownRight = rgb2luma(textureSampleLevel(colorTexture, colorSampler, uv_interp, 0.0, vec2i(1, -1)).xyz);

	let lumaDownUp = lumaDown + lumaUp;
	let lumaLeftRight = lumaLeft + lumaRight;

	let lumaLeftCorners = lumaDownLeft + lumaUpLeft;
	let lumaDownCorners = lumaDownLeft + lumaDownRight;
	let lumaRightCorners = lumaDownRight + lumaUpRight;
	let lumaUpCorners = lumaUpRight + lumaUpLeft;

	let edgeHorizontal = abs(-2.0 * lumaLeft + lumaLeftCorners) + abs(-2.0 * lumaCenter + lumaDownUp) * 2.0 + abs(-2.0 * lumaRight + lumaRightCorners);
	let edgeVertical = abs(-2.0 * lumaUp + lumaUpCorners) + abs(-2.0 * lumaCenter + lumaLeftRight) * 2.0 + abs(-2.0 * lumaDown + lumaDownCorners);

	let isHorizontal = (edgeHorizontal >= edgeVertical);

	var stepLength = 0.0;
	var luma1 = 0.0;
	var luma2 = 0.0;
	if (isHorizontal) {
		stepLength = data.pixel_size.y;
		luma1 = lumaDown;
		luma2 = lumaUp;
	} else {
		stepLength = data.pixel_size.x;
		luma1 = lumaLeft;
		luma2 = lumaRight;
	}
	
	let gradient1 = luma1 - lumaCenter;
	let gradient2 = luma2 - lumaCenter;

	let is1Steepest = abs(gradient1) >= abs(gradient2);

	let gradientScaled = 0.25 * max(abs(gradient1), abs(gradient2));

	var lumaLocalAverage = 0.0;
	if (is1Steepest) {
		stepLength = -stepLength;
		lumaLocalAverage = 0.5 * (luma1 + lumaCenter);
	} else {
		lumaLocalAverage = 0.5 * (luma2 + lumaCenter);
	}

	var currentUv = uv_interp;
	var offset = vec2(0.0);
	if (isHorizontal) {
		currentUv.y += stepLength * 0.5;
		offset = vec2(data.pixel_size.x, 0.0);
	} else {
		currentUv.x += stepLength * 0.5;
		offset = vec2(0.0, data.pixel_size.y);
	}

	var uv1 = currentUv - offset * QUALITY(0);
	var uv2 = currentUv + offset * QUALITY(0);

	var lumaEnd1 = rgb2luma(textureSampleLevel(colorTexture, colorSampler, uv1, 0.0).xyz);
	var lumaEnd2 = rgb2luma(textureSampleLevel(colorTexture, colorSampler, uv2, 0.0).xyz);
	lumaEnd1 -= lumaLocalAverage;
	lumaEnd2 -= lumaLocalAverage;

	var reached1 = abs(lumaEnd1) >= gradientScaled;
	var reached2 = abs(lumaEnd2) >= gradientScaled;
	var reachedBoth = reached1 && reached2;

	if (!reached1) {
		uv1 -= offset * QUALITY(1);
	}
	if (!reached2) {
		uv2 += offset * QUALITY(1);
	}

	if (!reachedBoth) {
		for (var i = 2; i < ITERATIONS; i++) {
			if (!reached1) {
				lumaEnd1 = rgb2luma(textureSampleLevel(colorTexture, colorSampler, uv1, 0.0).xyz);
				lumaEnd1 = lumaEnd1 - lumaLocalAverage;
			}
			if (!reached2) {
				lumaEnd2 = rgb2luma(textureSampleLevel(colorTexture, colorSampler, uv2, 0.0).xyz);
				lumaEnd2 = lumaEnd2 - lumaLocalAverage;
			}
			reached1 = abs(lumaEnd1) >= gradientScaled;
			reached2 = abs(lumaEnd2) >= gradientScaled;
			reachedBoth = reached1 && reached2;
			if (!reached1) {
				uv1 -= offset * QUALITY(f32(i));
			}
			if (!reached2) {
				uv2 += offset * QUALITY(f32(i));
			}
			if (reachedBoth) {
				break;
			}
		}
	}

	var distance1 = 0.0;
	var distance2 = 0.0;
	if (isHorizontal) {
		distance1 = (uv_interp.x - uv1.x);
		distance2 = (uv2.x - uv_interp.x);
	} else {
		distance1 = (uv_interp.y - uv1.y);
		distance2 = (uv2.y - uv_interp.y);
	}

	let isDirection1 = distance1 < distance2;
	let distanceFinal = min(distance1, distance2);

	let edgeThickness = (distance1 + distance2);

	let isLumaCenterSmaller = lumaCenter < lumaLocalAverage;

	let correctVariation1 = (lumaEnd1 < 0.0) != isLumaCenterSmaller;
	let correctVariation2 = (lumaEnd2 < 0.0) != isLumaCenterSmaller;

	var correctVariation = false;
	if (isDirection1) {
		correctVariation = correctVariation1;
	} else {
		correctVariation = correctVariation2;
	}

	let pixelOffset = -distanceFinal / edgeThickness + 0.5;

	var finalOffset = 0.0;
	if (correctVariation) {
		finalOffset = pixelOffset;
	}

	let lumaAverage = (1.0 / 12.0) * (2.0 * (lumaDownUp + lumaLeftRight) + lumaLeftCorners + lumaRightCorners);

	let subPixelOffset1 = clamp(abs(lumaAverage - lumaCenter) / lumaRange, 0.0, 1.0);
	let subPixelOffset2 = (-2.0 * subPixelOffset1 + 3.0) * subPixelOffset1 * subPixelOffset1;

	let subPixelOffsetFinal = subPixelOffset2 * subPixelOffset2 * SUBPIXEL_QUALITY;

	finalOffset = max(finalOffset, subPixelOffsetFinal);

	var finalUv = uv_interp;
	if (isHorizontal) {
		finalUv.y += finalOffset * stepLength;
	} else {
		finalUv.x += finalOffset * stepLength;
	}

	let finalColor = textureSampleLevel(colorTexture, colorSampler, finalUv, 0.0).xyz;
	return finalColor;
}