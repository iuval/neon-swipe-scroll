var JSHandtracking = function(){
  this.convex_hull = true;
  this.convexity_defects = true;
  this.skin_mask = true;
};

JSHandtracking.prototype.start = function() {
  var that = this;

  this.video = document.getElementById("video");
  this.canvas = document.getElementById("canvas");
  this.context = this.canvas.getContext("2d");
  this.buffers = [];
  this.buffer_index = 0;
  this.buffers_count = 50;
  this.frames_to_skip = 30;
  this.frames_skipped = this.frames_to_skip;

  this.canvas.width = parseInt(this.canvas.style.width) / 2;
  this.canvas.height = parseInt(this.canvas.style.height) / 2;

  this.tracker = new HT.Tracker({ w: this.canvas.width, h: this.canvas.height });

  this.image = this.context.createImageData(
    this.canvas.width * 0.2, this.canvas.height * 0.2);

  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
  if (navigator.getUserMedia){
    navigator.getUserMedia({video:true},
      function(stream){ return that.videoReady(stream); },
      function(error){ return that.videoError(error); } );
  }
};

JSHandtracking.prototype.videoReady = function(stream){
  if (window.webkitURL) {
    this.video.src = window.webkitURL.createObjectURL(stream);
  } else if (video.mozSrcObject !== undefined) {
    this.video.mozSrcObject = stream;
  } else {
    this.video.src = stream;
  }

  this.tick();
};
JSHandtracking.prototype.videoError = function(error){
};

JSHandtracking.prototype.tick = function(){
  var that = this, image, candidate
  ,contours;

  requestAnimationFrame( function() { return that.tick(); } );

  if (this.video.readyState === this.video.HAVE_ENOUGH_DATA){
     this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

    var sourceData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
      // create an image if the previous image doesn’t exist
    if (!this.lastImageData) {
      this.lastImageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
      for (var i = 0; i < this.buffers_count; i+=1) {
        this.buffers[i] = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
      }
    }
    this.frames_skipped -= 1;
    if (this.frames_skipped == 0) {
      var i = 0, j = 0;
      while (i < (this.lastImageData.data.length * 0.25)) {
        j = 4 * i;
        // this.lastImageData.data[j] = this.fastAbs(sourceData.data[j] - this.lastImageData.data[j]);
        // this.lastImageData.data[j + 1] = this.fastAbs(sourceData.data[j + 1] - this.lastImageData.data[j + 1]);
        // this.lastImageData.data[j + 2] = this.fastAbs(sourceData.data[j + 2] - this.lastImageData.data[j + 2]);
        // this.lastImageData.data[j + 3] = 0xFF;
        this.lastImageData.data[j] = this.buffersAVG(j);//this.fastAbs(sourceData.data[j] - this.lastImageData.data[j]);
        this.lastImageData.data[j + 1] = this.buffersAVG(j+1);// this.fastAbs(sourceData.data[j + 1] - this.lastImageData.data[j + 1]);
        this.lastImageData.data[j + 2] = this.buffersAVG(j+2);// this.fastAbs(sourceData.data[j + 2] - this.lastImageData.data[j + 2]);
        this.lastImageData.data[j + 3] = 0xFF;
        ++i;
      }
      this.buffer_index = (this.buffer_index + 1) % this.buffers_count;
      this.buffers[this.buffer_index] = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
      this.frames_skipped = this.frames_to_skip;
    }
    // create a ImageData instance to receive the blended result
    var blendedData = this.context.createImageData(this.canvas.width, this.canvas.height);
    // blend the 2 images
    this.differenceAccuracy(blendedData.data, sourceData.data, this.lastImageData.data);
    // store the current webcam image
    //this.lastImageData = sourceData;


   // var image = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
   // this.update(this.context, image);
   // candidate = this.tracker.detect(blendedData, this.context);
    contours = this.tracker.detect(blendedData, this.context);
//contours = this.tracker.detect(image, this.context);
    for (var i = contours.length;i--;){
       this.draw(contours[i]);
     }

    //this.draw(candidate);
  }
};

JSHandtracking.prototype.buffersAVG = function(j) {
  var d = 0;
  for (var i = 0; i < this.buffers_count; i+=1) {
    d += this.buffers[i].data[j];
  }
  return d / this.buffers_count;
}


  JSHandtracking.prototype.fastAbs = function(value) {
          // funky bitwise, equal Math.abs
          return (value ^ (value >> 31)) - (value >> 31);
  };

  JSHandtracking.prototype.threshold = function(value) {
          return (value > 0x25) ? 255 : 0;
  };

  JSHandtracking.prototype.difference = function(target, data1, data2) {
          // blend mode difference
          if (data1.length != data2.length) return null;
          var i = 0;
          while (i < (data1.length * 0.25)) {
            target[4 * i] = data1[4 * i] == 0 ? 0 : this.fastAbs(data1[4 * i] - data2[4 * i]);
            target[4 * i + 1] = data1[4 * i + 1] == 0 ? 0 : this.fastAbs(data1[4 * i + 1] - data2[4 * i + 1]);
            target[4 * i + 2] = data1[4 * i + 2] == 0 ? 0 : this.fastAbs(data1[4 * i + 2] - data2[4 * i + 2]);
            target[4 * i + 3] = 0xFF;
            ++i;
          }
  };

  JSHandtracking.prototype.differenceAccuracy = function(target, data1, data2) {
          if (data1.length != data2.length) return null;
          var i = 0;
          while (i < (data1.length * 0.25)) {
                  var average1 = (data1[4 * i] + data1[4 * i + 1] + data1[4 * i + 2]) / 3;
                  var average2 = (data2[4 * i] + data2[4 * i + 1] + data2[4 * i + 2]) / 3;
                  var diff = this.threshold(this.fastAbs(average1 - average2));
                  if (diff == 255) {
                    target[4 * i] = data1[4 * i] ;
                    target[4 * i + 1] = data1[4 * i + 1] ;
                    target[4 * i + 2] = data1[4 * i + 2] ;
                    target[4 * i + 3] = data1[4 * i + 3] ;
                  }
                  ++i;
          }
  };

  JSHandtracking.prototype.checkAreas = function() {
          var data;
          for (var h = 0; h < hotSpots.length; h++) {
                  var blendedData = contextBlended.getImageData(hotSpots[h].x, hotSpots[h].y, hotSpots[h].width, hotSpots[h].height);
                  var i = 0;
                  var average = 0;
                  while (i < (blendedData.data.length * 0.25)) {
                          // make an average between the color channel
                          average += (blendedData.data[i * 4] + blendedData.data[i * 4 + 1] + blendedData.data[i * 4 + 2]) / 3;
                          ++i;
                  }
                  // calculate an average between the color values of the spot area
                  average = Math.round(average / (blendedData.data.length * 0.25));
                  if (average > 10) {
                          // over a small limit, consider that a movement is detected
                          data = {confidence: average, spot: hotSpots[h]};
                          $(data.spot.el).trigger('motion', data);
                  }
          }
  };
JSHandtracking.prototype.draw = function(candidate){
  if (candidate){

    if (this.convex_hull){
      this.drawHull(candidate.hull, "red");
    }

    if (this.convexity_defects){
      this.drawDefects(candidate.defects, "blue");
    }
  }

  // if (this.skin_mask){
  //   this.context.putImageData(
  //     this.createImage(this.tracker.mask, this.image),
  //     this.canvas.width - this.image.width,
  //     this.canvas.height - this.image.height);
  // }
};

JSHandtracking.prototype.drawHull = function(hull, color){
  var len = hull.length, i = 1;

  if (len > 0){
    this.context.beginPath();
    this.context.strokeStyle = color;

    this.context.moveTo(hull[0].x, hull[0].y);
    for (; i < len; ++ i){
      this.context.lineTo(hull[i].x, hull[i].y);
    }

    this.context.stroke();
    this.context.closePath();
  }
};

JSHandtracking.prototype.drawDefects = function(defects, color){
  var len = defects.length, i = 0, point;
  var maxX = 0,
      minX = 0,
      maxY = 0,
      minY = 0,
      midX = 0,
      midY = 0;

  if (len > 0){
    this.context.strokeStyle = color;

    for (; i < len; ++ i){
      point = defects[i].depthPoint;
      this.context.strokeRect(point.x - 2, point.y - 2, 4, 4);

      if (point.x > maxX) { maxX = point.x; }
      if (point.x < minX) { minX = point.x; }
      if (point.y > maxY) { maxY = point.y; }
      if (point.y < minY) { minY = point.y; }
      midX += point.x;
      midY += point.y;
    }
    midX /= len;
    midY /= len;

    this.context.strokeStyle = 'yellow';
    this.context.beginPath();
    this.context.arc(midX, midY, 10, 0, 2*Math.PI);
    this.context.stroke();

    this.context.strokeStyle = 'white';
    for (i = len; i --;){
      this.context.beginPath();
      this.context.moveTo(midX, midY);
      point = defects[i].depthPoint;
      this.context.lineTo(point.x, point.y);
      this.context.stroke();
    }

    var h = maxY - minY,
        w = maxX - minX;
    if (h > w*1.5 && h < w*1.6) {
      console.log('rectangle');
    }
  }
};

JSHandtracking.prototype.createImage = function(imageSrc, imageDst){
  var src = imageSrc.data, dst = imageDst.data,
      width = imageSrc.width, span = 4 * width,
      len = src.length, i = 0, j = 0, k = 0;

  for(i = 0; i < len; i += span){

    for(j = 0; j < width; j += 5){

      dst[k] = dst[k + 1] = dst[k + 2] = src[i];
      dst[k + 3] = 255;
      k += 4;

      i += 5;
    }
  }

  return imageDst;
};

JSHandtracking.prototype.calibrate = function(x, y){
  this.tracker.skinner.calibrate(this.snapshot(), (y-10)*this.canvas.width + x-10);
};
