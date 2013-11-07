"use strict";

var VT = (function() {
  var video, canvas,
      initialized = false;

  var gui = null;
  var ctx, canvasWidth, canvasHeight, work_canvas, work_ctx, lastImageData,
      img_u8, ii_sum, ii_sqsum, ii_tilted, edg, ii_canny,
      handfist_classifier = jsfeat.haar.handfist,
      handopen_classifier = jsfeat.haar.handopen,
      img_bg,
      max_work_size = 200;

  var buffers = [];
  var buffer_index = 0;
  var buffers_count = 30;
  var frames_to_skip = 10;
  var frames_skipped = frames_to_skip;

  var options = {
    min_scale:          2,
    scale_factor:       1.15,
    use_canny:          true,
    edges_density:      0.13,
    equalize_histogram: true,

    frames_to_skip:    20,
    skiped_frames:     20,
    fist_detected:     false,
    openhand_detected: false,

    detections:           0,
    detections_threshold: 10,

    fist_delta_x:  -1,
    fist_origin_x: -1,
    fist_origin_y: -1,

    move_threshold_y: 200,
  };

  function init() {
    video  = document.getElementById('webcam');
    canvas = document.getElementById('canvas');

    gui = new dat.GUI();

    gui.add(options, 'min_scale', 1, 4).step(0.1);
    gui.add(options, 'scale_factor', 1.1, 2).step(0.025);
    gui.add(options, 'equalize_histogram');
    gui.add(options, 'use_canny');
    gui.add(options, 'edges_density', 0.01, 1.).step(0.005);

    initialized = true;
  };

  function start() {
    if (!initialized) {
      init();
    }
    try {
      compatibility.getUserMedia({video: true}, function(stream) {
        if (video.mozSrcObject !== undefined) {
          video.mozSrcObject = stream;
        } else {
          video.src = (window.URL && window.URL.createObjectURL(stream)) || stream;
        }
        video.addEventListener('loadeddata', function() {
          var attempts = 10;
          function checkVideo() {
            if (attempts > 0) {
              if (video.videoWidth > 0 && video.videoHeight > 0) {
                startTracking();
              } else {
                window.setTimeout(checkVideo, 500);
              }
            } else {
              log('Unable to play video stream. Is webcam working?');
            }
            attempts--;
          }
          checkVideo();
        }, false);
        video.play();

        $(window).unload(function() {
          video.pause();
          video.src = null;
        });
      }, function (error) {
        log('WebRTC not available.')
      });
    } catch (error) {
      log(error)
    }
  };

  function startTracking() {
    canvasWidth     = canvas.width;
    canvasHeight    = canvas.height;
    ctx             = canvas.getContext('2d');
    ctx.fillStyle   = "rgb(0,255,0)";
    ctx.strokeStyle = "rgb(0,255,0)";

    var scale = Math.min(max_work_size / video.videoWidth, max_work_size / video.videoHeight),
        w     = (video.videoWidth * scale) | 0,
        h     = (video.videoHeight * scale) | 0;

    img_u8    = new jsfeat.matrix_t(w, h, jsfeat.U8_t | jsfeat.C1_t);
    edg       = new jsfeat.matrix_t(w, h, jsfeat.U8_t | jsfeat.C1_t);
    ii_sum    = new Int32Array((w + 1) * (h + 1));
    ii_sqsum  = new Int32Array((w + 1) * (h + 1));
    ii_tilted = new Int32Array((w + 1) * (h + 1));
    ii_canny  = new Int32Array((w + 1) * (h + 1));

    work_canvas        = document.createElement('canvas');
    work_canvas.width  = w;
    work_canvas.height = h;
    work_ctx           = work_canvas.getContext('2d');

    compatibility.requestAnimationFrame(tick);
  };

  function tick() {
    compatibility.requestAnimationFrame(tick);
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);

       work_ctx.drawImage(video, 0, 0, work_canvas.width, work_canvas.height);
       var imageData = work_ctx.getImageData(0, 0, work_canvas.width, work_canvas.height);
   //  var imageData = substract_background();

      jsfeat.imgproc.grayscale(imageData.data, img_u8.data);

      if(options.equalize_histogram) {
        jsfeat.imgproc.equalize_histogram(img_u8, img_u8);
      }
      jsfeat.imgproc.gaussian_blur(img_u8, img_u8, 9);


      // // Fist
      // jsfeat.imgproc.compute_integral_image(img_u8, ii_sum, ii_sqsum, handfist_classifier.tilted ? ii_tilted : null);

      // if(options.use_canny) {
      //    // goob/ bad in face jsfeat.imgproc.scharr_derivatives(img_u8, edg, 10, 50);
      //     jsfeat.imgproc.sobel_derivatives(img_u8, edg, 10, 50);
      //     jsfeat.imgproc.compute_integral_image(edg, ii_canny, null, null);
      // }

      // jsfeat.haar.edges_density = options.edges_density;
      // var rects = jsfeat.haar.detect_multi_scale(ii_sum, ii_sqsum, ii_tilted, options.use_canny? ii_canny : null, img_u8.cols, img_u8.rows, handfist_classifier, options.scale_factor, options.min_scale);
      // rects = jsfeat.haar.group_rectangles(rects, 1);

      // var on = rects.length,
      //     max = 1,
      //     scale = canvasWidth/img_u8.cols;
      // if(on && max) {
      //   jsfeat.math.qsort(rects, 0, on-1, function(a,b){return (b.confidence<a.confidence);})
      // }
      // var n = max || rects.length;
      // n = Math.min(n, rects.length);
      // var r;
      // ctx.strokeStyle = 'green';
      // for(var i = 0; i < n; ++i) {
      //  // if (rects[i].confidence > 0){
      //     analyse_fist(rects[i]);
      //     // draw only most confident one
      //     draw_squares(ctx, rects[i], scale);
      //   //}
      // }

      options.skiped_frames--;
      if (options.skiped_frames <= 0) {
        options.skiped_frames = options.frames_to_skip;
        options.detections = 0;
      }
    //  Open hand
      jsfeat.imgproc.compute_integral_image(img_u8, ii_sum, ii_sqsum, handopen_classifier.tilted ? ii_tilted : null);

      if(options.use_canny) {
          jsfeat.imgproc.sobel_derivatives(img_u8, edg, 10, 50);
          jsfeat.imgproc.compute_integral_image(edg, ii_canny, null, null);
      }

      jsfeat.haar.edges_density = options.edges_density;
      var rects = jsfeat.haar.detect_multi_scale(ii_sum, ii_sqsum, ii_tilted, options.use_canny? ii_canny : null, img_u8.cols, img_u8.rows, handopen_classifier, options.scale_factor, options.min_scale);
      rects = jsfeat.haar.group_rectangles(rects, 1);

      var on = rects.length,
          max = 1,
          scale = canvasWidth/img_u8.cols;
      if(on && max) {
        jsfeat.math.qsort(rects, 0, on-1, function(a,b){return (b.confidence<a.confidence);})
      }
      var n = max || rects.length;
      n = Math.min(n, rects.length);
      var r;
      ctx.strokeStyle = 'blue';
      for(var i = 0; i < n; ++i) {
        // if (rects[i].confidence > 0){
          analyse_openhand(rects[i]);
          // draw only most confident one
          draw_squares(ctx, rects[i], scale);
        // }
      }
    }
  };

  function substract_background() {
    work_ctx.drawImage(video, 0, 0, work_canvas.width, work_canvas.height);

    var sourceData = work_ctx.getImageData(0, 0, work_canvas.width, work_canvas.height);
      // create an image if the previous image doesn’t exist
     if (!lastImageData) {
      lastImageData = work_ctx.getImageData(0, 0, work_canvas.width, work_canvas.height);
      for (var i = 0; i < buffers_count; i+=1) {
        buffers[i] = work_ctx.getImageData(0, 0, work_canvas.width, work_canvas.height);
      }
    }
    frames_skipped -= 1;
    if (frames_skipped == 0) {
      var i = 0, j = 0;
      while (i < (lastImageData.data.length * 0.25)) {
        j = 4 * i;
        lastImageData.data[j] = fastAbs(sourceData.data[j] - lastImageData.data[j]);
        lastImageData.data[j + 1] = fastAbs(sourceData.data[j + 1] - lastImageData.data[j + 1]);
        lastImageData.data[j + 2] = fastAbs(sourceData.data[j + 2] - lastImageData.data[j + 2]);
        lastImageData.data[j + 3] = 0xFF;
        // lastImageData.data[j] = (lastImageData.data[j] + buffersAVG(j)) / 2;
        // lastImageData.data[j + 1] = (buffersAVG(j+1) + lastImageData.data[j + 1]) / 2;
        // lastImageData.data[j + 2] = (buffersAVG(j+2) + lastImageData.data[j + 2]) / 2;
        // lastImageData.data[j + 3] = 0xFF
        // lastImageData.data[j] = (lastImageData.data[j] + buffersAVG(j)) / 2;
        // lastImageData.data[j + 1] = (buffersAVG(j+1) + lastImageData.data[j + 1]) / 2;
        // lastImageData.data[j + 2] = (buffersAVG(j+2) + lastImageData.data[j + 2]) / 2;
        // lastImageData.data[j + 3] = 0xFF;;
        ++i;
      }
      // buffer_index = (buffer_index + 1) % buffers_count;
      // buffers[buffer_index] = work_ctx.getImageData(0, 0, work_canvas.width, work_canvas.height);
      frames_skipped = frames_to_skip;
    }
    // create a ImageData instance to receive the blended result
    var blendedData = work_ctx.createImageData(work_canvas.width, work_canvas.height);
    // blend the 2 images
    differenceAccuracy(blendedData.data, sourceData.data, lastImageData.data);

    ctx.putImageData(blendedData, 0, 0);

    return blendedData;
  };

  function buffersAVG(j) {
    var d = 0;
    for (var i = 0; i < buffers_count; i+=1) {
      d += buffers[i].data[j];
    }
    return d / buffers_count;
  };

  function analyse_fist(r) {
    options.detections++;
    options.fist_delta_x += r.x - options.fist_origin_x;
    if (options.detections >= options.detections_threshold) {
      if (options.fist_detected) {
        if (options.fist_delta_x > options.move_threshold_y) {
          log('RIGHT >>>');
        } else if (options.fist_delta_x < -options.move_threshold_y) {
          log('<<< LEFT');
        } else {
          log('CLOSED FIST');
        }
        options.fist_delta_x = 0;
        options.fist_detected = false;
      } else {
        options.fist_detected = true;
        options.fist_origin_x = r.x;
      }
      options.skiped_frames = options.frames_to_skip;
      options.detections = 0;
    }
  };

  function analyse_openhand(r) {
    if (!options.fist_detected) {
      if (options.openhand_detected) {
        options.detections++;
        options.skiped_frames--;
        if (options.skiped_frames == 0 && options.detections >= options.detections_threshold) {
          log('OPEN HAND');
          options.openhand_detected = false;
        }
      } else {
        options.openhand_detected = true;
        options.skiped_frames = options.frames_to_skip;
        options.detections = 0;
      }
    }
  };

  function draw_squares(ctx, r, sc) {
    ctx.strokeRect((r.x*sc)|0,(r.y*sc)|0,(r.width*sc)|0,(r.height*sc)|0);
  };

  function log(message) {
    console.log('VT:' + message);
  };

  function abs (value) {
    return (value ^ (value >> 31)) - (value >> 31);
  };

  function fastAbs(value) {
          // funky bitwise, equal Math.abs
          return (value ^ (value >> 31)) - (value >> 31);
  };

  function threshold(value) {
          return (value > 0x35) ? 255 : 0;
  };

  function difference(target, data1, data2) {
          // blend mode difference
          if (data1.length != data2.length) return null;
          var i = 0;
          while (i < (data1.length * 0.25)) {
                  target[4 * i] = data1[4 * i] == 0 ? 0 : fastAbs(data1[4 * i] - data2[4 * i]);
                  target[4 * i + 1] = data1[4 * i + 1] == 0 ? 0 : fastAbs(data1[4 * i + 1] - data2[4 * i + 1]);
                  target[4 * i + 2] = data1[4 * i + 2] == 0 ? 0 : fastAbs(data1[4 * i + 2] - data2[4 * i + 2]);
                  target[4 * i + 3] = 0xFF;
                  ++i;
          }
  };

  function differenceAccuracy(target, data1, data2) {
          if (data1.length != data2.length) return null;
          var i = 0;
          while (i < (data1.length * 0.25)) {
                  var average1 = (data1[4 * i] + data1[4 * i + 1] + data1[4 * i + 2]) / 3;
                  var average2 = (data2[4 * i] + data2[4 * i + 1] + data2[4 * i + 2]) / 3;
                  var diff = threshold(fastAbs(average1 - average2));
                  // target[4 * i] = diff;
                  // target[4 * i + 1] = diff;
                  // target[4 * i + 2] = diff;
                  // target[4 * i + 3] = 0xFF;
                  if (diff == 255) {
                    target[4 * i] = data1[4 * i] ;
                    target[4 * i + 1] = data1[4 * i + 1] ;
                    target[4 * i + 2] = data1[4 * i + 2] ;
                    target[4 * i + 3] = data1[4 * i + 3] ;
                  } else {
                    target[4 * i] = diff;
                   target[4 * i + 1] = diff;
                   target[4 * i + 2] = diff;
                   target[4 * i + 3] = 0xFF;
                  }
                  ++i;
          }
  };


  return {
      init: init,
      start: start
  };
})();
