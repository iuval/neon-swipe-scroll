/**
/**
 * Application. Root class.
 *
 * @constructor
 */
function App(unity, vertical){
    var self = this;

    var canvas,
        ctx,
        message,
        webcam,
        motionDetector,
        interval;

    var preventScroll = false,
        maxY          = $(document).height() - $(window).height(),
        top           = 0;
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
      if(unity){ 
        var config = {
          width: 960, 
          height: 600,
          params: { enableDebugging:"0" }
          
        };
        var u = new UnityObject2(config);

        jQuery(function() {

          var $missingScreen = jQuery("#unityPlayer").find(".missing");
          var $brokenScreen = jQuery("#unityPlayer").find(".broken");
          $missingScreen.hide();
          $brokenScreen.hide();
          
          u.observeProgress(function (progress) {
            switch(progress.pluginStatus) {
              case "broken":
                $brokenScreen.find("a").click(function (e) {
                  e.stopPropagation();
                  e.preventDefault();
                  u.installPlugin();
                  return false;
                });
                $brokenScreen.show();
              break;
              case "missing":
                $missingScreen.find("a").click(function (e) {
                  e.stopPropagation();
                  e.preventDefault();
                  u.installPlugin();
                  return false;
                });
                $missingScreen.show();
              break;
              case "installed":
                $missingScreen.remove();
              break;
              case "first":
              break;
            }
          });
          u.initPlugin(jQuery("#unityPlayer")[0], "poc1.unity3d");
        });
      }else{   
        canvas  = document.getElementById('canvas');
        ctx     = canvas.getContext("2d");
        message = document.getElementById('message');
        webcam  = document.getElementById('canvasVideo');

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
            motionDetector = new MotionDetector(ctx, true);
          }else{
            motionDetector = new MotionDetector(ctx, false);
          }
        } else {
          canvas.style.display = 'none';
          message.innerHTML = 'Your browser doesn\'t support "getUserMedia" function.<br />Try it with Chrome or Opera.';
          message.style.display = 'block';
        }      
      }
    };

    self.scrollBy = function(delta) {
      if(vertical){
        if(!preventScroll){
          verticalScroll(delta);
        }
      }else{
        horizontalScroll(delta);
      }
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

    constructor();
}
