/**
 * @constructor
 * @param {Object} video - video element
 * @param {Object} output - canvas element for output motion data
 * @param {Object} vertical - boolean, if the motion should be vertical or horizontal
 * @param {Object} scrollBy - function that recieves the delta movement
 */
function MotionDetector(video, output, vertical) {
  "use strict";
  var self = this;

  var sourceData,
      lastImageData,
      contextBlended,
      blended,
      width,
      height,
      PIXEL_CHANGE_THRESHOLD = 50,
      FRAME_THRESHOLD        = 300,
      searching              = true,
      remainingFrames        = 15,
      scanCount              = 0,
      brightnessAdjustment   = 0,
      originPosition,
      pixelsSum,
      pixelCount;

  var preventScroll = false,
      maxY          = $(document).height() - $(window).height(),
      top           = 0;

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
   * TODO
   *
   * @private
   */
  var process = function () {
    var target = blended.data,
        data1  = sourceData.data, 
        data2  = lastImageData.data;

    if (data1.length != data2.length)
      return;

    checkLigth(data1);
    
    var sumX        = 0,
        sumY        = 0,
        totalPixels = 0,
        average1,
        average2,
        diff,
        i,
        motionWeight = 0;
    pixelsSum = 0;
    pixelCount = 0;
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

          if(searching){
            if(vertical){
              if( py < originPosition ){
                motionWeight += 1;
              }else{
                motionWeight -= 1;
              }
            }else{
              if( px < originPosition ){
                motionWeight += 1;
              }else{
                motionWeight -= 1;
              }
            }
          }else{
            motionWeight += 1;
          }
          pixelCount++;
          if(vertical){
            pixelsSum += py;
          }else{
            pixelsSum += px;
          }
        }
      }
    }

    if (!searching){
      if ( abs(motionWeight) > FRAME_THRESHOLD ){
        remainingFrames = 15;
        searching = true;
        originPosition = pixelsSum / pixelCount; // Average of x positions
      }
    } else {
      if (remainingFrames <= 0) {
        searching = false;
      } else {
        remainingFrames--;
        if ( motionWeight < -FRAME_THRESHOLD ) { //So we check Top
          scrollBy(200)
          searching = false;
        }else if( motionWeight > FRAME_THRESHOLD ) { //So we check Bot
          scrollBy(-200)
          searching = false;
        }
      }
    }
  };

  var scrollBy = function(delta){
    if(vertical){
      if(!preventScroll){
        verticalScroll(delta);
      }
    }else{
      horizontalScroll(delta);
    }
  }

  var checkLigth = function(currentImageData){
    scanCount++;
    if(scanCount == 100){ // every 100 frames, check the light
      scanCount = 0;
      var lightLevel = getLightLevel(currentImageData);

      PIXEL_CHANGE_THRESHOLD = Math.max(30 ,Math.min(40 ,lightLevel));
      FRAME_THRESHOLD = 350;
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

  //  adjustBrightness(sourceData);

    if (!lastImageData) {
      lastImageData = output.getImageData(0, 0, width, height);
    }
    blended = output.getImageData(0, 0, width, height);

    process();

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

    $(window).scroll(function () {
      if(!preventScroll){
        top = $(document).scrollTop();
      }
    });
  };

  /**
   * Local constructor.
   *
   * @private
   */
  var constructor = function () {
    initDOM();

    if (vertical){
      originPosition = height/2;
    } else {
      originPosition = width / 2;
    }
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

  var verticalScroll = function(dy) {
    top += dy;
    if (top < 0){
      top = 0;
    }else if (top > maxY){
      top = maxY;
    }
    preventScroll = true;
    $('html, body').animate({
      scrollTop: top
    }, 500, function(){ preventScroll = false; });
  };

  var horizontalScroll = function(dx) {
    if (dx < 0){
      $('.carousel').carousel('prev');
    }else if (dx > 0){
      $('.carousel').carousel('next');
    }
  };

  //calling local constructor
  constructor();
}
