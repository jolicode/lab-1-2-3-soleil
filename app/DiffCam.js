export default class DiffCam {
  constructor() {
    this.canvas = {
      motion: document.getElementById('motion'),
      capture: document.createElement('canvas'), // internal canvas for capturing full images from video
      diff: document.createElement('canvas'), // internal canvas for diffing downscaled captures
    };

    this.captureIntervalTime = 100; // time between captures, in ms
    this.canvasWidth = 640; // full captured image width
    this.canvasHeight = 480; // full captured image height
    this.isReadyToDiff = false;
    this.pixelDiffThreshold = 128; // min for a pixel to be considered significant
    this.scoreThreshold = 32; // min for an image to be considered significant

    this.motionCoords = [];
    this.diffSwitch = false;

    this.canvas.capture.width = this.canvasWidth;
    this.canvas.capture.height = this.canvasHeight;
    this.captureContext = this.canvas.capture.getContext('2d');

    this.canvas.diff.width = this.canvasWidth;
    this.canvas.diff.height = this.canvasHeight;
    this.diffContext = this.canvas.diff.getContext('2d');

    this.canvas.motion.width = this.canvasWidth;
    this.canvas.motion.height = this.canvasHeight;
    this.motionContext = this.canvas.motion.getContext('2d');
  }

  start(video) {
    this.captureInterval = setInterval(() => {
      this.capture(video);
    }, this.captureIntervalTime);
  }

  capture(video) {
    this.captureContext.drawImage(
      video,
      0,
      0,
      this.canvasWidth,
      this.canvasHeight
    );
    var captureImageData = this.captureContext.getImageData(
      0,
      0,
      this.canvasWidth,
      this.canvasHeight
    );
    // Black and white result canvas
    var rgbaMotion = captureImageData.data;
    for (var i = 0; i < rgbaMotion.length; i += 4) {
      var myRed = rgbaMotion[i];
      var myGreen = rgbaMotion[i + 1];
      var myBlue = rgbaMotion[i + 2];
      // calculate grey
      var myGray = parseInt((myRed + myGreen + myBlue) / 3);
      // make pixel gray
      rgbaMotion[i] = myGray;
      rgbaMotion[i + 1] = myGray;
      rgbaMotion[i + 2] = myGray;
    }

    this.motionContext.putImageData(captureImageData, 0, 0);

    // diff current capture over previous capture, leftover from last time
    this.diffContext.globalCompositeOperation = 'difference';
    this.diffContext.drawImage(
      video,
      0,
      0,
      this.canvasWidth,
      this.canvasHeight
    );

    var diffImageData = this.diffContext.getImageData(
      0,
      0,
      this.canvasWidth,
      this.canvasHeight
    );

    if (this.isReadyToDiff && this.diffSwitch) {
      let rgba = diffImageData.data;
      // pixel adjustments are done by reference directly on diffImageData
      let score = 0;
      for (let i = 0; i < rgba.length; i += 4) {
        const pixelDiff = rgba[i] * 0.6 + rgba[i + 1] * 0.6 + rgba[i + 2] * 0.6;
        if (pixelDiff >= this.pixelDiffThreshold) {
          score++;
          const coords = this.calculateCoordinates(i / 4);
          this.motionCoords.push({x: coords.x, y: coords.y});
        }
      }
      // code for having a box around all changes
      //var motionBoxArea = 30;
      // var motionBoxes = [];
      if (score > this.scoreThreshold) {
        // if (motionBoxes.length == 0 && diff.motionCoords[0]) {
        //   motionBoxes.push({
        //     x: { min: diff.motionCoords[0].x, max: diff.motionCoords[0].x },
        //     y: { min: diff.motionCoords[0].y, max: diff.motionCoords[0].y }
        //   });
        // }
        // for (var i = 0; i < diff.motionCoords.length; i++) {
        //   for (var k = 0; k < motionBoxes.length; k++) {
        //     if (diff.motionCoords[i].x > motionBoxes[k].x.min - motionBoxArea &&
        //       diff.motionCoords[i].x < motionBoxes[k].x.max + motionBoxArea &&
        //       diff.motionCoords[i].y > motionBoxes[k].y.min - motionBoxArea &&
        //       diff.motionCoords[i].y < motionBoxes[k].y.max + motionBoxArea ) {
        //
        //         motionBoxes[k] = calculateMotionBox(motionBoxes[k], diff.motionCoords[i].x, diff.motionCoords[i].y);
        //
        //     } else {
        //       motionBoxes.push({
        //   			x: { min: diff.motionCoords[i].x, max: diff.motionCoords[i].x },
        //   			y: { min: diff.motionCoords[i].y, max: diff.motionCoords[i].y }
        //   		});
        //     }
        //   }
        // }
        // for canvas result
        // motionContext.fillStyle = '#ffa';
        // for (var i = 0; i < motionBoxes.length; i++) {
        //   motionContext.fillRect(motionBoxes[i].x.min + 0.5, motionBoxes[i].y.min + 0.5, motionBoxes[i].x.max - motionBoxes[i].x.min, motionBoxes[i].y.max - motionBoxes[i].y.min);
        // }
        // for div on video result
        // var box = diff.motionBox;
        // var scale = 1;
        // var left = box.x.min * scale + 1;
        // var top = box.y.min * scale + 1;
        // var width = (box.x.max - box.x.min) * scale;
        // var height = (box.y.max - box.y.min) * scale;
        // TODO : improve signalisation
        //   motionBoxes.push(document.createElement("div"))
        //   motionBoxDiv.classList.add("motion-box");
        //   document.getElementById('box-container').append(motionBoxDiv);
        //   motionBoxDiv.style.left = left+'px';
      }
    }

    // drawing all save motion data
    for (var y = 0; y < this.motionCoords.length; y++) {
      this.motionContext.fillStyle = '#FFF200';
      this.motionContext.fillRect(
        this.motionCoords[y].x - 2,
        this.motionCoords[y].y - 2,
        4,
        4
      );
    }

    // draw current capture normally over diff, ready for next time
    this.diffContext.globalCompositeOperation = 'source-over';
    this.diffContext.drawImage(
      video,
      0,
      0,
      this.canvasWidth,
      this.canvasHeight
    );
    this.isReadyToDiff = true;
  }

  calculateCoordinates(pixelIndex) {
    return {
      x: pixelIndex % this.canvasWidth,
      y: Math.floor(pixelIndex / this.canvasWidth),
    };
  }

  reset() {
    this.motionCoords = [];
  }

  stop() {
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
    }
  }
  // function calculateMotionBox(currentMotionBox, x, y) {
  //   // init motion box on demand
  //   var motionBox = currentMotionBox || {
  //     x: {
  //       min: coords.x,
  //       max: x,
  //     },
  //     y: {
  //       min: coords.y,
  //       max: y,
  //     },
  //   };
  //
  //   motionBox.x.min = Math.min(motionBox.x.min, x);
  //   motionBox.x.max = Math.max(motionBox.x.max, x);
  //   motionBox.y.min = Math.min(motionBox.y.min, y);
  //   motionBox.y.max = Math.max(motionBox.y.max, y);
  //   return motionBox;
  // }
}
