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

  var w = this.params.w;
  var h = this.params.h;
  this.img_u8 = new jsfeat.matrix_t(w, h, jsfeat.U8_t | jsfeat.C1_t);
  this.edg = new jsfeat.matrix_t(w, h, jsfeat.U8_t | jsfeat.C1_t);
  this.ii_sum = new Int32Array((w+1)*(h+1));
  this.ii_sqsum = new Int32Array((w+1)*(h+1));
  this.ii_tilted = new Int32Array((w+1)*(h+1));
  this.ii_canny = new Int32Array((w+1)*(h+1));
  this.classifier = jsfeat.haar.frontalface;
  this.min_scale = 2;
  this.scale_factor = 1.15;
  this.use_canny = false;
  this.edges_density = 0.13;
  this.equalize_histogram = true;

  this.radius = 11;
  this.sigma = 10;
  this.kernel_size = (this.radius+1) << 1;

  this.skinner = new HT.Skinner({fast: false,
                                 points: [],
                                 min_value: 15, max_value: 150,
                                 min_hue: 3, max_hue: 33});
};

HT.Tracker.prototype.detect = function(image){
  this.skinner.mask(image, this.mask);

 // jsfeat.imgproc.grayscale(this.mask.data, this.img_u8);

  if (this.params.fast){
    this.blackBorder(this.mask);
  }else{
    CV.erode(this.mask, this.eroded);
    CV.dilate(this.eroded, this.mask);
  }

  this.removeFaces(image);

  this.contours = CV.findContours(this.mask);

  return this.findCandidate(this.contours, image.width * image.height * 0.05, 0.005);
  //return this.findCandidates(this.contours, image.width * image.height * 0.05, 0.005);
};

HT.Tracker.prototype.removeFaces = function(image, dest){
  // jsfeat.imgproc.grayscale(image.data, this.img_u8.data);

  // // possible options
  // if(this.equalize_histogram) {
  //   jsfeat.imgproc.equalize_histogram(this.img_u8, this.img_u8);
  // }
  //jsfeat.imgproc.gaussian_blur(this.img_u8, this.img_u8, 3);

  jsfeat.imgproc.compute_integral_image(this.img_u8, this.ii_sum, this.ii_sqsum, this.classifier.tilted ? this.ii_tilted : null);

  if(this.use_canny) {
    jsfeat.imgproc.canny(this.img_u8, this.edg, 10, 50);
    jsfeat.imgproc.compute_integral_image(this.edg, this.ii_canny, null, null);
  }

  jsfeat.haar.edges_density = this.edges_density;
  var rects = jsfeat.haar.detect_multi_scale(this.ii_sum, this.ii_sqsum, this.ii_tilted, this.use_canny? this.ii_canny : null, this.img_u8.cols, this.img_u8.rows, this.classifier, this.scale_factor, this.min_scale);
  rects = jsfeat.haar.group_rectangles(rects, 1);
  // draw only most confident one
  this.draw_faces(rects, dest, this.params.w/this.img_u8.cols, 1);
};

HT.Tracker.prototype.draw_faces = function(rects, dest, sc, max) {
  var on = rects.length;
  if(on && max) {
    jsfeat.math.qsort(rects, 0, on-1, function(a,b){return (b.confidence<a.confidence);})
  }
  var n = max || on;
  n = Math.min(n, on);
  var r;
  for(var i = ((r.y*sc)|0  + (r.x*sc)|0); i < n; ++i) {
    r = rects[i];
    for(var j = 0; j < n; ++i) {
      dst[j] = 0;
    }
   // this.context.fillRect(,(r.y*sc)|0,(r.width*sc)|0,(r.height*sc)|0);
  }
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
  var src = image.data, len = src.length + 2,
      r, g, b, h, s, v,
      calc = 0, cant = 0;

  for (; cant++ < 20; i += 4){
    if (i < len) {
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
      cant += 1;
      calc += (s+v)/h;
    }
  }

  calc /= cant;
  console.log('calibrated: ' + calc);
  this.params.points.push(calc);
  if (this.params.min_value > calc) {
    this.params.min_value = calc;
  } else if (this.params.max_value < calc) {
    this.params.max_value = calc;
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
    // if (v >= this.params.min_value && v <= this.params.max_value){
    //   if (h >= this.params.min_hue && h <= this.params.max_hue){
    //     value = 255;
    //   }
    // }

    calc = (s+v)/h;
    if (calc >= this.params.min_value && calc <= this.params.max_value) {
      value = calc;
    }

    dst[j ++] = value;
  }

  imageDst.width = imageSrc.width;
  imageDst.height = imageSrc.height;

  return imageDst;
};
