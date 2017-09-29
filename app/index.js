import DiffCam from './DiffCam';

let MyDiffCam = [];

const domElements = {
  body: document.getElementById('body'),
  video: document.getElementById('video'),
  playButton: document.querySelector('.play-button'),
  eyes: document.querySelectorAll('.eyesPicto'),
  rules: document.querySelector('.rules'),
  alerts: document.querySelector('.alerts'),
  step: document.querySelector('.step'),
  win: document.querySelector('.win'),
};

var counters = {
  game: {
    el: document.getElementById('gameCount'),
    sec: 3,
  },
  start: {
    el: document.getElementById('start'),
    sec: 10,
  },
};

// settings
let win = false;
let start = false;
let firstTime = true;
let gameTimer;
let canWin = false;

domElements.playButton.addEventListener('click', e => {
  e.preventDefault();
  domElements.playButton.classList.toggle('visible');

  if (firstTime) {
    const constraints = {
      audio: false,
      video: {
        width: {min: 640, ideal: 1280, max: 1920},
        height: {min: 400, ideal: 720},
        facingMode: 'user',
        frameRate: {max: 25},
      },
    };
    if (navigator.mediaDevices === undefined) {
      navigator.mediaDevices = {};
    }
    //ask video permission
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
    launchStart();
  }
});

function initSuccess(requestedStream) {
  var stream = requestedStream;
  if (!stream) {
    throw 'Cannot start after init fail';
  }
  // streaming takes a moment to start
  domElements.video.addEventListener('canplay', launchStart);
  domElements.video.srcObject = stream;
  domElements.video.onloadedmetadata = function() {
    MyDiffCam = new DiffCam(this.videoWidth, this.videoHeight);
  };
}

function launchStart() {
  domElements.video.removeEventListener('canplay', launchStart);
  start = true;
  win = false;
  setTimer(counters.start, () => {
    counters.start.el.classList.toggle('visible');
    domElements.win.classList.remove('visible');
    domElements.rules.classList.toggle('out');
    domElements.alerts.classList.toggle('out');
    startComplete();
  });
}

function startComplete() {
  MyDiffCam.start(domElements.video);

  //init game to waiting state
  let time = 0;
  let nextStep = 2;

  gameTimer = setInterval(() => {
    // game counter
    // inside a game step
    if (time > 0 && time < counters.game.sec) {
      time += 1;
      counters.game.el.innerHTML = time;
      const rand = Math.floor(Math.random() * (5 - 2 + 1) + 2);

      switch (nextStep) {
        case 1:
          MyDiffCam.reset(false);
          break;
        case 2:
          synthVoice(time);
          break;
        case 3:
          toggleEyes(rand);
          break;
      }
      // Begin of a game step
    } else if (time == 0 && !win) {
      time += 1;
      counters.game.el.innerHTML = time;
      switch (nextStep) {
        case 1: // playing
          domElements.step.innerHTML = 'Watching';
          domElements.body.classList.add('watch');
          canWin = false;
          MyDiffCam.diffSwitch = true;
          MyDiffCam.resettingStep = false;
          toggleEyes(2);
          break;
        case 2: // waiting
          domElements.step.innerHTML = '';
          toggleEyes(1);
          MyDiffCam.diffSwitch = false;
          MyDiffCam.reset(true);
          canWin = true;
          domElements.body.classList.remove('watch');
          domElements.body.classList.remove('on');
          synthVoice(time);
          break;
        case 3: // resetting
          domElements.step.innerHTML = 'EXTRA TIME';
          domElements.body.classList.add('on');
          toggleEyes(3);
          MyDiffCam.diffSwitch = false;
          MyDiffCam.backBase();
          MyDiffCam.resettingStep = true;
          MyDiffCam.reset(false);
          break;
      }
      // end of a game step and setting the next one
    } else if (time == counters.game.sec && !win) {
      counters.game.el.innerHTML = '..';
      switch (nextStep) {
        case 1: // playing
          MyDiffCam.reset(false);
          if (MyDiffCam.savedCoords.length > 0) {
            nextStep = 3;
            counters.game.sec = 5;
          } else {
            nextStep = 2;
          }
          break;
        case 2: // waiting
          counters.game.el.innerHTML = 'SOLEIL';
          synthVoice('soleil');
          nextStep = 1;
          break;
        case 3: // resetting
          domElements.step.innerHTML = 'Ready ?';
          nextStep = 2;
          counters.game.sec = 3;
          break;
      }
      time = 0;
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
      domElements.eyes[i].classList.add('visible');
    } else {
      domElements.eyes[i].classList.remove('visible');
    }
  }
}

// win checking
document.onkeydown = checkKey;

function checkKey(e) {
  e = e || window.event;
  if (e.keyCode == '32') {
    resetGame();
  }
  if (e.keyCode == '38' && MyDiffCam != undefined) {
    MyDiffCam.debug = MyDiffCam.debug == true ? false : true;
  }
}

domElements.body.addEventListener('touchend', resetGame, false);

function resetGame() {
  if (start && canWin) {
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

function synthVoice(text) {
  //const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance();
  utterance.text = text;
  utterance.lang = 'fr-FR';
  //synth.speak(utterance);
}
