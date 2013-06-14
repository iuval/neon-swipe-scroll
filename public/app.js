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
        maxY    = $(document).height() - $(window).height(),
        preventScroll = false,
        motionDetector,
        interval,
        top = 0;

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
          motionDetector = new MotionDetector(webcam, ctx, true, verticalScroll);
        }else{
          motionDetector = new MotionDetector(webcam, ctx, false, horizontalScroll);
        }
        $(window).scroll(function () {
          if(!preventScroll){
            top = $(document).scrollTop();
          }
        });
      } else {
        canvas.style.display = 'none';
        message.innerHTML = 'Your browser doesn\'t support "getUserMedia" function.<br />Try it with Chrome or Opera.';
        message.style.display = 'block';
      }
    };

    constructor();
}
