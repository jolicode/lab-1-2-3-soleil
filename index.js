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
// TODO : test ready to diff
//var isReadyToDiff; // has a previous capture been made to diff against?
var pixelDiffThreshold; // min for a pixel to be considered significant
var scoreThreshold; // min for an image to be considered significant
var includeMotionBox; // flag to calculate and draw motion bounding box
var includeMotionPixels; // flag to create object denoting pixels with motion

video = document.getElementById('video');
motionCanvas = document.getElementById('motion');
captureCanvas = document.createElement('canvas');
diffCanvas = document.createElement('canvas');

// settings
captureIntervalTime = 100;
captureWidth = 640;
captureHeight = 480;
diffWidth = 640;
diffHeight = 480;
pixelDiffThreshold = 128;
scoreThreshold = 16;
includeMotionBox = true;
includeMotionPixels = true;

// isReadyToDiff = false;

captureCanvas.width = captureWidth;
captureCanvas.height = captureHeight;
captureContext = captureCanvas.getContext('2d');

diffCanvas.width = diffWidth;
diffCanvas.height = diffHeight;
diffContext = diffCanvas.getContext('2d');

motionCanvas.width = diffWidth;
motionCanvas.height = diffHeight;
motionContext = motionCanvas.getContext('2d');

var motionBoxDiv = document.querySelector('.motion-box');

var constraints = {
    audio: false,
    video: {
        width: captureWidth,
        height: captureHeight
    }
};

navigator.mediaDevices.getUserMedia(constraints).then(initSuccess).catch(initError);

function initSuccess(requestedStream) {
    stream = requestedStream;
    video.srcObject = stream;
    captureInterval = setInterval(capture, captureIntervalTime);
}

function initError(error) {
    console.log(error);
}

function capture() {

    captureContext.drawImage(video, 0, 0, captureWidth, captureHeight);
    var captureImageData = captureContext.getImageData(0, 0, captureWidth, captureHeight);

    // diff current capture over previous capture, leftover from last time
    diffContext.globalCompositeOperation = 'difference';
    diffContext.drawImage(video, 0, 0, diffWidth, diffHeight);
    var diffImageData = diffContext.getImageData(0, 0, diffWidth, diffHeight);

    var diff = processDiff(diffImageData);

    motionContext.putImageData(captureImageData, 0, 0);
    if (diff.motionBox) {
        motionContext.fillStyle = '#ffa';
        motionContext.fillRect(diff.motionBox.x.min + 0.5, diff.motionBox.y.min + 0.5, diff.motionBox.x.max - diff.motionBox.x.min, diff.motionBox.y.max - diff.motionBox.y.min);

        var box = diff.motionBox;
        var right = box.x.min * 1 + 1;
    		var top = box.y.min * 1 + 1;
    		var width = (box.x.max - box.x.min) * 1;
    		var height = (box.y.max - box.y.min) * 1;

        if (motionBoxDiv.style) {
          motionBoxDiv.style.left = right+'px';
          motionBoxDiv.style.top = top+'px';
          motionBoxDiv.style.width = width+'px';
          motionBoxDiv.style.height = height+'px';
        }

    }

    // draw current capture normally over diff, ready for next time
    diffContext.globalCompositeOperation = 'source-over';
    diffContext.drawImage(video, 0, 0, diffWidth, diffHeight);

}

function processDiff(diffImageData) {
    var rgba = diffImageData.data;

    // pixel adjustments are done by reference directly on diffImageData
    var score = 0;
    var motionPixels = includeMotionPixels? [] : undefined;
    var motionBox = undefined;
    for (var i = 0; i < rgba.length; i += 4) {
        var pixelDiff = rgba[i] * 0.3 + rgba[i + 1] * 0.6 + rgba[i + 2] * 0.1;
        var normalized = Math.min(255, pixelDiff * (255 / pixelDiffThreshold));
        rgba[i] = normalized;
        rgba[i + 1] = normalized;
        rgba[i + 2] = normalized;

        if (pixelDiff >= pixelDiffThreshold) {
            score++;
            coords = calculateCoordinates(i / 4);

            if (includeMotionBox) {
    					motionBox = calculateMotionBox(motionBox, coords.x, coords.y);
    				}

    				if (includeMotionPixels) {
    					motionPixels = calculateMotionPixels(motionPixels, coords.x, coords.y, pixelDiff);
    				}

        }
    }

    return {
        score: score,
        motionBox: score > scoreThreshold ? motionBox : undefined,
        motionPixels: motionPixels
    };
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


function calculateMotionPixels(motionPixels, x, y, pixelDiff) {
		motionPixels[x] = motionPixels[x] || [];
		motionPixels[x][y] = true;

		return motionPixels;
	}
