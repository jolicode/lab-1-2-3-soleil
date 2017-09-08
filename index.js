var playButton;

var stream; // stream obtained from webcam
var video; // shows stream
var captureCanvas; // internal canvas for capturing full images from video
var captureContext; // context for capture canvas
var diffCanvas; // internal canvas for diffing downscaled captures
var diffContext; // context for diff canvas
var motionCanvas; // receives processed diff images
var motionContext; // context for motion canvas

var captureInterval; // interval for continuous captures
var captureIntervalTime; // time between captures, in ms
var captureWidth; // full captured image width
var captureHeight; // full captured image height
var diffWidth; // downscaled width for diff/motion
var diffHeight; // downscaled height for diff/motion

var isReadyToDiff; // has a previous capture been made to diff against?

var pixelDiffThreshold; // min for a pixel to be considered significant
var scoreThreshold; // min for an image to be considered significant
var includeMotionBox; // flag to calculate and draw motion bounding box
var motionBoxArea = 30;

video = document.getElementById('video');
motionCanvas = document.getElementById('motion');
captureCanvas = document.createElement('canvas');
diffCanvas = document.createElement('canvas');
playButton = document.querySelector('.play-button');
var gameCounter = document.getElementById('gameCount');
var eyes = document.querySelectorAll('.eyesPicto');

// settings
captureIntervalTime = 100;
captureWidth = 640;
captureHeight = 480;
diffWidth = 640;
diffHeight = 480;
pixelDiffThreshold = 128;
scoreThreshold = 32;
includeMotionBox = true;
var win = false;
var start = false;

isReadyToDiff = false;

captureCanvas.width = captureWidth;
captureCanvas.height = captureHeight;
captureContext = captureCanvas.getContext('2d');

diffCanvas.width = diffWidth;
diffCanvas.height = diffHeight;
diffContext = diffCanvas.getContext('2d');

motionCanvas.width = diffWidth;
motionCanvas.height = diffHeight;
motionContext = motionCanvas.getContext('2d');

var motionBoxContainer = document.getElementById('box-container');
//var motionBoxDiv = document.querySelector('.motion-box');
var motionBoxes = [];
var motionCoords = [];

var motionBoxDiv;
var playingSwitch = true;

var constraints = {
    audio: false,
    video: {
        width: captureWidth,
        height: captureHeight
    }
};

playButton.addEventListener('click', (e) => {
  e.preventDefault();
  setTimer(document.getElementById('start'), () => {
    navigator.mediaDevices.getUserMedia(constraints).then(initSuccess).catch(initError);
  });
})

function initSuccess(requestedStream) {
    start = true;
    win = false;
    stream = requestedStream;
    video.srcObject = stream;
    captureInterval = setInterval(capture, captureIntervalTime);
    playing();
}

function initError(error) {
    console.log(error);
}

function playing() {

  for (var i = 0; i < eyes.length; i++) {
    if (eyes[i].dataset.number == 2) {
      eyes[i].classList.toggle('visible');
    }
    if (eyes[i].dataset.number == 1) {
      eyes[i].classList.remove('visible');
    }
  }
  if (!win) {
    console.log('data reset');

    var playingTimer = setTimer(gameCounter, () => {
      playingSwitch = false;
      motionCoords = [];
      if (motionCoords.length > 1000) {
        gameCounter.innerHTML = "1";
        gameCounter.dataset.time = 1000;
        resetting();
      } else {
        gameCounter.innerHTML = "3";
        gameCounter.dataset.time = 3000;
        waiting();
      }
    })
  }
}

function resetting() {
  var resettingTimer = setTimer(gameCounter, () => {
    gameCounter.innerHTML = "3";
    gameCounter.dataset.time = 3000;
    waiting();
  })
}

function waiting() {
  if (!win) {
    for (var i = 0; i < eyes.length; i++) {
      if (eyes[i].dataset.number == 2) {
        eyes[i].classList.remove('visible');
      }
      if (eyes[i].dataset.number == 1) {
        eyes[i].classList.toggle('visible');
      }
    }
    var waitingTimer = setTimer(gameCounter, () => {
      gameCounter.innerHTML = "3";
      gameCounter.dataset.time = 3000;
      playingSwitch = true;
      playing();
    })
  }
}

function capture() {

    captureContext.drawImage(video, 0, 0, captureWidth, captureHeight);
    var captureImageData = captureContext.getImageData(0, 0, captureWidth, captureHeight);

    // Black and white result canvas
    var rgbaMotion = captureImageData.data;
    for (var i = 0; i < rgbaMotion.length; i+=4) {
      var myRed = rgbaMotion[i];
      var myGreen = rgbaMotion[i + 1];
      var myBlue = rgbaMotion[i + 2];

      var myGray = parseInt((myRed + myGreen + myBlue) / 3);

      rgbaMotion[i] = myGray;
      rgbaMotion[i + 1] = myGray;
      rgbaMotion[i + 2] = myGray;
    }

    motionContext.putImageData(captureImageData, 0, 0);

    // diff current capture over previous capture, leftover from last time
    diffContext.globalCompositeOperation = 'difference';
    diffContext.drawImage(video, 0, 0, diffWidth, diffHeight);

    var diffImageData = diffContext.getImageData(0, 0, diffWidth, diffHeight);

    if (isReadyToDiff && playingSwitch) {

      var diff = processDiff(diffImageData);

      // code for having a box around all changes
      if (diff.updateMotionBox) {

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
    for (var y = 0; y < motionCoords.length; y++) {
      motionContext.fillStyle = "cyan";
      motionContext.fillRect(motionCoords[y].x - 2, motionCoords[y].y - 2, 4, 4)
    }

    // draw current capture normally over diff, ready for next time
    diffContext.globalCompositeOperation = 'source-over';
    diffContext.drawImage(video, 0, 0, diffWidth, diffHeight);
    if (!isReadyToDiff) {
      isReadyToDiff = true;
    }
}

function processDiff(diffImageData) {

    var rgba = diffImageData.data;

    // pixel adjustments are done by reference directly on diffImageData
    var score = 0;

    for (var i = 0; i < rgba.length; i += 4) {

        var pixelDiff = rgba[i] * 0.6 + rgba[i + 1] * 0.6 + rgba[i + 2] * 0.6;
        var normalized = Math.min(255, pixelDiff * (255 / pixelDiffThreshold));
        // rgba[i] = normalized;
        // rgba[i + 1] = normalized;
        // rgba[i + 2] = normalized;

        if (pixelDiff >= pixelDiffThreshold) {
            score++;
            coords = calculateCoordinates(i / 4);

            motionContext.fillStyle = "yellow";
            //motionContext.fillRect(100, 100, 100, 100)
            motionContext.fillRect(coords.x - 2, coords.y - 2, 4, 4)

            motionCoords.push({
              x: coords.x,
              y: coords.y
            })

        }
    }

    return {
        score: score,
        updateMotionBox: score > scoreThreshold ? true : false,
        motionCoords : motionCoords
    };
}

// win checking
document.onkeydown = checkKey;

function checkKey(e) {

    e = e || window.event;

    if (e.keyCode == '32') {
      if (start) {
        start = false;
        win = true;
        clearInterval(captureInterval);
        var winText = document.querySelector('.win');
        winText.classList.add('visible');
      }
    }
}

function setTimer(el, callback) {
  var time = el.dataset.time;
  var timerInterval = setInterval(() => {
    if (time > 1000) {
      time -= 1000;
      el.innerHTML = time/1000
    } else {
      el.innerHTML = 0;
      clearInterval(timerInterval);
      callback();
    }
  }, 1000)
}

function getStyleValue(elem,prop) {
  var cs = window.getComputedStyle(elem,null);
  if (prop) {
    return cs.getPropertyValue(prop).match(/\d+/);;
  }
}

function calculateCoordinates(pixelIndex) {
    return {
        x: pixelIndex % diffWidth,
        y: Math.floor(pixelIndex / diffWidth)
    };
}

function calculateMotionBox(currentMotionBox, x, y) {
		// init motion box on demand
		var motionBox = currentMotionBox || {
			x: { min: coords.x, max: x },
			y: { min: coords.y, max: y }
		};

		motionBox.x.min = Math.min(motionBox.x.min, x);
		motionBox.x.max = Math.max(motionBox.x.max, x);
		motionBox.y.min = Math.min(motionBox.y.min, y);
		motionBox.y.max = Math.max(motionBox.y.max, y);

		return motionBox;
	}
