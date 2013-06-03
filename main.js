  var videoElement = document.getElementById('webcam');

  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

  navigator.getUserMedia({
    video: true,
  }, function(localMediaStream) {
    // Success Callback
    videoElement.src = window.URL.createObjectURL(localMediaStream);

    console.log("Bang!");

    videoElement.onloadmetadata = function() {
      console.log("Frame!");
    }
  }, function(e) {
    // Error Callback
    if (e.code = 1) {
      console.log("User declined permission.");
    }
  });
