export default class DiffCam {
  constructor(width, height) {
    this.canvas = {
      motion: document.getElementById('motion'),
      capture: document.createElement('canvas'), // internal canvas for capturing full images from video
      diff: document.createElement('canvas'), // internal canvas for diffing downscaled captures
    };

    let widthNav =
      window.innerWidth ||
      document.documentElement.clientWidth ||
      document.body.clientWidth;
    let widthCanvas = 0;
    if (widthNav > 2500) {
      widthCanvas = 2500 * 0.6;
    } else if (widthNav > 930 && widthNav <= 2500) {
      widthCanvas = Math.floor(widthNav * 0.6);
    } else {
      widthCanvas = Math.floor(widthNav * 0.9);
    }

    let ratio = this.gcd(width, height);

    this.captureIntervalTime = 100; // time between captures, in ms
    this.canvasWidth = widthCanvas; // responsive size for canvas
    this.canvasHeight = widthCanvas / (width / ratio) * (height / ratio);
    this.isReadyToDiff = false;
    this.pixelDiffThreshold = 200; // min for a pixel to be considered significant
    this.scoreThreshold = 32; // min for an image to be considered significant

    this.motionCoordsL = [];
    this.motionCoordsR = [];
    this.savedCoords = [];
    this.rgba = [];
    this.diffSwitch = false;
    this.resettingStep = false;
    this.score = {
      right: 0,
      left: 0,
    };
    this.debug = false;

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
    this.canvas.motion.classList.add('visible');
    this.captureInterval = setInterval(() => {
      this.capture(video);
    }, this.captureIntervalTime);
  }

  capture(video) {
    this.captureContext.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    this.motionContext.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

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
      this.rgba = diffImageData.data;
      // pixel adjustments are done by reference directly on diffImageData
      for (let i = 0; i < this.rgba.length; i += 4) {
        const pixelDiff =
          this.rgba[i] * 0.6 + this.rgba[i + 1] * 0.6 + this.rgba[i + 2] * 0.6;
        if (pixelDiff >= this.pixelDiffThreshold) {
          const coords = this.calculateCoordinates(i / 4);
          if (coords.x < this.canvasWidth / 2) {
            this.motionCoordsL.push({x: coords.x, y: coords.y});
          } else {
            this.motionCoordsR.push({x: coords.x, y: coords.y});
          }
        }
      }
      this.rgba = [];
    }
    if (this.isReadyToDiff) {
      // drawing if it's above level
      if (this.motionCoordsL.length > 750) {
        this.motionContext.fillStyle = '#FFF200';
        this.draw(0, 0.4);
        this.saveDiff(this.motionCoordsL);
      }
      if (this.motionCoordsR.length > 750) {
        this.motionContext.fillStyle = '#F46060';
        this.draw(this.canvasWidth / 2, 0.4);
        this.saveDiff(this.motionCoordsR);
      }
      // drawing all save motion data
      if (this.debug) {
        for (var y = 0; y < this.savedCoords.length; y++) {
          if (this.savedCoords[y].x < this.canvasWidth / 2) {
            this.motionContext.fillStyle = '#FFF200';
          } else {
            this.motionContext.fillStyle = '#F46060';
          }
          this.motionContext.fillRect(
            this.savedCoords[y].x - 2,
            this.savedCoords[y].y - 2,
            4,
            4
          );
        }
      }
    }

    if (this.resettingStep) {
      if (this.score.left > 1000) {
        this.motionContext.fillStyle = '#FFF200';
        this.draw(0, 0.7);
      }
      if (this.score.right > 1000) {
        this.motionContext.fillStyle = '#F46060';
        this.draw(this.canvasWidth / 2, 0.7);
      }
    }

    // separation for 2 players
    this.motionContext.beginPath();
    this.motionContext.moveTo(this.canvasWidth / 2, 0);
    this.motionContext.lineTo(this.canvasWidth / 2, this.canvasHeight);
    this.motionContext.strokeStyle = '#ffffff';
    this.motionContext.stroke();

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

  draw(start, alpha) {
    this.motionContext.globalAlpha = alpha;
    this.motionContext.fillRect(
      start,
      0,
      this.canvasWidth / 2,
      this.canvasHeight
    );
    this.motionContext.globalAlpha = 1.0;
  }

  saveDiff(motionCoords) {
    this.savedCoords = this.savedCoords.concat(motionCoords);
  }

  reset(all) {
    this.motionCoordsL = [];
    this.motionCoordsR = [];
    if (all) {
      this.savedCoords = [];
      this.score.right = 0;
      this.score.left = 0;
    }
  }

  backBase() {
    for (var i = 0; i < this.savedCoords.length; i++) {
      if (this.savedCoords[i].x > this.canvasWidth / 2) {
        this.score.right++;
      } else {
        this.score.left++;
      }
    }
  }

  stop() {
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.motionContext.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
      this.diffContext.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
      this.canvas.motion.classList.remove('visible');
      this.isReadyToDiff = false;
    }
  }

  gcd(a, b) {
    return b == 0 ? a : this.gcd(b, a % b);
  }
}
