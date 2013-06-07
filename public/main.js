var canvasVideo = function() {
  console.log("starting");

  var $ = jQuery,
  video = document.getElementById('canvasVideo'),
  canvas = document.getElementById('canvasVideoCvs'),
  backcvs = document.getElementById('canvasVideoBcvs'),
  ctx = canvas.getContext('2d'),
  bcv = backcvs.getContext('2d'),
  w = canvas.width,
  h = canvas.height,
  previousImageData = false,
  motionDetectedPixels = [],
  motionThreshold = 150; // The color delta needed to consider a movement

  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

  navigator.getUserMedia({
    video: true,
  }, function(localMediaStream) {
    // On Succecss
    video.src = window.URL.createObjectURL(localMediaStream);
    drawFrame();
  }, function(e) {
    // On Fail
    if (e.code = 1) {
      console.log("User declined permission.");
    }
  });

  function reloadMode() {
    video.pause();
    var wait = setTimeout(function() {
    video.play();
    }, 5);
  }

  function drawFrame() {
    var redraw = function() {
      setTimeout(function() {
        drawFrame();
      }, 0);
    }

    try {
      bcv.drawImage(video, 0, 0, w, h);
      var apx = bcv.getImageData(0, 0, w, h),
          data = apx.data;

      // The data array is secuencial for the
      // three colors of each pixel (0 to 255 value)
      for (var i = 0; i < data.length; i += 4) {
        var r = data[i],
            g = data[i + 1],
            b = data[i + 2],
            grayScale = (r + g + b) / 3; // Converts the pixel to grayscale

        if (!previousImageData) {
          previousImageData = apx;
          continue;
        }

        // Get the previous pixels and grayscale
        var previousR = previousImageData.data[i],
            previousG = previousImageData.data[i + 1],
            previousB = previousImageData.data[i + 2]
            previousGrayScale = (previousR + previousG + previousB) / 3;

        var pixelDelta = grayScale - previousGrayScale;

        if (Math.abs(pixelDelta) > motionThreshold) {
          // Paint it red
          data[i] = 255;
          data[i + 1] = 0;
          data[i + 2] = 0;
        }

        previousImageData.data[i] = r;
        previousImageData.data[i + 1] = g;
        previousImageData.data[i + 2] = b;
      }

      apx.data = data; // add the red-painted pixels
      ctx.putImageData(apx, 0, 0);
      redraw();
    } catch(e) {
      redraw();
    }
  }
}

jQuery(function() {
  canvasVideo();
});
