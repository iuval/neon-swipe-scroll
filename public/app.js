var vertical      = false;
var ctx           = null;
var preventScroll = false;
var maxY          = 0;
var currentTop    = 0;
/**
 * Cross-browser requestAnimationFrame function
 *
 */
var requestAnimFrame = (function () {
  return  window.requestAnimationFrame || 
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame ||
          window.oRequestAnimationFrame ||
          window.msRequestAnimationFrame ||
          function (window, callback){
              window.setTimeout(callback, 1000 / 30);
          };
})();

var animate = function () {
  //Update detector data.
  MotionDetector.update();

  requestAnimFrame(animate);
};

/**
 * Init
 *
 */
var init = function (unity, vertical) {
  this.vertical = vertical;
  maxY = $(document).height() - $(window).height();

  if(vertical){
    $(window).scroll(function () {
      if(!preventScroll){
        currentTop = $(document).scrollTop();
      }
    });
  }

  if (unity) { 
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
  } else {   
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
    //Init getUserMedia
    if (navigator.getUserMedia) {
      navigator.getUserMedia({
        video: true,
      }, function(localMediaStream) {
        // On Succecss
        // Create a canvas element
        var canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 96;

        // Get the drawing context
        ctx = canvas.getContext('2d');

        var webcam = document.createElement('video');
        webcam.setAttribute('autoplay', 'true');
        webcam.src = window.URL.createObjectURL(localMediaStream);

        MotionDetector.init(webcam, canvas, ctx, vertical);

        animate();
      }, function(e) {
        // On Fail
        if (e.code = 1) {
          console.log("User declined permission.");
        }
      });
    } else {
      var message = document.getElementById('message');
      canvas.style.display = 'none';
      message.innerHTML = 'Your browser doesn\'t support "getUserMedia" function.<br />Try it with Chrome or Opera.';
      message.style.display = 'block';
    }      
  }
};

var scrollBy = function (delta) {
  if (vertical) {
    if (!preventScroll) {
      verticalScroll(delta);
    }
  } else {
    horizontalScroll(delta);
  }
};

var verticalScroll = function (dy) {
  currentTop += dy;
  if (currentTop < 0){
    currentTop = 0;
  } else if (currentTop > maxY) {
    currentTop = maxY;
  }
  preventScroll = true;
  $('html, body').animate({
    scrollTop: currentTop
  }, 500, function(){ preventScroll = false; });
};

var horizontalScroll = function (dx) {
  if (dx < 0) {
    $('.carousel').carousel('prev');
  } else if (dx > 0) {
    $('.carousel').carousel('next');
  }
};
