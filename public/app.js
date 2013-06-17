/**
 * Application. Root class.
 *
 * @constructor
 */
function App(vertical){
    var self = this;

    var canvas  = document.getElementById('canvas'),
        ctx     = canvas.getContext("2d"),
        message = document.getElementById('message'),
        webcam  = document.getElementById('canvasVideo'),
        motionDetector,
        interval;

    /**
     * Cross-browser requestAnimationFrame function
     *
     * @private
     */
    var requestAnimFrame = (function () {
        return  window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (callback){
                window.setTimeout(callback, 1000 / 30);
            };
    })();

    /**
     * Fill the canvas and redraw an each particle.
     *
     * @private
     */
    var animate = function(){
      ctx.drawImage(webcam, 0, 0, canvas.width, canvas.height);

      //Update detector data.
      motionDetector.update();

      requestAnimFrame(animate);
    };


    /**
     * Local constructor
     *
     * @private
     */
    var constructor = function(){
      navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
      //Init getUserMedia
      if (navigator.getUserMedia) {
        navigator.getUserMedia({
          video: true,
        }, function(localMediaStream) {
          // On Succecss
          webcam.src = window.URL.createObjectURL(localMediaStream);
          animate();
        }, function(e) {
          // On Fail
          if (e.code = 1) {
            console.log("User declined permission.");
          }
        });

        if(vertical){
          motionDetector = new MotionDetector(webcam, ctx, true);
        }else{
          motionDetector = new MotionDetector(webcam, ctx, false);
        }
      } else {
        canvas.style.display = 'none';
        message.innerHTML = 'Your browser doesn\'t support "getUserMedia" function.<br />Try it with Chrome or Opera.';
        message.style.display = 'block';
      }
    };

    constructor();
}
