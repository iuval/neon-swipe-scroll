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
    video.src = window.URL.createObjectURL(localMediaStream);
    drawFrame();
  }, function(e) {
    if (e.code = 1) {
      console.log("User declined permission.");
    }
  });

  function reloadMode() {
    video.pause();
    var wait = setTimeout(function(){
    video.play();
    }, 5);
  }

  function drawFrame() {
    bcv.drawImage(video, 0, 0, w, h);
    var apx = bcv.getImageData(0, 0, w, h);
    ctx.putImageData(apx, 0, 0);
    setTimeout(function() {
      drawFrame();
    }, 60);
  }

  function drawFrameWithBorders() {
    bcv.drawImage(video, 0, 0, w, h);
    var apx = bcv.getImageData(0, 0, w, h);
    ctx.putImageData(apx, 0, 0);
    setTimeout(function() {
      drawFrame();
    }, 60);
  }
}

jQuery(function() {
  canvasVideo();
});
