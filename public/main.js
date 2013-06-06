var canvasVideo = function() {
  console.log("starting");

  var $ = jQuery,
  video = document.getElementById('canvasVideo'),
  canvas = document.getElementById('canvasVideoCvs'),
  backcvs = document.getElementById('canvasVideoBcvs'),
  ctx = canvas.getContext('2d'),
  bcv = backcvs.getContext('2d'),
  w = canvas.width,
  h = canvas.height;

  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

  navigator.getUserMedia({
    video: true,
  }, function(localMediaStream) {
    // On Succecss
    video.src = window.URL.createObjectURL(localMediaStream);
    drawFrameInverted();
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
      var apx = bcv.getImageData(0, 0, w, h);
      ctx.putImageData(apx, 0, 0);
      redraw();
    } catch(e) {
      redraw();
    }
  }

  function drawFrameInverted() {
    var redraw = function() {
      setTimeout(function() {
        drawFrameInverted();
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
            b = data[i + 2];

        data[i]     = 255 - r;
        data[i + 1] = 255 - g;
        data[i + 2] = 255 - b;

      }
      apx.data = data;
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
