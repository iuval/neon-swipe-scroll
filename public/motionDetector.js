var MotionDetector = {
  webcam: null,
  input: null,
  width: null,
  height: null,
  sourceData: null,
  lastImageData: null,
  pixelJump: 1,
  PIXEL_CHANGE_THRESHOLD: 50,
  FRAME_THRESHOLD: 300,
  searching: true,
  remainingFrames: 15,
  scanCount: 0,
  brightnessAdjustment: 0,
  originPosition: 0,
  pixelsPositionSum: 0,
  pixelsCount: 0,
  /**
   * Binary abs function.
   *
   * @private
   * @param {Number} value
   * @return {Number}
   */
  abs: function (value) {
    return (value ^ (value >> 31)) - (value >> 31);
  },

  /**
   * Binary round function. 
   * @private
   * @param {Number} value
   * @return {Number}
   */
   round: function (value) {
    return (0.5 + value) << 0;
  },

  process: function () {
    var data1  = this.sourceData.data, 
    data2  = this.lastImageData.data;

    if (data1.length != data2.length)
      return;

    this.checkLigth(data1);
    
    var sumX        = 0,
    sumY        = 0,
    totalPixels = 0,
    average1,
    average2,
    diff,
    i,
    motionWeight = 0;
    this.pixelsPositionSum = 0;
    this.pixelsCount = 0;
    for (var py = 0; py < this.height; py ++ ) {
      for ( var px = 0; px < this.width; px ++ ){
        i = ( py * this.width * 4 ) + ( px * 4 );

        average1 = (data1[i] + data1[i + 1] + data1[i + 2]) / 3;
        average2 = (data2[i] + data2[i + 1] + data2[i + 2]) / 3;

        if (this.abs(average1 - average2) > this.PIXEL_CHANGE_THRESHOLD) {
          if(this.searching){
            if(this.vertical){
              if( py < this.originPosition ){
                motionWeight += 1;
              }else{
                motionWeight -= 1;
              }
            }else{
              if( px < this.originPosition ){
                motionWeight += 1;
              }else{
                motionWeight -= 1;
              }
            }
          }else{
            motionWeight += 1;
          }
          this.pixelsCount++;
          if(this.vertical){
            this.pixelsPositionSum += py;
          }else{
            this.pixelsPositionSum += px;
          }
        }
      }
    }

    if (!this.searching){
      if ( this.abs(motionWeight) > this.FRAME_THRESHOLD ){
        this.remainingFrames = 15;
        this.searching = true;
        this.originPosition = this.pixelsPositionSum / this.pixelsCount; // Average of positions
      }
    } else {
      if (this.remainingFrames <= 0) {
        this.searching = false;
      } else {
        this.remainingFrames--;
        if ( motionWeight < -this.FRAME_THRESHOLD ) {
          scrollBy(200)
          this.searching = false;
        }else if( motionWeight > this.FRAME_THRESHOLD ) {
          scrollBy(-200)
          this.searching = false;
        }
      }
    }
  },

  checkLigth: function (currentImageData) {
    this.scanCount++;
    if(this.scanCount == 100){ // every 100 frames, check the light
      this.scanCount = 0;
      var lightLevel = this.getLightLevel(currentImageData);

      this.PIXEL_CHANGE_THRESHOLD = Math.max(30 ,Math.min(40 ,lightLevel));
      this.FRAME_THRESHOLD = 350;
    }
  },

  // Will return the average intensity of all pixels.  Used for calibrating sensitivity based on room light level.
  getLightLevel: function (imageData) {
    var value = 0;
    for (var i = 0; i < imageData.length; i += 4) {
      value += (imageData[i] + imageData[i + 1] + imageData[i + 2]) / 3;
    }

    return value / imageData.length;
  },

  /**
   * Blend previous and new frame.
   *
   * @private
   */
  update: function () {
    this.input.drawImage(this.webcam, 0, 0, this.width, this.height);
    // get webcam image data
    var sourceData = this.input.getImageData(0, 0, this.width, this.height);
    // create an image if the previous image doesn’t exist
    if (!this.lastImageData) this.lastImageData = this.input.getImageData(0, 0, this.width, this.height);
    // create a ImageData instance to receive the blended result
    var blendedData = this.input.createImageData(this.width, this.height);
    // blend the 2 images
    this.differenceAccuracy(blendedData.data, sourceData.data, this.lastImageData.data);
    // draw the result in a canvas
    this.output.putImageData(blendedData, 0, 0);
    // store the current webcam image
    this.lastImageData = sourceData;
  },

  fastAbs: function(value) {
          // funky bitwise, equal Math.abs
          return (value ^ (value >> 31)) - (value >> 31);
  },

  threshold: function(value) {
          return (value > 0x15) ? 0xFF : 0;
  },

  difference: function(target, data1, data2) {
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
  },

  differenceAccuracy: function(target, data1, data2) {
          if (data1.length != data2.length) return null;
          var i = 0;
          while (i < (data1.length * 0.25)) {
                  var average1 = (data1[4 * i] + data1[4 * i + 1] + data1[4 * i + 2]) / 3;
                  var average2 = (data2[4 * i] + data2[4 * i + 1] + data2[4 * i + 2]) / 3;
                  var diff = this.threshold(this.fastAbs(average1 - average2));
                  target[4 * i] = diff;
                  target[4 * i + 1] = diff;
                  target[4 * i + 2] = diff;
                  target[4 * i + 3] = 0xFF;
                  ++i;
          }
  },

  checkAreas: function() {
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
  },

  /**
   * Local constructor.
   *
   * @private
   */
  init: function (video, canvas, ctx, vertical) {
    this.webcam = video;
    this.input = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
    this.output = canvas.getContext('2d');
    this.sourceData = this.input.getImageData(0, 0, this.width, this.height);
    this.lastImageData = this.input.getImageData(0, 0, this.width, this.height);

    if (vertical){
      this.originPosition = this.height/2;
    } else {
      this.originPosition = this.width / 2;
    }
  },
};
