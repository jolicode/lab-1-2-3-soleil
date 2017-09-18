import DiffCam from './DiffCam';

const MyDiffCam = new DiffCam();
const domElements = {
  video: document.getElementById('video'),
  playButton: document.querySelector('.play-button'),
  eyes: document.querySelectorAll('.eyesPicto'),
  rules: document.querySelector('.rules'),
  alerts: document.querySelector('.alerts'),
  spotted: document.querySelector('.spotted'),
  win: document.querySelector('.win'),
};

var counters = {
  game: {
    el: document.getElementById('gameCount'),
    sec: 3,
  },
  start: {
    el: document.getElementById('start'),
    sec: 1,
  },
};

// settings
let win = false;
let start = false;
let firstTime = true;
let gameTimer;

domElements.playButton.addEventListener('click', e => {
  e.preventDefault();
  const constraints = {
    audio: false,
    video: {
      width: 640,
      height: 480,
    },
  };
  domElements.playButton.classList.toggle('visible');
  setTimer(counters.start, () => {
    if (firstTime) {
      if (navigator.mediaDevices === undefined) {
        navigator.mediaDevices = {};
      }
      if (navigator.mediaDevices.getUserMedia === undefined) {
        navigator.mediaDevices.getUserMedia = function(constraints) {
          // First get ahold of the legacy getUserMedia, if present
          var getUserMedia =
            navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
          // Some browsers just don't implement it - return a rejected promise with an error
          // to keep a consistent interface
          if (!getUserMedia) {
            return Promise.reject(
              new Error('getUserMedia is not implemented in this browser')
            );
          }
          // Otherwise, wrap the call to the old navigator.getUserMedia with a Promise
          return new Promise(function(resolve, reject) {
            getUserMedia.call(navigator, constraints, resolve, reject);
          });
        };
      }
      navigator.mediaDevices
        .getUserMedia(constraints)
        .then(initSuccess)
        .catch(initError);
      firstTime = false;
    } else {
      start = true;
      win = false;
      startComplete();
    }
    counters.start.el.classList.toggle('visible');
    domElements.win.classList.remove('visible');
    domElements.rules.classList.toggle('out');
    domElements.alerts.classList.toggle('out');
  });
});

function initSuccess(requestedStream) {
  start = true;
  win = false;
  var stream = requestedStream;
  if (!stream) {
    throw 'Cannot start after init fail';
  }
  // streaming takes a moment to start
  domElements.video.addEventListener('canplay', startComplete);
  domElements.video.srcObject = stream;
}

function startComplete() {
  domElements.video.removeEventListener('canplay', startComplete);
  MyDiffCam.start(domElements.video);

  //init game to waiting state
  let time = 4;
  MyDiffCam.diffSwitch = false;
  MyDiffCam.reset();
  let nextStep = 2;

  gameTimer = setInterval(() => {
    // faire evoluer le compteur
    if (time > 0 && time < 4) {
      time -= 1;
      counters.game.el.innerHTML = time;
      if (nextStep == 3) {
        toggleEyes(time + 3);
      }

      if (MyDiffCam.motionCoords.length > 1500) {
        domElements.spotted.classList.add('visible');
      }
      // check si une function est à lancer
    } else if (time == 4 && !win) {
      time -= 1;
      counters.game.el.innerHTML = time;
      switch (nextStep) {
        case 1: // playing
          MyDiffCam.diffSwitch = true;
          toggleEyes(2);
          break;
        case 2: // waiting
          toggleEyes(1);
          MyDiffCam.diffSwitch = false;
          MyDiffCam.reset();
          domElements.spotted.classList.remove('visible');
          break;
        case 3: // resetting
          toggleEyes(3);
          MyDiffCam.diffSwitch = false;
          MyDiffCam.reset();
          break;
      }
    } else if (time == 0 && !win) {
      counters.game.el.innerHTML = 0;
      switch (nextStep) {
        case 1: // playing
          if (MyDiffCam.motionCoords.length > 1500) {
            nextStep = 3;
          } else {
            nextStep = 2;
          }
          break;
        case 2: // waiting
          nextStep = 1;
          break;
        case 3: // resetting
          nextStep = 2;
          break;
      }
      //resetting time to start step
      time = 4;
    }
  }, 1000);
}

function initError(error) {
  domElements.rules.innerHTML = error;
}

function setTimer(counter, callback) {
  var time = counter.sec;
  var timerInterval = setInterval(() => {
    if (time >= 0) {
      counter.el.innerHTML = time;
      time -= 1;
    } else {
      counter.el.innerHTML = 0;
      clearInterval(timerInterval);
      callback();
    }
  }, 1000);
}

function toggleEyes(number) {
  for (var i = 0; i < domElements.eyes.length; i++) {
    if (domElements.eyes[i].dataset.number == number) {
      domElements.eyes[i].classList.toggle('visible');
    } else {
      domElements.eyes[i].classList.remove('visible');
    }
  }
}

// win checking
document.onkeydown = checkKey;

function checkKey(e) {
  e = e || window.event;
  if (e.keyCode == '32' && start) {
    // win and reset
    start = false;
    win = true;
    MyDiffCam.stop();
    clearInterval(gameTimer);
    domElements.win.classList.add('visible');
    domElements.playButton.innerHTML = 'Re-play';
    domElements.playButton.classList.toggle('visible');
    domElements.rules.classList.toggle('out');
    domElements.alerts.classList.toggle('out');
    counters.start.el.classList.toggle('visible');
    toggleEyes(-1);
    counters.start.el.innerHTML = 10;
  }
}
