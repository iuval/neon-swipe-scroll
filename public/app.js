/**
 * Application. Root class.
 *
 * @constructor
 */
function App(){
    var self = this;

    var canvas = document.getElementById('canvas'),
        ctx = canvas.getContext("2d"),
        message = document.getElementById('message'),
        webcam = document.getElementById('canvasVideo'),
        maxY = $(document).height() - $(window).height(),
        preventScroll = false,
        motionDetector = new MotionDetector(webcam, ctx, function(dy) {
          top += dy;
          if(top < 0){
            top = 0;
          }else if(top > maxY){
            top = maxY;
          }
          preventScroll = true;
          $('html, body').animate({
            scrollTop: top
          }, 500, function(){ preventScroll = false; });
        })
      , interval
      , top = 0
      , last_x = 0
      , last_y = 0
      ;

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
                window.setTimeout(callback, 1000 / 40);
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
      } else {
        canvas.style.display = 'none';
        message.innerHTML = 'Your browser doesn\'t support "getUserMedia" function.<br />Try it with Chrome or Opera.';
        message.style.display = 'block';
      }

      $(window).scroll(function () {
        if(!preventScroll){
          top = $(document).scrollTop();
        }
      });
    };

    constructor();
}
