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

    this.sourceData = this.input.getImageData(0, 0, this.width, this.height);

    this.process();

    this.lastImageData = this.sourceData;
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
    this.sourceData = this.input.getImageData(0, 0, this.width, this.height);
    this.lastImageData = this.input.getImageData(0, 0, this.width, this.height);

    if (vertical){
      this.originPosition = this.height/2;
    } else {
      this.originPosition = this.width / 2;
    }
  },
};
