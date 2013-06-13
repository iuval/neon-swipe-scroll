/**
 * @constructor
 * @param {Object} video - video element
 * @param {Object} output - canvas element for output motion data
 */
function MotionDetector(video, output, scrollBy) {
  "use strict";
  var self = this;

  var sourceData
    , lastImageData
    , contextBlended
    , blended
    , width
    , height
    , PIXEL_CHANGE_THRESHOLD = 50
    , FRAME_THRESHOLD = 200
    , searching = true
    , remainingFrames
    , originalWeight = 0
    , scanCount = 0
    ;

  var color = {
    difference:{
      r: 255,
      g: 255,
      b: 255,
      a: 255
    }
  };

  /**
   * Binary abs function.
   *
   * @private
   * @param {Number} value
   * @return {Number}
   */
  var abs = function (value) {
    return (value ^ (value >> 31)) - (value >> 31);
  };

  /**
   * Binary round function.
   * @private
   * @param {Number} value
   * @return {Number}
   */
  var round = function(value){
    return (0.5 + value) << 0;
  };

  /**
   * Calculate difference between 2 images and create blended data.
   *
   * @private
   */
  var difference = function () {
    var target = blended.data,
      data1 = sourceData.data,
      data2 = lastImageData.data,
      e;

    checkLigth(data1);

    if (data1.length != data2.length)
      return;

    var sumX = 0
      , sumY = 0
      , totalPixels = 0;
    var average1, average2, diff, i;
    var motionWeight = 0;
    for (var py = 0; py < height; py ++) {
      for ( var px = 0; px < width; px ++){
        i = ( py * width * 4 ) + ( px * 4 );

        average1 = (data1[i] + data1[i + 1] + data1[i + 2]) / 3;
        average2 = (data2[i] + data2[i + 1] + data2[i + 2]) / 3;
        if (abs(average1 - average2) > PIXEL_CHANGE_THRESHOLD) {
          target[i] = 255;
          target[i + 1] = diff;
          target[i + 2] = diff;
          target[i + 3] = 255;

          if( py < (height / 2) ){
            motionWeight += 1;
          }else{
            motionWeight -= 1;
          }
        }
      }
    }

    if (!searching){
      if ( abs(motionWeight) > FRAME_THRESHOLD ){
        remainingFrames = 10;
        searching = true;
        originalWeight = motionWeight;
          console.log(motionWeight + " -> " );
      }
    } else {
      if (remainingFrames <= 0) {
        searching = false;
      } else {
        remainingFrames--;
        if ( originalWeight > 0 ) {  //Original was Bottom
          if ( motionWeight < -FRAME_THRESHOLD ) { //So we check Top
            scrollBy(200)
            searching = false;
          }
        } else {  //Original was Top
          if( motionWeight > FRAME_THRESHOLD ) { //So we check Bot
            scrollBy(-200)
            searching = false;
          }
        }
      }
    }
  };

  var checkLigth = function(currentImageData){
    scanCount++;
    if(scanCount == 100){ // every 100 frames, check the light
      scanCount = 0;
      var lightLevel = getLightLevel(currentImageData);
      console.log(lightLevel);
      if (lightLevel > 0 && lightLevel <= 10) {
        PIXEL_CHANGE_THRESHOLD = 20;
        FRAME_THRESHOLD = 20;
      }
      else if (lightLevel > 10 && lightLevel < 25) {
        PIXEL_CHANGE_THRESHOLD = 40;
        FRAME_THRESHOLD = 200;
      }
      else {
        PIXEL_CHANGE_THRESHOLD = 40;
        FRAME_THRESHOLD = 300;
      }
    }
  }

  // Will return the average intensity of all pixels.  Used for calibrating sensitivity based on room light level.
  var getLightLevel = function (imageData) {
    var value = 0;
    for (var i = 0; i < imageData.length; i += 4) {
      value += (imageData[i] + imageData[i + 1] + imageData[i + 2]) / 3;
    }

    return value / imageData.length;
  };

  /**
   * Blend previous and new frame.
   *
   * @private
   */
  var blend = function () {
    sourceData = output.getImageData(0, 0, width, height);
    if (!lastImageData) {
      lastImageData = output.getImageData(0, 0, width, height);
    }
    blended = output.getImageData(0, 0, width, height);

    difference();

    if (contextBlended){
      contextBlended.putImageData(blended, 0, 0);
    }

    lastImageData = sourceData;
  };

  /**
   * DOM initialization
   *
   * @private
   */
  var initDOM = function () {
    width = canvas.width;
    height = canvas.height;
    contextBlended = output;
  };

  /**
   * Local constructor.
   *
   * @private
   */
  var constructor = function () {
    initDOM();
  };

  //public

  /**
   * Update data.
   *
   * @public
   */
  self.update = function () {
    blend();
  };

  /**
   * Get blended data.
   *
   * @public
   * @return {Array}
   */
  self.getBlended = function () {
    return blended;
  };

  /**
   * Get average of blended data in rectangle area.
   *
   * @public
   * @param {Number} x - x coordinate of top-left corner of a rectangle
   * @param {Number} y - y coordinate of top-left corner of a rectangle
   * @param {Number} w - width of a rectangle
   * @param {Number} h - height of a rectangle
   * @param {Number} step - step of checking. Default is 1.
   * @return {Number} Average
   */
  self.getMotionAverage = function(x, y, w, h, step){
    var average = 0;
    var blendedData = blended.data;
    step = step || 1;

    for (var i = ~~y, yk = ~~(y + h); i < yk; i += step) {
      for (var j = ~~x, xk = ~~(x + w), b; j < xk; j += step) {
        b = ~~(j * 4 + i * width * 4);
        average += (blendedData[b] + blendedData[b + 1] + blendedData[b + 2]) / 3;
      }
    }

    return round(average / ( (w / step) * (h / step) ));
  };

  //calling local constructor
  constructor();
}
