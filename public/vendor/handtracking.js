/*
Copyright (c) 2012 Juan Mellado

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var HT = HT || {};

HT.Tracker = function(params){
  this.params = params || {};

  this.mask = new CV.Image();
  this.eroded = new CV.Image();
  this.contours = [];

  this.skinner = new HT.Skinner({points: [], minPixel: 15, maxPixel: 150});
};

HT.Tracker.prototype.detect = function(image){
  this.skinner.mask(image, this.mask);

  if (this.params.fast){
    this.blackBorder(this.mask);
  }else{
    CV.erode(this.mask, this.eroded);
    CV.dilate(this.eroded, this.mask);
  }

  this.contours = CV.findContours(this.mask);

  return this.findCandidate(this.contours, image.width * image.height * 0.05, 0.005);
  //return this.findCandidates(this.contours, image.width * image.height * 0.05, 0.005);
};

HT.Tracker.prototype.findCandidate = function(contours, minSize, epsilon){
  var contour, candidate;

  contour = this.findMaxArea(contours, minSize);
  if (contour){
    contour = CV.approxPolyDP(contour, contour.length * epsilon);

    candidate = new HT.Candidate(contour);
  }

  return candidate;
};

HT.Tracker.prototype.findCandidates = function(contours, minSize, epsilon){
  var contour,
      i = contours.length,
      candidates = new Array(contours.length),
      area,
      contour;

  if (contours){
    for (;i--;){
      area = CV.area(contours[i]);
      if (area >= minSize){
        contour = CV.approxPolyDP(contours[i], contours[i].length * epsilon);

        candidates[i] = new HT.Candidate(contour);
      }
    }
  }

  return candidates;
};

HT.Tracker.prototype.findMaxArea = function(contours, minSize){
  var len = contours.length, i = 0,
      maxArea = -Infinity,area, contour;

  for (; i < len; ++ i){
    area = CV.area(contours[i]);
    if (area >= minSize){
      if (area > maxArea) {
        maxArea = area;
        contour = contours[i];
      }
    }
  }
  return contour;
};

HT.Tracker.prototype.blackBorder = function(image){
  var img = image.data, width = image.width, height = image.height,
      pos = 0, i;

  for (i = 0; i < width; ++ i){
    img[pos ++] = 0;
  }

  for (i = 2; i < height; ++ i){
    img[pos] = img[pos + width - 1] = 0;

    pos += width;
  }

  for (i = 0; i < width; ++ i){
    img[pos ++] = 0;
  }

  return image;
};

HT.Candidate = function(contour){
  this.contour = contour;
  this.hull = CV.convexHull(contour);
  this.defects = CV.convexityDefects(contour, this.hull);
};

HT.Skinner = function(params){
  this.params = params || {};
};

HT.Skinner.prototype.calibrate = function(image, i){
  var src = imageSrc.data,
      len = src.length,
      r, g, b, h, s, v, calc;

  r = src[i];
  g = src[i + 1];
  b = src[i + 2];

  v = Math.max(r, g, b);
  s = v === 0? 0: 255 * ( v - Math.min(r, g, b) ) / v;
  h = 0;

  if (0 !== s){
    if (v === r){
      h = 30 * (g - b) / s;
    }else if (v === g){
      h = 60 + ( (b - r) / s);
    }else{
      h = 120 + ( (r - g) / s);
    }
    if (h < 0){
      h += 360;
    }
  }

  calc = (s+v)/h;
  this.params.points.push(calc);
  if (this.params.minPixel > calc) {
    this.params.minPixel = calc;
  } else if (this.params.maxPixel < calc) {
    this.params.maxPixel = calc;
  }
};


HT.Skinner.prototype.mask = function(imageSrc, imageDst){
  var src = imageSrc.data, dst = imageDst.data, len = src.length,
      i = 0, j = 0,
      r, g, b, h, s, v, value, calc;

  for(; i < len; i += 4){
    r = src[i];
    g = src[i + 1];
    b = src[i + 2];

    v = Math.max(r, g, b);
    s = v === 0? 0: 255 * ( v - Math.min(r, g, b) ) / v;
    h = 0;

    if (0 !== s){
      if (v === r){
        h = 30 * (g - b) / s;
      }else if (v === g){
        h = 60 + ( (b - r) / s);
      }else{
        h = 120 + ( (r - g) / s);
      }
      if (h < 0){
        h += 360;
      }
    }

    value = 0;

    // Simple
    // if (v >= 15 && v <= 250){
    //   if (h >= 3 && h <= 33){
    //     value = 255;
    //   }
    // }

    // if (v >= 30 && v <= 200 &&
    //     h >= 2 && h <= 20){
    // console.log((s+v)/h);
    calc = (s+v)/h;
    if (calc >= this.params.minPixel && calc <= this.params.maxPixel) {
      value = 255;
    }

    dst[j ++] = value;
  }

  imageDst.width = imageSrc.width;
  imageDst.height = imageSrc.height;

  return imageDst;
};
