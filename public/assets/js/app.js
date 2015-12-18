(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _backbone = require('backbone');

var _backbone2 = _interopRequireDefault(_backbone);

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

var _modelsListenState = require('./models/ListenState');

var _modelsCurrentUser = require('./models/CurrentUser');

var _audioPlayer = require('./audio-player');

var _router = require('./router');

var _router2 = _interopRequireDefault(_router);

$ = require('jquery');

var Application = (function () {
    function Application() {
        _classCallCheck(this, Application);
    }

    _createClass(Application, [{
        key: 'initialize',
        value: function initialize() {
            var _this = this;

            var router = new _router2['default']();

            _backbone2['default'].$ = $;
            _backbone2['default'].history.start({ pushState: true, hashChange: false });
            //if (!Backbone.history.start({pushState: true, hashChange: false})) router.navigate('404', {trigger: true});

            // Use delegation to avoid initial DOM selection and allow all matching elements to bubble
            $(document).delegate("a", "click", function (evt) {
                // Get the anchor href and protcol
                var href = $(this).attr("href");
                var protocol = this.protocol + "//";

                var openLinkInTab = false;

                // Ensure the protocol is not part of URL, meaning its relative.
                // Stop the event bubbling to ensure the link will not cause a page refresh.
                if (!openLinkInTab && href.slice(protocol.length) !== protocol) {
                    evt.preventDefault();

                    // Note by using Backbone.history.navigate, router events will not be
                    // triggered.  If this is a problem, change this to navigate on your
                    // router.
                    _backbone2['default'].history.navigate(href, true);
                }
            });

            var audioPlayer = new _audioPlayer.AudioPlayerView({ el: '#audio-player' });

            // load user
            var model = new _modelsCurrentUser.CurrentUserModel();
            model.fetch().then(function () {
                return _this.onModelLoaded(model);
            });

            //new ListenStateCollection().fetch().then((state) => console.log("got listen states", state));
        }
    }, {
        key: 'onModelLoaded',
        value: function onModelLoaded(user) {
            console.log("Loaded current user", user.attributes);
            this.currentUser = user;
        }
    }]);

    return Application;
})();

var app = new Application();

exports.app = app;
$(function () {
    // setup raven to push messages to our sentry
    //Raven.config('https://d098712cb7064cf08b74d01b6f3be3da@app.getsentry.com/20973', {
    //    whitelistUrls: ['staging.couchpod.com', 'couchpod.com'] // production only
    //}).install();

    Raven.config('https://db2a7d58107c4975ae7de736a6308a1e@app.getsentry.com/53456', {
        whitelistUrls: ['staging.couchpod.com', 'couchpod.com'] // production only
    }).install();

    app.initialize();

    // for production, could wrap domReadyCallback and let raven handle any exceptions

    /*
     try {
     domReadyCallback();
     } catch(err) {
     Raven.captureException(err);
     console.log("[Error] Unhandled Exception was caught and sent via Raven:");
     console.dir(err);
     }
     */
});

exports['default'] = { Application: Application };

},{"./audio-player":3,"./models/CurrentUser":5,"./models/ListenState":6,"./router":11,"backbone":"backbone","jquery":"jquery"}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _polyfillJs = require('./polyfill.js');

var _polyfillJs2 = _interopRequireDefault(_polyfillJs);

var AudioCapture = (function () {
    function AudioCapture() {
        _classCallCheck(this, AudioCapture);

        // spawn background worker
        this._encodingWorker = new Worker("/assets/js/worker-encoder.min.js");

        console.log("Initialized AudioCapture");

        this._audioContext = null;
        this._audioInput = null;
        this._encodingWorker = null;
        this._isRecording = false;
        this._audioListener = null;
        this._onCaptureCompleteCallback = null;
        this._audioAnalyzer = null;
        this._audioGain = null;
        this._cachedMediaStream = null;

        this._audioEncoder = null;
        this._latestAudioBuffer = [];
        this._cachedGainValue = 1;
        this._onStartedCallback = null;

        this._fftSize = 256;
        this._fftSmoothing = 0.8;
        this._totalNumSamples = 0;

        _polyfillJs2['default'].install();
    }

    /*
    // unused at the moment
    function Analyzer() {
    
        var _audioCanvasAnimationId,
            _audioSpectrumCanvas
            ;
    
        this.startAnalyzerUpdates = function () {
            updateAnalyzer();
        };
    
        this.stopAnalyzerUpdates = function () {
            if (!_audioCanvasAnimationId)
                return;
    
            window.cancelAnimationFrame(_audioCanvasAnimationId);
            _audioCanvasAnimationId = null;
        };
    
        function updateAnalyzer() {
    
            if (!_audioSpectrumCanvas)
                _audioSpectrumCanvas = document.getElementById("recording-visualizer").getContext("2d");
    
            var freqData = new Uint8Array(_audioAnalyzer.frequencyBinCount);
            _audioAnalyzer.getByteFrequencyData(freqData);
    
            var numBars = _audioAnalyzer.frequencyBinCount;
            var barWidth = Math.floor(_canvasWidth / numBars) - _fftBarSpacing;
    
    
            _audioSpectrumCanvas.globalCompositeOperation = "source-over";
    
            _audioSpectrumCanvas.clearRect(0, 0, _canvasWidth, _canvasHeight);
            _audioSpectrumCanvas.fillStyle = '#f6d565';
            _audioSpectrumCanvas.lineCap = 'round';
    
            var x, y, w, h;
    
            for (var i = 0; i < numBars; i++) {
                var value = freqData[i];
                var scaled_value = (value / 256) * _canvasHeight;
    
                x = i * (barWidth + _fftBarSpacing);
                y = _canvasHeight - scaled_value;
                w = barWidth;
                h = scaled_value;
    
                var gradient = _audioSpectrumCanvas.createLinearGradient(x, _canvasHeight, x, y);
                gradient.addColorStop(1.0, "rgba(0,0,0,1.0)");
                gradient.addColorStop(0.0, "rgba(0,0,0,1.0)");
    
                _audioSpectrumCanvas.fillStyle = gradient;
                _audioSpectrumCanvas.fillRect(x, y, w, h);
    
                if (scaled_value > _hitHeights[i]) {
                    _hitVelocities[i] += (scaled_value - _hitHeights[i]) * 6;
                    _hitHeights[i] = scaled_value;
                } else {
                    _hitVelocities[i] -= 4;
                }
    
                _hitHeights[i] += _hitVelocities[i] * 0.016;
    
                if (_hitHeights[i] < 0)
                    _hitHeights[i] = 0;
            }
    
            _audioSpectrumCanvas.globalCompositeOperation = "source-atop";
            _audioSpectrumCanvas.drawImage(_canvasBg, 0, 0);
    
            _audioSpectrumCanvas.globalCompositeOperation = "source-over";
            _audioSpectrumCanvas.fillStyle = "rgba(255,255,255,0.7)";
    
            for (i = 0; i < numBars; i++) {
                x = i * (barWidth + _fftBarSpacing);
                y = _canvasHeight - Math.round(_hitHeights[i]) - 2;
                w = barWidth;
                h = barWidth;
    
                if (_hitHeights[i] === 0)
                    continue;
    
                //_audioSpectrumCanvas.fillStyle = "rgba(255, 255, 255,"+ Math.max(0, 1 - Math.abs(_hitVelocities[i]/150)) + ")";
                _audioSpectrumCanvas.fillRect(x, y, w, h);
            }
    
            _audioCanvasAnimationId = window.requestAnimationFrame(updateAnalyzer);
        }
    
        var _canvasWidth, _canvasHeight;
        var _fftSize = 256;
        var _fftSmoothing = 0.8;
        var _fftBarSpacing = 1;
    
        var _hitHeights = [];
        var _hitVelocities = [];
    
        this.testCanvas = function () {
    
            var canvasContainer = document.getElementById("recording-visualizer");
    
            _canvasWidth = canvasContainer.width;
            _canvasHeight = canvasContainer.height;
    
            _audioSpectrumCanvas = canvasContainer.getContext("2d");
            _audioSpectrumCanvas.globalCompositeOperation = "source-over";
            _audioSpectrumCanvas.fillStyle = "rgba(0,0,0,0)";
            _audioSpectrumCanvas.fillRect(0, 0, _canvasWidth, _canvasHeight);
    
            var numBars = _fftSize / 2;
            var barSpacing = _fftBarSpacing;
            var barWidth = Math.floor(_canvasWidth / numBars) - barSpacing;
    
            var x, y, w, h, i;
    
            for (i = 0; i < numBars; i++) {
                _hitHeights[i] = _canvasHeight - 1;
                _hitVelocities[i] = 0;
            }
    
            for (i = 0; i < numBars; i++) {
                var scaled_value = Math.abs(Math.sin(Math.PI * 6 * (i / numBars))) * _canvasHeight;
    
                x = i * (barWidth + barSpacing);
                y = _canvasHeight - scaled_value;
                w = barWidth;
                h = scaled_value;
    
                var gradient = _audioSpectrumCanvas.createLinearGradient(x, _canvasHeight, x, y);
                gradient.addColorStop(1.0, "rgba(0,0,0,0.0)");
                gradient.addColorStop(0.0, "rgba(0,0,0,1.0)");
    
                _audioSpectrumCanvas.fillStyle = gradient;
                _audioSpectrumCanvas.fillRect(x, y, w, h);
            }
    
            _audioSpectrumCanvas.globalCompositeOperation = "source-atop";
            _audioSpectrumCanvas.drawImage(_canvasBg, 0, 0);
    
            _audioSpectrumCanvas.globalCompositeOperation = "source-over";
            _audioSpectrumCanvas.fillStyle = "#ffffff";
    
            for (i = 0; i < numBars; i++) {
                x = i * (barWidth + barSpacing);
                y = _canvasHeight - _hitHeights[i];
                w = barWidth;
                h = 2;
    
                _audioSpectrumCanvas.fillRect(x, y, w, h);
            }
        };
    
        var _scope = this;
    
        var _canvasBg = new Image();
        _canvasBg.onload = function () {
            _scope.testCanvas();
        };
        //_canvasBg.src = "/img/bg5s.jpg";
        _canvasBg.src = "/img/bg6-wide.jpg";
    }
    */

    // TODO: firefox's built-in ogg-creation route
    // Firefox 27's manual recording doesn't work. something funny with their sampling rates or buffer sizes
    // the data is fairly garbled, like they are serving 22khz as 44khz or something like that

    _createClass(AudioCapture, [{
        key: 'startAutomaticEncoding',
        value: function startAutomaticEncoding(mediaStream) {
            this._audioEncoder = new MediaRecorder(mediaStream);

            this._audioEncoder.ondataavailable = function (e) {
                console.log("AudioCapture::startAutomaticEncoding(); MediaRecorder.ondataavailable(); new blob: size=" + e.data.size + " type=" + e.data.type);
                this._latestAudioBuffer.push(e.data);
            };

            this._audioEncoder.onstop = function () {
                console.log("AudioCapture::startAutomaticEncoding(); MediaRecorder.onstop(); hit");

                // send the last captured audio buffer
                var encoded_blob = new Blob(this._latestAudioBuffer, { type: 'audio/ogg' });

                console.log("AudioCapture::startAutomaticEncoding(); MediaRecorder.onstop(); got encoded blob: size=" + encoded_blob.size + " type=" + encoded_blob.type);

                if (this._onCaptureCompleteCallback) this._onCaptureCompleteCallback(encoded_blob);
            };

            console.log("AudioCapture::startAutomaticEncoding(); MediaRecorder.start()");
            this._audioEncoder.start(0);
        }
    }, {
        key: 'createAudioContext',
        value: function createAudioContext(mediaStream) {
            // build capture graph
            this._audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this._audioInput = this._audioContext.createMediaStreamSource(mediaStream);
            this._audioDestination = this._audioContext.createMediaStreamDestination();

            console.log("AudioCapture::startManualEncoding(); _audioContext.sampleRate: " + this._audioContext.sampleRate + " Hz");

            // create a listener node to grab microphone samples and feed it to our background worker
            this._audioListener = (this._audioContext.createScriptProcessor || this._audioContext.createJavaScriptNode).call(this._audioContext, 16384, 1, 1);

            console.log("this._cachedGainValue = " + this._cachedGainValue);

            this._audioGain = this._audioContext.createGain();
            this._audioGain.gain.value = this._cachedGainValue;

            //this._audioAnalyzer = this._audioContext.createAnalyser();
            //this._audioAnalyzer.fftSize = this._fftSize;
            //this._audioAnalyzer.smoothingTimeConstant = this._fftSmoothing;
        }
    }, {
        key: 'startManualEncoding',
        value: function startManualEncoding(mediaStream) {
            var _this = this;

            if (!this._audioContext) {
                this.createAudioContext(mediaStream);
            }

            if (!this._encodingWorker) this._encodingWorker = new Worker("/assets/js/worker-encoder.min.js");

            // re-hook audio listener node every time we start, because _encodingWorker reference will change
            this._audioListener.onaudioprocess = function (e) {
                if (!_this._isRecording) return;

                var msg = {
                    action: "process",

                    // two Float32Arrays
                    left: e.inputBuffer.getChannelData(0)
                    //right: e.inputBuffer.getChannelData(1)
                };

                //var leftOut = e.outputBuffer.getChannelData(0);
                //for(var i = 0; i < msg.left.length; i++) {
                //    leftOut[i] = msg.left[i];
                //}

                _this._totalNumSamples += msg.left.length;

                _this._encodingWorker.postMessage(msg);
            };

            // handle messages from the encoding-worker
            this._encodingWorker.onmessage = function (e) {

                // worker finished and has the final encoded audio buffer for us
                if (e.data.action === "encoded") {
                    var encoded_blob = new Blob([e.data.buffer], { type: 'audio/ogg' });

                    console.log("e.data.buffer.buffer = " + e.data.buffer.buffer);
                    console.log("e.data.buffer.byteLength = " + e.data.buffer.byteLength);
                    console.log("sampleRate = " + _this._audioContext.sampleRate);
                    console.log("totalNumSamples = " + _this._totalNumSamples);
                    console.log("Duration of recording = " + _this._totalNumSamples / _this._audioContext.sampleRate + " seconds");

                    console.log("got encoded blob: size=" + encoded_blob.size + " type=" + encoded_blob.type);

                    if (_this._onCaptureCompleteCallback) _this._onCaptureCompleteCallback(encoded_blob);

                    // worker has exited, unreference it
                    _this._encodingWorker = null;
                }
            };

            // configure worker with a sampling rate and buffer-size
            this._encodingWorker.postMessage({
                action: "initialize",
                sample_rate: this._audioContext.sampleRate,
                buffer_size: this._audioListener.bufferSize
            });

            // TODO: it might be better to listen for a message back from the background worker before considering that recording has began
            // it's easier to trim audio than capture a missing word at the start of a sentence
            this._isRecording = false;

            // connect audio nodes
            // audio-input -> gain -> fft-analyzer -> PCM-data capture -> destination

            console.log("AudioCapture::startManualEncoding(); Connecting Audio Nodes..");

            console.log("connecting: input->gain");
            this._audioInput.connect(this._audioGain);
            //console.log("connecting: gain->analyzer");
            //this._audioGain.connect(this._audioAnalyzer);
            //console.log("connecting: analyzer->listesner");
            //this._audioAnalyzer.connect(this._audioListener);
            // connect gain directly into listener, bypassing analyzer
            console.log("connecting: gain->listener");
            this._audioGain.connect(this._audioListener);
            console.log("connecting: listener->destination");
            this._audioListener.connect(this._audioDestination);

            return true;
        }
    }, {
        key: 'shutdownManualEncoding',
        value: function shutdownManualEncoding() {
            console.log("AudioCapture::shutdownManualEncoding(); Tearing down AudioAPI connections..");

            console.log("disconnecting: listener->destination");
            this._audioListener.disconnect(this._audioDestination);
            //console.log("disconnecting: analyzer->listesner");
            //this._audioAnalyzer.disconnect(this._audioListener);
            //console.log("disconnecting: gain->analyzer");
            //this._audioGain.disconnect(this._audioAnalyzer);
            console.log("disconnecting: gain->listener");
            this._audioGain.disconnect(this._audioListener);
            console.log("disconnecting: input->gain");
            this._audioInput.disconnect(this._audioGain);
        }

        /**
         * The microphone may be live, but it isn't recording. This toggles the actual writing to the capture stream.
         * captureAudioSamples bool indicates whether to record from mic
         */
    }, {
        key: 'toggleMicrophoneRecording',
        value: function toggleMicrophoneRecording(captureAudioSamples) {
            this._isRecording = captureAudioSamples;
        }

        // called when user allows us use of their microphone
    }, {
        key: 'onMicrophoneProvided',
        value: function onMicrophoneProvided(mediaStream) {

            this._cachedMediaStream = mediaStream;

            // we could check if the browser can perform its own encoding and use that
            // Firefox can provide us ogg+speex or ogg+opus? files, but unfortunately that codec isn't supported widely enough
            // so instead we perform manual encoding everywhere right now to get us ogg+vorbis
            // though one day, i want ogg+opus! opus has a wonderful range of quality settings perfect for this project

            if (false && typeof MediaRecorder !== "undefined") {
                this.startAutomaticEncoding(mediaStream);
            } else {
                // no media recorder available, do it manually
                this.startManualEncoding(mediaStream);
            }

            // TODO: might be a good time to start a spectral analyzer
            if (this._onStartedCallback) this._onStartedCallback();
        }
    }, {
        key: 'setGain',
        value: function setGain(gain) {
            if (this._audioGain) this._audioGain.gain.value = gain;

            console.log("setting gain: " + gain);
            this._cachedGainValue = gain;
        }
    }, {
        key: 'preloadMediaStream',
        value: function preloadMediaStream() {
            var _this2 = this;

            if (this._cachedMediaStream) return;

            navigator.mediaDevice.getUserMedia({ audio: true }).then(function (ms) {
                _this2._cachedMediaStream = ms;
            })['catch'](function (err) {
                console.log("AudioCapture::start(); could not grab microphone. perhaps user didn't give us permission?");
                console.warn(err);
            });
        }
    }, {
        key: 'start',
        value: function start(onStartedCallback) {
            var _this3 = this;

            this._onStartedCallback = onStartedCallback;

            if (this._cachedMediaStream) return this.onMicrophoneProvided(this._cachedMediaStream);

            navigator.mediaDevice.getUserMedia({ audio: true }).then(function (ms) {
                return _this3.onMicrophoneProvided(ms);
            })['catch'](function (err) {
                console.log("AudioCapture::start(); could not grab microphone. perhaps user didn't give us permission?");
                console.warn(err);
            });

            return true;
        }
    }, {
        key: 'stop',
        value: function stop(captureCompleteCallback) {
            this._onCaptureCompleteCallback = captureCompleteCallback;
            this._isRecording = false;

            if (this._audioContext) {
                // stop the manual encoder
                this._encodingWorker.postMessage({ action: "finish" });
                this.shutdownManualEncoding();
            }

            if (this._audioEncoder) {
                // stop the automatic encoder

                if (this._audioEncoder.state !== 'recording') {
                    console.warn("AudioCapture::stop(); _audioEncoder.state != 'recording'");
                }

                this._audioEncoder.requestData();
                this._audioEncoder.stop();
            }

            // TODO: stop any active spectral analysis
        }
    }]);

    return AudioCapture;
})();

exports.AudioCapture = AudioCapture;

},{"./polyfill.js":8,"underscore":"underscore"}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _backbone = require('backbone');

var _backbone2 = _interopRequireDefault(_backbone);

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var AudioPlayerEvents = (function (_Backbone$Model) {
    _inherits(AudioPlayerEvents, _Backbone$Model);

    function AudioPlayerEvents() {
        _classCallCheck(this, AudioPlayerEvents);

        _get(Object.getPrototypeOf(AudioPlayerEvents.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(AudioPlayerEvents, [{
        key: 'pause',
        value: function pause() {
            this.trigger("pause");
        }
    }]);

    return AudioPlayerEvents;
})(_backbone2['default'].Model);

var AudioPlayer = new AudioPlayerEvents();

exports.AudioPlayer = AudioPlayer;

var AudioPlayerView = (function (_Backbone$View) {
    _inherits(AudioPlayerView, _Backbone$View);

    function AudioPlayerView() {
        _classCallCheck(this, AudioPlayerView);

        _get(Object.getPrototypeOf(AudioPlayerView.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(AudioPlayerView, [{
        key: 'defaults',
        value: function defaults() {
            return {
                audioPlayer: null,
                quipModel: null
            };
        }
    }, {
        key: 'initialize',
        value: function initialize() {
            var _this = this;

            console.log("AudioPlayerView initialized");
            this.audioPlayer = document.getElementById("audio-player");
            AudioPlayer.on("toggle", function (quip) {
                return _this.onToggle(quip);
            }, this);
            AudioPlayer.on("pause", function (quip) {
                return _this.pause(quip);
            }, this);
        }
    }, {
        key: 'close',
        value: function close() {
            this.stopPeriodicTimer();
        }
    }, {
        key: 'startPeriodicTimer',
        value: function startPeriodicTimer() {
            var _this2 = this;

            if (this.periodicTimer == null) {
                this.periodicTimer = setInterval(function () {
                    return _this2.checkProgress();
                }, 100);
            }
        }
    }, {
        key: 'stopPeriodicTimer',
        value: function stopPeriodicTimer() {
            if (this.periodicTimer != null) {
                clearInterval(this.periodicTimer);
                this.periodicTimer = null;
            }
        }
    }, {
        key: 'checkProgress',
        value: function checkProgress() {
            if (this.quipModel == null) {
                return;
            }

            var progressUpdate = {
                position: this.audioPlayer.currentTime, // sec
                duration: this.audioPlayer.duration, // sec
                progress: 100 * this.audioPlayer.currentTime / this.audioPlayer.duration // %
            };

            AudioPlayer.trigger("/" + this.quipModel.id + "/progress", progressUpdate);
        }
    }, {
        key: 'onToggle',
        value: function onToggle(quipModel) {
            this.quipModel = quipModel;

            if (!this.trackIsLoaded(quipModel.url)) {
                this.loadTrack(quipModel.url);
            }

            if (!this.trackIsLoaded(quipModel.url)) {
                return;
            }

            if (this.audioPlayer.paused) {
                this.play(quipModel);
            } else {
                this.pause(quipModel);
            }
        }
    }, {
        key: 'play',
        value: function play(quipModel) {
            this.audioPlayer.currentTime = Math.floor(quipModel.position);
            this.audioPlayer.play();

            AudioPlayer.trigger("/" + quipModel.id + "/playing");
            this.startPeriodicTimer();
        }
    }, {
        key: 'pause',
        value: function pause(quipModel) {
            this.audioPlayer.pause();
            if (quipModel != null) {
                AudioPlayer.trigger("/" + quipModel.id + "/paused");
            }
            this.stopPeriodicTimer();
        }
    }, {
        key: 'trackIsLoaded',
        value: function trackIsLoaded(url) {
            return ~this.audioPlayer.src.indexOf(url);
        }
    }, {
        key: 'loadTrack',
        value: function loadTrack(url) {
            console.log("Loading audio: " + url);
            this.audioPlayer.src = url;
            this.audioPlayer.load();
        }
    }]);

    return AudioPlayerView;
})(_backbone2['default'].View);

var SoundPlayer = (function () {
    function SoundPlayer() {
        _classCallCheck(this, SoundPlayer);
    }

    _createClass(SoundPlayer, null, [{
        key: 'create',
        value: function create(model) {
            var resumePosition = parseInt(model.get('position') || 0);

            console.log("Creating sound player for model:", model);

            return soundManager.createSound({
                id: model.id,
                url: model.url,
                volume: 100,
                autoLoad: true,
                autoPlay: false,
                from: resumePosition,
                whileloading: function whileloading() {
                    console.log("loaded: " + this.bytesLoaded + " of " + this.bytesTotal);
                },
                onload: function onload() {
                    console.log('Sound; audio loaded; position = ' + resumePosition + ', duration = ' + this.duration);

                    if (this.duration == null || this.duration == 0) {
                        console.log("duration is null");
                        return;
                    }

                    if (resumePosition + 10 > this.duration) {
                        // the track is pretty much complete, loop it
                        // FIXME: this should actually happen earlier, we should know that the action will cause a rewind
                        //        and indicate the rewind visually so there is no surprise
                        resumePosition = 0;
                        console.log('Sound; track needed a rewind');
                    }

                    // FIXME: resume compatibility with various browsers
                    // FIXME: sometimes you resume a file all the way at the end, should loop them around
                    this.setPosition(resumePosition);
                    this.play();
                },
                whileplaying: function whileplaying() {
                    var progress = (this.duration > 0 ? 100 * this.position / this.duration : 0).toFixed(0) + '%';
                    localStorage.setItem("quip:" + this.id + ":progress", progress);
                    localStorage.setItem("quip:" + this.id + ":position", this.position.toFixed(0));
                    model.set({ 'progress': progress });
                },
                onpause: function onpause() {
                    console.log("Sound; paused: " + this.id);
                    var position = this.position ? this.position.toFixed(0) : 0;
                    var progress = (this.duration > 0 ? 100 * position / this.duration : 0).toFixed(0) + '%';
                    localStorage.setItem("quip:" + this.id + ":progress", progress);
                    localStorage.setItem("quip:" + this.id + ":position", position);
                    model.set({ 'progress': progress });
                },
                onfinish: function onfinish() {
                    console.log("Sound; finished playing: " + this.id);

                    // store completion in browser
                    localStorage.setItem("quip:" + this.id + ":progress", '100%');
                    localStorage.setItem("quip:" + this.id + ":position", this.duration.toFixed(0));
                    model.set({ 'progress': '100%' });

                    // TODO: unlock some sort of achievement for finishing this track, mark it a diff color, etc
                    // TODO: this is a good place to fire a hook to a playback manager to move onto the next audio clip
                }
            });
        }
    }]);

    return SoundPlayer;
})();

exports.SoundPlayer = SoundPlayer;
exports.AudioPlayerView = AudioPlayerView;
exports.AudioPlayerEvents = AudioPlayerEvents;

},{"backbone":"backbone","underscore":"underscore"}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _backbone = require('backbone');

var _backbone2 = _interopRequireDefault(_backbone);

var _quipControlJs = require('./quip-control.js');

var _audioPlayer = require('./audio-player');

var _modelsQuip = require('./models/Quip');

var HomepageView = (function (_Backbone$View) {
    _inherits(HomepageView, _Backbone$View);

    function HomepageView() {
        _classCallCheck(this, HomepageView);

        _get(Object.getPrototypeOf(HomepageView.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(HomepageView, [{
        key: 'initialize',
        value: function initialize() {
            var _this = this;

            new _modelsQuip.MyQuipCollection().fetch().then(function (quips) {
                return _this.onQuipsLoaded(quips);
            });
        }
    }, {
        key: 'shutdown',
        value: function shutdown() {
            if (this.quipViews != null) {
                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                    for (var _iterator = this.quipViews[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var quip = _step.value;

                        quip.shutdown();
                    }
                } catch (err) {
                    _didIteratorError = true;
                    _iteratorError = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion && _iterator['return']) {
                            _iterator['return']();
                        }
                    } finally {
                        if (_didIteratorError) {
                            throw _iteratorError;
                        }
                    }
                }
            }

            _audioPlayer.AudioPlayer.trigger("pause");
        }
    }, {
        key: 'onQuipsLoaded',
        value: function onQuipsLoaded(quips) {
            console.log("loaded quips", quips);

            this.quipViews = [];

            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
                for (var _iterator2 = quips[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var quip = _step2.value;

                    var quipView = new _quipControlJs.QuipView({ model: new _modelsQuip.QuipModel(quip) });
                    this.quipViews.push(quipView);
                    this.$el.append(quipView.el);
                }
            } catch (err) {
                _didIteratorError2 = true;
                _iteratorError2 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion2 && _iterator2['return']) {
                        _iterator2['return']();
                    }
                } finally {
                    if (_didIteratorError2) {
                        throw _iteratorError2;
                    }
                }
            }
        }
    }]);

    return HomepageView;
})(_backbone2['default'].View);

exports['default'] = HomepageView;
;
module.exports = exports['default'];

},{"./audio-player":3,"./models/Quip":7,"./quip-control.js":9,"backbone":"backbone"}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _backbone = require('backbone');

var _backbone2 = _interopRequireDefault(_backbone);

var CurrentUserModel = (function (_Backbone$Model) {
    _inherits(CurrentUserModel, _Backbone$Model);

    _createClass(CurrentUserModel, [{
        key: "defaults",
        value: function defaults() {
            return {
                username: "",
                profileImage: "",
                createdAt: "",
                id: ""
            };
        }
    }]);

    function CurrentUserModel(props) {
        _classCallCheck(this, CurrentUserModel);

        _get(Object.getPrototypeOf(CurrentUserModel.prototype), "constructor", this).call(this, props);
        this.url = "/current_user";
    }

    return CurrentUserModel;
})(_backbone2["default"].Model);

exports.CurrentUserModel = CurrentUserModel;

},{"backbone":"backbone"}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _backbone = require('backbone');

var _backbone2 = _interopRequireDefault(_backbone);

var ListenState = (function (_Backbone$Model) {
    _inherits(ListenState, _Backbone$Model);

    _createClass(ListenState, [{
        key: 'defaults',
        value: function defaults() {
            return {
                audioId: 0, // id string of quip
                progress: 0 };
        }
    }]);

    // [0-100]

    function ListenState(props) {
        _classCallCheck(this, ListenState);

        _get(Object.getPrototypeOf(ListenState.prototype), 'constructor', this).call(this, props);
        this.urlRoot = '/listen';
    }

    return ListenState;
})(_backbone2['default'].Model);

var ListenStateCollection = (function (_Backbone$Collection) {
    _inherits(ListenStateCollection, _Backbone$Collection);

    function ListenStateCollection(opts) {
        _classCallCheck(this, ListenStateCollection);

        _get(Object.getPrototypeOf(ListenStateCollection.prototype), 'constructor', this).call(this, opts);
        this.model = ListenState;
        this.url = "/listen";
    }

    return ListenStateCollection;
})(_backbone2['default'].Collection);

exports.ListenState = ListenState;
exports.ListenStateCollection = ListenStateCollection;

},{"backbone":"backbone"}],7:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _backbone = require('backbone');

var _backbone2 = _interopRequireDefault(_backbone);

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var QuipModel = (function (_Backbone$Model) {
    _inherits(QuipModel, _Backbone$Model);

    _createClass(QuipModel, [{
        key: 'defaults',
        value: function defaults() {
            return {
                id: 0, // guid
                progress: 0, // [0-100] percentage
                position: 0, // seconds
                duration: 0, // seconds
                isPublic: false
            };
        }
    }]);

    function QuipModel(opts) {
        _classCallCheck(this, QuipModel);

        _get(Object.getPrototypeOf(QuipModel.prototype), 'constructor', this).call(this, opts);

        this.urlRoot = "/quips";

        // save listening progress at most every 3 seconds
        this.throttledSave = _underscore2['default'].throttle(this.save, 3000);
    }

    return QuipModel;
})(_backbone2['default'].Model);

var MyQuipCollection = (function (_Backbone$Collection) {
    _inherits(MyQuipCollection, _Backbone$Collection);

    function MyQuipCollection(opts) {
        _classCallCheck(this, MyQuipCollection);

        _get(Object.getPrototypeOf(MyQuipCollection.prototype), 'constructor', this).call(this, opts);
        this.model = QuipModel;
        this.url = "/quips";
    }

    return MyQuipCollection;
})(_backbone2['default'].Collection);

exports.QuipModel = QuipModel;
exports.MyQuipCollection = MyQuipCollection;

},{"backbone":"backbone","underscore":"underscore"}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Polyfill = (function () {
    function Polyfill() {
        _classCallCheck(this, Polyfill);
    }

    _createClass(Polyfill, null, [{
        key: "install",
        value: function install() {
            window.AudioContext = window.AudioContext || window.webkitAudioContext || false;
            navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia || false;

            if (navigator.mediaDevice == null) {
                console.log("polyfilling mediaDevice.getUserMedia");

                navigator.mediaDevice = {
                    getUserMedia: function getUserMedia(props) {
                        return new Promise(function (y, n) {
                            return navigator.getUserMedia(props, y, n);
                        });
                    }
                };
            }

            if (!navigator.getUserMedia) {
                console.error("AudioCapture::polyfill(); getUserMedia() not supported.");
                return false;
            }
        }
    }]);

    return Polyfill;
})();

exports["default"] = Polyfill;
module.exports = exports["default"];

},{}],9:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _vagueTime = require('vague-time');

var _vagueTime2 = _interopRequireDefault(_vagueTime);

var _backbone = require('backbone');

var _backbone2 = _interopRequireDefault(_backbone);

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _audioPlayerJs = require('./audio-player.js');

var _modelsQuip = require('./models/Quip');

//class AudioPlayerEvents extends Backbone.Events {
//
//}

var QuipView = (function (_Backbone$View) {
    _inherits(QuipView, _Backbone$View);

    function QuipView() {
        _classCallCheck(this, QuipView);

        _get(Object.getPrototypeOf(QuipView.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(QuipView, [{
        key: 'onPause',
        value: function onPause() {
            console.log("QuipView; paused");

            $(this.el).find('.fa-pause').removeClass('fa-pause').addClass('fa-play');
        }
    }, {
        key: 'onPlay',
        value: function onPlay() {
            console.log("QuipView; playing");

            $(this.el).find('.fa-play').removeClass('fa-play').addClass('fa-pause');
        }
    }, {
        key: 'onProgress',
        value: function onProgress(progressUpdate) {
            this.model.set({ 'position': progressUpdate.position }); // sec
            this.model.set({ 'duration': progressUpdate.duration }); // sec
            this.model.set({ 'progress': progressUpdate.progress }); // %
            this.model.throttledSave();
        }
    }, {
        key: 'initialize',
        value: function initialize() {
            var _this = this;

            this.template = _underscore2['default'].template($('#quip-template').html());

            var id = this.model.get("id");

            _audioPlayerJs.AudioPlayer.on("/" + id + "/paused", function () {
                return _this.onPause();
            }, this);
            _audioPlayerJs.AudioPlayer.on("/" + id + "/playing", function () {
                return _this.onPlay();
            }, this);
            _audioPlayerJs.AudioPlayer.on("/" + id + "/progress", function (update) {
                return _this.onProgress(update);
            }, this);

            this.render();

            $(this.el).find(".progress-bar").css("width", this.model.get('progress') + "%");

            // update visuals to indicate playback progress
            this.model.on('change:progress', function (model, progress) {
                $(_this.el).find(".progress-bar").css("width", progress + "%");
            });
        }
    }, {
        key: 'shutdown',
        value: function shutdown() {
            _audioPlayerJs.AudioPlayer.off(null, null, this);
            this.model.off();
        }
    }, {
        key: 'loadModel',
        value: function loadModel() {
            var progress = localStorage.getItem("quip:" + this.quipId + ":progress");
            var position = localStorage.getItem("quip:" + this.quipId + ":position");

            this.model.set({
                'id': this.quipId,
                'progress': progress,
                'position': position,
                'isPublic': this.$el.data("isPublic") == 'True',
                'isMine': this.$el.data("isMine") == 'True'
            });
        }
    }, {
        key: 'togglePublic',
        value: function togglePublic(ev) {
            var newState = !this.model.get('isPublic');
            this.model.set({ 'isPublic': newState });

            console.log("toggling new published state: " + newState);

            this.model.save();

            return false;
        }
    }, {
        key: 'togglePlayback',
        value: function togglePlayback(event) {
            _audioPlayerJs.AudioPlayer.trigger("toggle", this.model.attributes);
        }
    }, {
        key: 'render',
        value: function render() {
            var viewModel = this.model.toJSON();
            viewModel.vagueTime = _vagueTime2['default'].get({ from: new Date(), to: new Date(this.model.get("timestamp")) });

            this.$el.html(this.template(viewModel));
            return this;
        }
    }, {
        key: 'defaults',
        get: function get() {
            return {
                quipId: 0,
                audioPlayer: null
            };
        }
    }, {
        key: 'events',
        get: function get() {
            return {
                "click .quip-actions .lock-indicator": "togglePublic",
                "click .quip-player": "togglePlayback"
            };
        }
    }, {
        key: 'tagName',
        get: function get() {
            return 'div';
        }
    }]);

    return QuipView;
})(_backbone2['default'].View);

var QuipList = (function (_Backbone$Collection) {
    _inherits(QuipList, _Backbone$Collection);

    function QuipList(options) {
        _classCallCheck(this, QuipList);

        _get(Object.getPrototypeOf(QuipList.prototype), 'constructor', this).call(this, options);
        this.model = _modelsQuip.QuipModel;
    }

    return QuipList;
})(_backbone2['default'].Collection);

var Quips = new QuipList();

exports.QuipModel = _modelsQuip.QuipModel;
exports.QuipView = QuipView;
exports.QuipList = QuipList;
exports.Quips = Quips;

},{"./audio-player.js":3,"./models/Quip":7,"backbone":"backbone","underscore":"underscore","vague-time":"vague-time"}],10:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _backbone = require('backbone');

var _backbone2 = _interopRequireDefault(_backbone);

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _quipControlJs = require('./quip-control.js');

var _audioCapture = require('./audio-capture');

var _audioPlayer = require('./audio-player');

var Recorder = (function (_Backbone$Model) {
    _inherits(Recorder, _Backbone$Model);

    function Recorder() {
        _classCallCheck(this, Recorder);

        _get(Object.getPrototypeOf(Recorder.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(Recorder, [{
        key: 'defaults',
        value: function defaults() {
            return {
                recordingTime: 0
            };
        }
    }]);

    return Recorder;
})(_backbone2['default'].Model);

exports.Recorder = Recorder;

var RecorderView = (function (_Backbone$View) {
    _inherits(RecorderView, _Backbone$View);

    function RecorderView() {
        _classCallCheck(this, RecorderView);

        _get(Object.getPrototypeOf(RecorderView.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(RecorderView, [{
        key: 'IntToTime',

        //    el: '.m-recording-container',

        value: function IntToTime(value) {
            var minutes = Math.floor(value / 60);
            var seconds = Math.round(value - minutes * 60);

            return ("00" + minutes).substr(-2) + ":" + ("00" + seconds).substr(-2);
        }
    }, {
        key: 'defaults',
        value: function defaults() {
            return {
                audioCapture: null,
                audioBlob: null,
                audioBlobUrl: null,
                audioPlayer: null,
                isRecording: false,
                timerId: 0,
                timerStart: 3
            };
        }
    }, {
        key: 'events',
        value: function events() {
            return {
                "click .recording-toggle": "toggle",
                "click #cancel-recording": "cancelRecording",
                "click #upload-recording": "uploadRecording",
                "click #helper-btn": "playPreview"
            };
        }
    }, {
        key: 'render',
        value: function render() {
            console.log("rendering recorder control");
            this.template = _underscore2['default'].template($('#quip-recorder-template').html());
            this.$el.html(this.template(this.model.toJSON()));
        }
    }, {
        key: 'initialize',
        value: function initialize(options) {
            console.log("RecorderView init");
            this.audioCapture = new _audioCapture.AudioCapture();

            this.render();

            this.audioPlayer = document.getElementById("recorded-preview");
            if (this.audioPlayer == null) {
                return;
            }

            console.log("can play vorbis: ", !!this.audioPlayer.canPlayType && "" != this.audioPlayer.canPlayType('audio/ogg; codecs="vorbis"'));

            //this.audioPlayer.loop = "loop";
            //this.audioPlayer.autoplay = "autoplay";
            this.audioPlayer.src = "/assets/sounds/beep_short_on.ogg";
            this.audioPlayer.play();

            this.model.on('change:recordingTime', function (model, time) {
                $(".recording-time").text(time);
            });

            // attempt to fetch media-stream on page-load
            this.audioCapture.preloadMediaStream();

            // TODO: a pretty advanced but neat feature may be to store a backup copy of a recording locally in case of a crash or user-error
            /*
             // check how much temporary storage space we have. it's a good way to save recording without losing it
             window.webkitStorageInfo.queryUsageAndQuota(
             webkitStorageInfo.TEMPORARY,
             function(used, remaining) {
             var rmb = (remaining / 1024 / 1024).toFixed(4);
             var umb = (used / 1024 / 1024).toFixed(4);
             console.log("Used quota: " + umb + "mb, remaining quota: " + rmb + "mb");
             }, function(e) {
             console.log('Error', e);
             }
             );
              function onErrorInFS() {
             var msg = '';
              switch (e.code) {
             case FileError.QUOTA_EXCEEDED_ERR:
             msg = 'QUOTA_EXCEEDED_ERR';
             break;
             case FileError.NOT_FOUND_ERR:
             msg = 'NOT_FOUND_ERR';
             break;
             case FileError.SECURITY_ERR:
             msg = 'SECURITY_ERR';
             break;
             case FileError.INVALID_MODIFICATION_ERR:
             msg = 'INVALID_MODIFICATION_ERR';
             break;
             case FileError.INVALID_STATE_ERR:
             msg = 'INVALID_STATE_ERR';
             break;
             default:
             msg = 'Unknown Error';
             break;
             }
              console.log('Error: ' + msg);
             }
              window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
              window.requestFileSystem(window.TEMPORARY, 5 * 1024 * 1024, function onSuccess(fs) {
              console.log('opening file');
              fs.root.getFile("test", {create:true}, function(fe) {
              console.log('spawned writer');
              fe.createWriter(function(fw) {
              fw.onwriteend = function(e) {
             console.log('write completed');
             };
              fw.onerror = function(e) {
             console.log('write failed: ' + e.toString());
             };
              console.log('writing blob to file..');
              var blob = new Blob(['yeh this is a test!'], {type: 'text/plain'});
             fw.write(blob);
              }, onErrorInFS);
              }, onErrorInFS);
              }, onErrorInFS);
             */
        }
    }, {
        key: 'toggle',
        value: function toggle(event) {
            if (this.isRecording) {
                this.isRecording = false;
                this.stopRecording();
            } else {
                this.isRecording = true;
                this.startRecording();
            }
        }
    }, {
        key: 'cancelRecording',
        value: function cancelRecording(event) {
            console.log("Recorder::onRecordingCompleted(); canceling recording");
            $("#recorder-full").removeClass("disabled");
            $("#recorder-uploader").addClass("disabled");
            $(".m-recording-container").removeClass("flipped");
            this.audioPlayer.src = "";
            this.model.set('recordingTime', 3);
        }
    }, {
        key: 'uploadRecording',
        value: function uploadRecording(event) {
            console.log("Recorder::onRecordingCompleted(); uploading recording");
            this.audioPlayer.src = "";

            $("#recorder-full").addClass("disabled");
            $("#recorder-uploader").removeClass("disabled");
            $(".m-recording-container").removeClass("flipped");

            var description = $('textarea[name=description]')[0].value;

            var data = new FormData();
            data.append('description', description);
            data.append('isPublic', 1);
            data.append('audio-blob', this.audioBlob);

            // send raw blob and metadata

            // TODO: get a replacement ajax library (maybe patch reqwest to support binary?)
            var xhr = new XMLHttpRequest();
            xhr.open('post', '/recording/create', true);
            xhr.setRequestHeader('Accept', 'application/json');
            xhr.upload.onprogress = function (e) {
                var percent = (e.loaded / e.total * 100).toFixed(0) + '%';
                console.log("percentage: " + percent);
                $("#recorder-uploader").find(".bar").css('width', percent);
            };
            xhr.onload = function (e) {
                $("#recorder-uploader").find(".bar").css('width', '100%');
                if (xhr.status == 200) {
                    console.log("Recorder::onRecordingCompleted(); manual xhr successful");
                } else {
                    console.log("Recorder::onRecordingCompleted(); manual xhr error", xhr);
                }
                var result = JSON.parse(xhr.response);
                console.log("xhr.response", xhr.response);
                console.log("result", result);

                if (result.status == "success") {
                    window.location.href = result.url;
                }
            };
            xhr.send(data);
        }
    }, {
        key: 'onRecordingTick',
        value: function onRecordingTick() {
            var timeSpan = parseInt(((new Date().getTime() - this.timerStart) / 1000).toFixed());
            var timeStr = this.IntToTime(timeSpan);
            this.model.set('recordingTime', timeStr);
        }
    }, {
        key: 'onCountdownTick',
        value: function onCountdownTick() {
            if (--this.timerStart > 0) {
                this.model.set('recordingTime', this.timerStart);
            } else {
                console.log("countdown hit zero. begin recording.");
                clearInterval(this.timerId);
                this.model.set('recordingTime', this.IntToTime(0));
                this.onMicRecording();
            }
        }
    }, {
        key: 'startRecording',
        value: function startRecording() {
            var _this = this;

            console.log("starting recording");
            this.audioCapture.start(function () {
                return _this.onMicReady();
            });
        }

        /**
         * Microphone is ready to record. Do a count-down, then signal for input-signal to begin recording
         */
    }, {
        key: 'onMicReady',
        value: function onMicReady() {
            console.log("mic ready to record. do countdown.");
            this.timerStart = 3;
            // run countdown
            //this.timerId = setInterval(this.onCountdownTick.bind(this), 1000);

            // or launch capture immediately
            this.model.set('recordingTime', this.IntToTime(0));
            this.onMicRecording();

            $(".recording-time").addClass("is-visible");
        }
    }, {
        key: 'onMicRecording',
        value: function onMicRecording() {
            var _this2 = this;

            this.timerStart = new Date().getTime();
            this.timerId = setInterval(this.onRecordingTick.bind(this), 1000);
            $(".m-recording-screen").addClass("is-recording");

            console.log("Mic recording started");

            // TODO: the mic capture is already active, so audio buffers are getting built up
            // when toggling this on, we may already be capturing a buffer that has audio prior to the countdown
            // hitting zero. we can do a few things here:
            // 1) figure out how much audio was already captured, and cut it out
            // 2) use a fade-in to cover up that split-second of audio
            // 3) allow the user to edit post-record and clip as they wish (better but more complex option!)
            setTimeout(function () {
                return _this2.audioCapture.toggleMicrophoneRecording(true);
            }, 500);
        }
    }, {
        key: 'stopRecording',
        value: function stopRecording() {
            var _this3 = this;

            console.log("stopping recording");
            clearInterval(this.timerId);

            // play sound immediately to bypass mobile chrome's "user initiated media" requirement
            this.audioPlayer.src = "/assets/sounds/beep_short_on.ogg";
            this.audioPlayer.play();

            this.audioCapture.stop(function (blob) {
                return _this3.onRecordingCompleted(blob);
            });

            $(".recording-time").removeClass("is-visible");
            $(".m-recording-screen").removeClass("is-recording");

            // TODO: animate recorder out
            // TODO: animate uploader in
        }
    }, {
        key: 'onRecordingCompleted',
        value: function onRecordingCompleted(blob) {
            console.log("Recorder::onRecordingCompleted(); previewing recorded audio");
            this.audioBlob = blob;
            this.showCompletionScreen();
        }
    }, {
        key: 'playPreview',
        value: function playPreview() {
            console.log("playing preview..");
            console.log("audio blob", this.audioBlob);
            console.log("audio blob url", this.audioBlobUrl);
            this.audioPlayer.src = this.audioBlobUrl;
            this.audioPlayer.play();
        }
    }, {
        key: 'showCompletionScreen',
        value: function showCompletionScreen() {
            var _this4 = this;

            console.log("Recorder::onRecordingCompleted(); flipping to audio playback");
            this.audioBlobUrl = window.URL.createObjectURL(this.audioBlob);
            $(".m-recording-container").addClass("flipped");

            // HACK: route blob through xhr to let Android Chrome play blobs via <audio>
            var xhr = new XMLHttpRequest();
            xhr.open('GET', this.audioBlobUrl, true);
            xhr.responseType = 'blob';
            xhr.overrideMimeType('audio/ogg');

            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4 && xhr.status == 200) {
                    var xhrBlobUrl = window.URL.createObjectURL(xhr.response);

                    console.log("Loaded blob from cache url: " + _this4.audioBlobUrl);
                    console.log("Routed into blob url: " + xhrBlobUrl);

                    _this4.audioPlayer.src = xhrBlobUrl;
                    _this4.audioPlayer.play();
                }
            };
            xhr.send();
        }
    }]);

    return RecorderView;
})(_backbone2['default'].View);

exports.RecorderView = RecorderView;

},{"./audio-capture":2,"./audio-player":3,"./quip-control.js":9,"backbone":"backbone","underscore":"underscore"}],11:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _backbone = require('backbone');

var _backbone2 = _interopRequireDefault(_backbone);

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _homepage = require('./homepage');

var _homepage2 = _interopRequireDefault(_homepage);

var _recordingControl = require('./recording-control');

var _userPodCollection = require('./user-pod-collection');

var Router = (function (_Backbone$Router) {
    _inherits(Router, _Backbone$Router);

    function Router() {
        _classCallCheck(this, Router);

        _get(Object.getPrototypeOf(Router.prototype), 'constructor', this).call(this, {
            routes: {
                '': 'home',
                'record': 'record',
                'u/:username': 'user'
            }
        });
    }

    _createClass(Router, [{
        key: 'home',
        value: function home() {
            console.log('Router#home called');

            var view = new _homepage2['default']();
            this.switchView(view);
        }
    }, {
        key: 'user',
        value: function user(username) {
            console.log('Router#user called for username = ' + username);
            var view = new _userPodCollection.UserPodCollectionView(username);
            this.switchView(view);
        }
    }, {
        key: 'record',
        value: function record() {
            console.log('Router#record called');

            var view = new _recordingControl.RecorderView({
                model: new _recordingControl.Recorder({ recordingTime: -3 })
            });

            this.switchView(view);
        }
    }, {
        key: 'switchView',
        value: function switchView(newView) {
            if (this.view) {
                var oldView = this.view;
                oldView.$el.removeClass("transition-in");
                oldView.$el.addClass("transition-out");
                oldView.$el.one("animationend", function () {
                    oldView.remove();
                    oldView.unbind();
                    if (oldView.shutdown != null) {
                        oldView.shutdown();
                    }
                });
            }

            newView.$el.addClass("transitionable transition-in");
            newView.$el.one("animationend", function () {
                newView.$el.removeClass("transition-in");
            });

            $('#view-container').append(newView.el);
            this.view = newView;
        }
    }]);

    return Router;
})(_backbone2['default'].Router);

exports['default'] = Router;
module.exports = exports['default'];

},{"./homepage":4,"./recording-control":10,"./user-pod-collection":12,"backbone":"backbone","underscore":"underscore"}],12:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _backbone = require('backbone');

var _backbone2 = _interopRequireDefault(_backbone);

var _quipControlJs = require('./quip-control.js');

var _audioPlayer = require('./audio-player');

var _modelsQuip = require('./models/Quip');

var UserPodCollection = (function (_Backbone$Collection) {
    _inherits(UserPodCollection, _Backbone$Collection);

    function UserPodCollection(username) {
        _classCallCheck(this, UserPodCollection);

        _get(Object.getPrototypeOf(UserPodCollection.prototype), 'constructor', this).call(this);
        this.model = _modelsQuip.QuipModel;
        this.username = username;
    }

    _createClass(UserPodCollection, [{
        key: 'url',
        value: function url() {
            return "/api/u/" + this.username + "/quips";
        }
    }]);

    return UserPodCollection;
})(_backbone2['default'].Collection);

var UserPodCollectionView = (function (_Backbone$View) {
    _inherits(UserPodCollectionView, _Backbone$View);

    function UserPodCollectionView(username) {
        _classCallCheck(this, UserPodCollectionView);

        _get(Object.getPrototypeOf(UserPodCollectionView.prototype), 'constructor', this).call(this, username);
    }

    _createClass(UserPodCollectionView, [{
        key: 'initialize',
        value: function initialize(username) {
            var _this = this;

            new UserPodCollection(username).fetch().then(function (quips) {
                return _this.createChildViews(quips);
            });
        }
    }, {
        key: 'shutdown',
        value: function shutdown() {
            _audioPlayer.AudioPlayer.pause();
            this.destroyChildViews();
        }
    }, {
        key: 'createChildViews',
        value: function createChildViews(quips) {
            this.quipViews = [];

            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = quips[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var quip = _step.value;

                    var quipView = new _quipControlJs.QuipView({ model: new _modelsQuip.QuipModel(quip) });
                    this.quipViews.push(quipView);
                    this.$el.append(quipView.el);
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator['return']) {
                        _iterator['return']();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }
        }
    }, {
        key: 'destroyChildViews',
        value: function destroyChildViews() {
            if (this.quipViews != null) {
                var _iteratorNormalCompletion2 = true;
                var _didIteratorError2 = false;
                var _iteratorError2 = undefined;

                try {
                    for (var _iterator2 = this.quipViews[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                        var quip = _step2.value;

                        quip.shutdown();
                    }
                } catch (err) {
                    _didIteratorError2 = true;
                    _iteratorError2 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion2 && _iterator2['return']) {
                            _iterator2['return']();
                        }
                    } finally {
                        if (_didIteratorError2) {
                            throw _iteratorError2;
                        }
                    }
                }
            }
        }
    }]);

    return UserPodCollectionView;
})(_backbone2['default'].View);

exports.UserPodCollection = UserPodCollection;
exports.UserPodCollectionView = UserPodCollectionView;

},{"./audio-player":3,"./models/Quip":7,"./quip-control.js":9,"backbone":"backbone"}]},{},[1])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYWJhcmthbi9hbGV4LWRldi9xdWlwcy1weXRob24vYXBwL2phdmFzY3JpcHRzL2FwcC5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9hcHAvamF2YXNjcmlwdHMvYXVkaW8tY2FwdHVyZS5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9hcHAvamF2YXNjcmlwdHMvYXVkaW8tcGxheWVyLmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL2FwcC9qYXZhc2NyaXB0cy9ob21lcGFnZS5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9hcHAvamF2YXNjcmlwdHMvbW9kZWxzL0N1cnJlbnRVc2VyLmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL2FwcC9qYXZhc2NyaXB0cy9tb2RlbHMvTGlzdGVuU3RhdGUuanMiLCIvVXNlcnMvYWJhcmthbi9hbGV4LWRldi9xdWlwcy1weXRob24vYXBwL2phdmFzY3JpcHRzL21vZGVscy9RdWlwLmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL2FwcC9qYXZhc2NyaXB0cy9wb2x5ZmlsbC5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9hcHAvamF2YXNjcmlwdHMvcXVpcC1jb250cm9sLmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL2FwcC9qYXZhc2NyaXB0cy9yZWNvcmRpbmctY29udHJvbC5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9hcHAvamF2YXNjcmlwdHMvcm91dGVyLmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL2FwcC9qYXZhc2NyaXB0cy91c2VyLXBvZC1jb2xsZWN0aW9uLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7O3dCQ0FxQixVQUFVOzs7O3NCQUNaLFFBQVE7Ozs7aUNBQ3dCLHNCQUFzQjs7aUNBQ3hDLHNCQUFzQjs7MkJBQ3ZCLGdCQUFnQjs7c0JBQzdCLFVBQVU7Ozs7QUFFN0IsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQzs7SUFFaEIsV0FBVztBQUNGLGFBRFQsV0FBVyxHQUNDOzhCQURaLFdBQVc7S0FHWjs7aUJBSEMsV0FBVzs7ZUFLSCxzQkFBRzs7O0FBQ1QsZ0JBQUksTUFBTSxHQUFHLHlCQUFZLENBQUM7O0FBRTFCLGtDQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDZixrQ0FBUyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQzs7OztBQUk3RCxhQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsVUFBVSxHQUFHLEVBQUU7O0FBRTlDLG9CQUFJLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ2hDLG9CQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQzs7QUFFcEMsb0JBQUksYUFBYSxHQUFHLEtBQUssQ0FBQzs7OztBQUkxQixvQkFBSSxDQUFDLGFBQWEsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxRQUFRLEVBQUU7QUFDNUQsdUJBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQzs7Ozs7QUFLckIsMENBQVMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7aUJBQ3pDO2FBQ0osQ0FBQyxDQUFDOztBQUVILGdCQUFJLFdBQVcsR0FBRyxpQ0FB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U0FBUyxHQUFHLEVBQUUsQ0FBQzs7Ozs7OztBQUVwQixxQ0FBaUIsS0FBSyw4SEFBRTt3QkFBZixJQUFJOztBQUNULHdCQUFJLFFBQVEsR0FBRyw0QkFBYSxFQUFDLEtBQUssRUFBRSwwQkFBYyxJQUFJLENBQUMsRUFBQyxDQUFDLENBQUM7QUFDMUQsd0JBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQzlCLHdCQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7aUJBQ2hDOzs7Ozs7Ozs7Ozs7Ozs7U0FDSjs7O2VBRWdCLDZCQUFHO0FBQ2hCLGdCQUFJLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxFQUFFOzs7Ozs7QUFDeEIsMENBQWlCLElBQUksQ0FBQyxTQUFTLG1JQUFFOzRCQUF4QixJQUFJOztBQUNULDRCQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7cUJBQ25COzs7Ozs7Ozs7Ozs7Ozs7YUFDSjtTQUNKOzs7V0FoQ0MscUJBQXFCO0dBQVMsc0JBQVMsSUFBSTs7UUFtQ3hDLGlCQUFpQixHQUFqQixpQkFBaUI7UUFBRSxxQkFBcUIsR0FBckIscUJBQXFCIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcbmltcG9ydCBqUXVlcnkgZnJvbSAnanF1ZXJ5J1xuaW1wb3J0IHsgTGlzdGVuU3RhdGUsIExpc3RlblN0YXRlQ29sbGVjdGlvbiB9IGZyb20gJy4vbW9kZWxzL0xpc3RlblN0YXRlJ1xuaW1wb3J0IHsgQ3VycmVudFVzZXJNb2RlbCB9IGZyb20gJy4vbW9kZWxzL0N1cnJlbnRVc2VyJ1xuaW1wb3J0IHsgQXVkaW9QbGF5ZXJWaWV3IH0gZnJvbSAnLi9hdWRpby1wbGF5ZXInXG5pbXBvcnQgUm91dGVyIGZyb20gJy4vcm91dGVyJ1xuXG4kID0gcmVxdWlyZSgnanF1ZXJ5Jyk7XG5cbmNsYXNzIEFwcGxpY2F0aW9uIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcblxuICAgIH1cblxuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHZhciByb3V0ZXIgPSBuZXcgUm91dGVyKCk7XG5cbiAgICAgICAgQmFja2JvbmUuJCA9ICQ7XG4gICAgICAgIEJhY2tib25lLmhpc3Rvcnkuc3RhcnQoe3B1c2hTdGF0ZTogdHJ1ZSwgaGFzaENoYW5nZTogZmFsc2V9KTtcbiAgICAgICAgLy9pZiAoIUJhY2tib25lLmhpc3Rvcnkuc3RhcnQoe3B1c2hTdGF0ZTogdHJ1ZSwgaGFzaENoYW5nZTogZmFsc2V9KSkgcm91dGVyLm5hdmlnYXRlKCc0MDQnLCB7dHJpZ2dlcjogdHJ1ZX0pO1xuXG4gICAgICAgIC8vIFVzZSBkZWxlZ2F0aW9uIHRvIGF2b2lkIGluaXRpYWwgRE9NIHNlbGVjdGlvbiBhbmQgYWxsb3cgYWxsIG1hdGNoaW5nIGVsZW1lbnRzIHRvIGJ1YmJsZVxuICAgICAgICAkKGRvY3VtZW50KS5kZWxlZ2F0ZShcImFcIiwgXCJjbGlja1wiLCBmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICAgICAgICAvLyBHZXQgdGhlIGFuY2hvciBocmVmIGFuZCBwcm90Y29sXG4gICAgICAgICAgICB2YXIgaHJlZiA9ICQodGhpcykuYXR0cihcImhyZWZcIik7XG4gICAgICAgICAgICB2YXIgcHJvdG9jb2wgPSB0aGlzLnByb3RvY29sICsgXCIvL1wiO1xuXG4gICAgICAgICAgICB2YXIgb3BlbkxpbmtJblRhYiA9IGZhbHNlO1xuXG4gICAgICAgICAgICAvLyBFbnN1cmUgdGhlIHByb3RvY29sIGlzIG5vdCBwYXJ0IG9mIFVSTCwgbWVhbmluZyBpdHMgcmVsYXRpdmUuXG4gICAgICAgICAgICAvLyBTdG9wIHRoZSBldmVudCBidWJibGluZyB0byBlbnN1cmUgdGhlIGxpbmsgd2lsbCBub3QgY2F1c2UgYSBwYWdlIHJlZnJlc2guXG4gICAgICAgICAgICBpZiAoIW9wZW5MaW5rSW5UYWIgJiYgaHJlZi5zbGljZShwcm90b2NvbC5sZW5ndGgpICE9PSBwcm90b2NvbCkge1xuICAgICAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICAgICAgLy8gTm90ZSBieSB1c2luZyBCYWNrYm9uZS5oaXN0b3J5Lm5hdmlnYXRlLCByb3V0ZXIgZXZlbnRzIHdpbGwgbm90IGJlXG4gICAgICAgICAgICAgICAgLy8gdHJpZ2dlcmVkLiAgSWYgdGhpcyBpcyBhIHByb2JsZW0sIGNoYW5nZSB0aGlzIHRvIG5hdmlnYXRlIG9uIHlvdXJcbiAgICAgICAgICAgICAgICAvLyByb3V0ZXIuXG4gICAgICAgICAgICAgICAgQmFja2JvbmUuaGlzdG9yeS5uYXZpZ2F0ZShocmVmLCB0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIGF1ZGlvUGxheWVyID0gbmV3IEF1ZGlvUGxheWVyVmlldyh7ZWw6ICcjYXVkaW8tcGxheWVyJ30pO1xuXG4gICAgICAgIC8vIGxvYWQgdXNlclxuICAgICAgICB2YXIgbW9kZWwgPSBuZXcgQ3VycmVudFVzZXJNb2RlbCgpO1xuICAgICAgICBtb2RlbC5mZXRjaCgpLnRoZW4oKCkgPT4gdGhpcy5vbk1vZGVsTG9hZGVkKG1vZGVsKSk7XG5cbiAgICAgICAgLy9uZXcgTGlzdGVuU3RhdGVDb2xsZWN0aW9uKCkuZmV0Y2goKS50aGVuKChzdGF0ZSkgPT4gY29uc29sZS5sb2coXCJnb3QgbGlzdGVuIHN0YXRlc1wiLCBzdGF0ZSkpO1xuICAgIH1cblxuICAgIG9uTW9kZWxMb2FkZWQodXNlcikge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkxvYWRlZCBjdXJyZW50IHVzZXJcIiwgdXNlci5hdHRyaWJ1dGVzKTtcbiAgICAgICAgdGhpcy5jdXJyZW50VXNlciA9IHVzZXI7XG4gICAgfVxufVxuXG5leHBvcnQgbGV0IGFwcCA9IG5ldyBBcHBsaWNhdGlvbigpO1xuXG5cbiQoKCkgPT4ge1xuICAgIC8vIHNldHVwIHJhdmVuIHRvIHB1c2ggbWVzc2FnZXMgdG8gb3VyIHNlbnRyeVxuICAgIC8vUmF2ZW4uY29uZmlnKCdodHRwczovL2QwOTg3MTJjYjcwNjRjZjA4Yjc0ZDAxYjZmM2JlM2RhQGFwcC5nZXRzZW50cnkuY29tLzIwOTczJywge1xuICAgIC8vICAgIHdoaXRlbGlzdFVybHM6IFsnc3RhZ2luZy5jb3VjaHBvZC5jb20nLCAnY291Y2hwb2QuY29tJ10gLy8gcHJvZHVjdGlvbiBvbmx5XG4gICAgLy99KS5pbnN0YWxsKCk7XG5cbiAgICBSYXZlbi5jb25maWcoJ2h0dHBzOi8vZGIyYTdkNTgxMDdjNDk3NWFlN2RlNzM2YTYzMDhhMWVAYXBwLmdldHNlbnRyeS5jb20vNTM0NTYnLCB7XG4gICAgICAgIHdoaXRlbGlzdFVybHM6IFsnc3RhZ2luZy5jb3VjaHBvZC5jb20nLCAnY291Y2hwb2QuY29tJ10gLy8gcHJvZHVjdGlvbiBvbmx5XG4gICAgfSkuaW5zdGFsbCgpXG5cbiAgICBhcHAuaW5pdGlhbGl6ZSgpO1xuXG4gICAgLy8gZm9yIHByb2R1Y3Rpb24sIGNvdWxkIHdyYXAgZG9tUmVhZHlDYWxsYmFjayBhbmQgbGV0IHJhdmVuIGhhbmRsZSBhbnkgZXhjZXB0aW9uc1xuXG4gICAgLypcbiAgICAgdHJ5IHtcbiAgICAgZG9tUmVhZHlDYWxsYmFjaygpO1xuICAgICB9IGNhdGNoKGVycikge1xuICAgICBSYXZlbi5jYXB0dXJlRXhjZXB0aW9uKGVycik7XG4gICAgIGNvbnNvbGUubG9nKFwiW0Vycm9yXSBVbmhhbmRsZWQgRXhjZXB0aW9uIHdhcyBjYXVnaHQgYW5kIHNlbnQgdmlhIFJhdmVuOlwiKTtcbiAgICAgY29uc29sZS5kaXIoZXJyKTtcbiAgICAgfVxuICAgICAqL1xufSlcblxuZXhwb3J0IGRlZmF1bHQge0FwcGxpY2F0aW9ufVxuIiwiaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSdcbmltcG9ydCBQb2x5ZmlsbCBmcm9tICcuL3BvbHlmaWxsLmpzJ1xuXG5jbGFzcyBBdWRpb0NhcHR1cmUge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICAvLyBzcGF3biBiYWNrZ3JvdW5kIHdvcmtlclxuICAgICAgICB0aGlzLl9lbmNvZGluZ1dvcmtlciA9IG5ldyBXb3JrZXIoXCIvYXNzZXRzL2pzL3dvcmtlci1lbmNvZGVyLm1pbi5qc1wiKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcIkluaXRpYWxpemVkIEF1ZGlvQ2FwdHVyZVwiKTtcblxuICAgICAgICB0aGlzLl9hdWRpb0NvbnRleHQgPSBudWxsO1xuICAgICAgICB0aGlzLl9hdWRpb0lucHV0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5fZW5jb2RpbmdXb3JrZXIgPSBudWxsO1xuICAgICAgICB0aGlzLl9pc1JlY29yZGluZyA9IGZhbHNlO1xuICAgICAgICB0aGlzLl9hdWRpb0xpc3RlbmVyID0gbnVsbDtcbiAgICAgICAgdGhpcy5fb25DYXB0dXJlQ29tcGxldGVDYWxsYmFjayA9IG51bGw7XG4gICAgICAgIHRoaXMuX2F1ZGlvQW5hbHl6ZXIgPSBudWxsO1xuICAgICAgICB0aGlzLl9hdWRpb0dhaW4gPSBudWxsO1xuICAgICAgICB0aGlzLl9jYWNoZWRNZWRpYVN0cmVhbSA9IG51bGw7XG5cbiAgICAgICAgdGhpcy5fYXVkaW9FbmNvZGVyID0gbnVsbDtcbiAgICAgICAgdGhpcy5fbGF0ZXN0QXVkaW9CdWZmZXIgPSBbXTtcbiAgICAgICAgdGhpcy5fY2FjaGVkR2FpblZhbHVlID0gMTtcbiAgICAgICAgdGhpcy5fb25TdGFydGVkQ2FsbGJhY2sgPSBudWxsO1xuXG4gICAgICAgIHRoaXMuX2ZmdFNpemUgPSAyNTY7XG4gICAgICAgIHRoaXMuX2ZmdFNtb290aGluZyA9IDAuODtcbiAgICAgICAgdGhpcy5fdG90YWxOdW1TYW1wbGVzID0gMDtcblxuICAgICAgICBQb2x5ZmlsbC5pbnN0YWxsKCk7XG4gICAgfVxuXG4gICAgLy8gVE9ETzogZmlyZWZveCdzIGJ1aWx0LWluIG9nZy1jcmVhdGlvbiByb3V0ZVxuICAgIC8vIEZpcmVmb3ggMjcncyBtYW51YWwgcmVjb3JkaW5nIGRvZXNuJ3Qgd29yay4gc29tZXRoaW5nIGZ1bm55IHdpdGggdGhlaXIgc2FtcGxpbmcgcmF0ZXMgb3IgYnVmZmVyIHNpemVzXG4gICAgLy8gdGhlIGRhdGEgaXMgZmFpcmx5IGdhcmJsZWQsIGxpa2UgdGhleSBhcmUgc2VydmluZyAyMmtoeiBhcyA0NGtoeiBvciBzb21ldGhpbmcgbGlrZSB0aGF0XG4gICAgc3RhcnRBdXRvbWF0aWNFbmNvZGluZyhtZWRpYVN0cmVhbSkge1xuICAgICAgICB0aGlzLl9hdWRpb0VuY29kZXIgPSBuZXcgTWVkaWFSZWNvcmRlcihtZWRpYVN0cmVhbSk7XG5cbiAgICAgICAgdGhpcy5fYXVkaW9FbmNvZGVyLm9uZGF0YWF2YWlsYWJsZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkF1ZGlvQ2FwdHVyZTo6c3RhcnRBdXRvbWF0aWNFbmNvZGluZygpOyBNZWRpYVJlY29yZGVyLm9uZGF0YWF2YWlsYWJsZSgpOyBuZXcgYmxvYjogc2l6ZT1cIiArIGUuZGF0YS5zaXplICsgXCIgdHlwZT1cIiArIGUuZGF0YS50eXBlKTtcbiAgICAgICAgICAgIHRoaXMuX2xhdGVzdEF1ZGlvQnVmZmVyLnB1c2goZS5kYXRhKTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLl9hdWRpb0VuY29kZXIub25zdG9wID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJBdWRpb0NhcHR1cmU6OnN0YXJ0QXV0b21hdGljRW5jb2RpbmcoKTsgTWVkaWFSZWNvcmRlci5vbnN0b3AoKTsgaGl0XCIpO1xuXG4gICAgICAgICAgICAvLyBzZW5kIHRoZSBsYXN0IGNhcHR1cmVkIGF1ZGlvIGJ1ZmZlclxuICAgICAgICAgICAgdmFyIGVuY29kZWRfYmxvYiA9IG5ldyBCbG9iKHRoaXMuX2xhdGVzdEF1ZGlvQnVmZmVyLCB7dHlwZTogJ2F1ZGlvL29nZyd9KTtcblxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJBdWRpb0NhcHR1cmU6OnN0YXJ0QXV0b21hdGljRW5jb2RpbmcoKTsgTWVkaWFSZWNvcmRlci5vbnN0b3AoKTsgZ290IGVuY29kZWQgYmxvYjogc2l6ZT1cIiArIGVuY29kZWRfYmxvYi5zaXplICsgXCIgdHlwZT1cIiArIGVuY29kZWRfYmxvYi50eXBlKTtcblxuICAgICAgICAgICAgaWYgKHRoaXMuX29uQ2FwdHVyZUNvbXBsZXRlQ2FsbGJhY2spXG4gICAgICAgICAgICAgICAgdGhpcy5fb25DYXB0dXJlQ29tcGxldGVDYWxsYmFjayhlbmNvZGVkX2Jsb2IpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQXVkaW9DYXB0dXJlOjpzdGFydEF1dG9tYXRpY0VuY29kaW5nKCk7IE1lZGlhUmVjb3JkZXIuc3RhcnQoKVwiKTtcbiAgICAgICAgdGhpcy5fYXVkaW9FbmNvZGVyLnN0YXJ0KDApO1xuICAgIH1cblxuICAgIGNyZWF0ZUF1ZGlvQ29udGV4dChtZWRpYVN0cmVhbSkge1xuICAgICAgICAvLyBidWlsZCBjYXB0dXJlIGdyYXBoXG4gICAgICAgIHRoaXMuX2F1ZGlvQ29udGV4dCA9IG5ldyAod2luZG93LkF1ZGlvQ29udGV4dCB8fCB3aW5kb3cud2Via2l0QXVkaW9Db250ZXh0KSgpO1xuICAgICAgICB0aGlzLl9hdWRpb0lucHV0ID0gdGhpcy5fYXVkaW9Db250ZXh0LmNyZWF0ZU1lZGlhU3RyZWFtU291cmNlKG1lZGlhU3RyZWFtKTtcbiAgICAgICAgdGhpcy5fYXVkaW9EZXN0aW5hdGlvbiA9IHRoaXMuX2F1ZGlvQ29udGV4dC5jcmVhdGVNZWRpYVN0cmVhbURlc3RpbmF0aW9uKCk7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJBdWRpb0NhcHR1cmU6OnN0YXJ0TWFudWFsRW5jb2RpbmcoKTsgX2F1ZGlvQ29udGV4dC5zYW1wbGVSYXRlOiBcIiArIHRoaXMuX2F1ZGlvQ29udGV4dC5zYW1wbGVSYXRlICsgXCIgSHpcIik7XG5cbiAgICAgICAgLy8gY3JlYXRlIGEgbGlzdGVuZXIgbm9kZSB0byBncmFiIG1pY3JvcGhvbmUgc2FtcGxlcyBhbmQgZmVlZCBpdCB0byBvdXIgYmFja2dyb3VuZCB3b3JrZXJcbiAgICAgICAgdGhpcy5fYXVkaW9MaXN0ZW5lciA9ICh0aGlzLl9hdWRpb0NvbnRleHQuY3JlYXRlU2NyaXB0UHJvY2Vzc29yIHx8IHRoaXMuX2F1ZGlvQ29udGV4dC5jcmVhdGVKYXZhU2NyaXB0Tm9kZSkuY2FsbCh0aGlzLl9hdWRpb0NvbnRleHQsIDE2Mzg0LCAxLCAxKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcInRoaXMuX2NhY2hlZEdhaW5WYWx1ZSA9IFwiICsgdGhpcy5fY2FjaGVkR2FpblZhbHVlKTtcblxuICAgICAgICB0aGlzLl9hdWRpb0dhaW4gPSB0aGlzLl9hdWRpb0NvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgICAgICB0aGlzLl9hdWRpb0dhaW4uZ2Fpbi52YWx1ZSA9IHRoaXMuX2NhY2hlZEdhaW5WYWx1ZTtcblxuICAgICAgICAvL3RoaXMuX2F1ZGlvQW5hbHl6ZXIgPSB0aGlzLl9hdWRpb0NvbnRleHQuY3JlYXRlQW5hbHlzZXIoKTtcbiAgICAgICAgLy90aGlzLl9hdWRpb0FuYWx5emVyLmZmdFNpemUgPSB0aGlzLl9mZnRTaXplO1xuICAgICAgICAvL3RoaXMuX2F1ZGlvQW5hbHl6ZXIuc21vb3RoaW5nVGltZUNvbnN0YW50ID0gdGhpcy5fZmZ0U21vb3RoaW5nO1xuICAgIH1cblxuICAgIHN0YXJ0TWFudWFsRW5jb2RpbmcobWVkaWFTdHJlYW0pIHtcblxuICAgICAgICBpZiAoIXRoaXMuX2F1ZGlvQ29udGV4dCkge1xuICAgICAgICAgICAgdGhpcy5jcmVhdGVBdWRpb0NvbnRleHQobWVkaWFTdHJlYW0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0aGlzLl9lbmNvZGluZ1dvcmtlcilcbiAgICAgICAgICAgIHRoaXMuX2VuY29kaW5nV29ya2VyID0gbmV3IFdvcmtlcihcIi9hc3NldHMvanMvd29ya2VyLWVuY29kZXIubWluLmpzXCIpO1xuXG4gICAgICAgIC8vIHJlLWhvb2sgYXVkaW8gbGlzdGVuZXIgbm9kZSBldmVyeSB0aW1lIHdlIHN0YXJ0LCBiZWNhdXNlIF9lbmNvZGluZ1dvcmtlciByZWZlcmVuY2Ugd2lsbCBjaGFuZ2VcbiAgICAgICAgdGhpcy5fYXVkaW9MaXN0ZW5lci5vbmF1ZGlvcHJvY2VzcyA9IChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuX2lzUmVjb3JkaW5nKSByZXR1cm47XG5cbiAgICAgICAgICAgIHZhciBtc2cgPSB7XG4gICAgICAgICAgICAgICAgYWN0aW9uOiBcInByb2Nlc3NcIixcblxuICAgICAgICAgICAgICAgIC8vIHR3byBGbG9hdDMyQXJyYXlzXG4gICAgICAgICAgICAgICAgbGVmdDogZS5pbnB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKVxuICAgICAgICAgICAgICAgIC8vcmlnaHQ6IGUuaW5wdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSlcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vdmFyIGxlZnRPdXQgPSBlLm91dHB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKTtcbiAgICAgICAgICAgIC8vZm9yKHZhciBpID0gMDsgaSA8IG1zZy5sZWZ0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAvLyAgICBsZWZ0T3V0W2ldID0gbXNnLmxlZnRbaV07XG4gICAgICAgICAgICAvL31cblxuICAgICAgICAgICAgdGhpcy5fdG90YWxOdW1TYW1wbGVzICs9IG1zZy5sZWZ0Lmxlbmd0aDtcblxuICAgICAgICAgICAgdGhpcy5fZW5jb2RpbmdXb3JrZXIucG9zdE1lc3NhZ2UobXNnKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBoYW5kbGUgbWVzc2FnZXMgZnJvbSB0aGUgZW5jb2Rpbmctd29ya2VyXG4gICAgICAgIHRoaXMuX2VuY29kaW5nV29ya2VyLm9ubWVzc2FnZSA9IChlKSA9PiB7XG5cbiAgICAgICAgICAgIC8vIHdvcmtlciBmaW5pc2hlZCBhbmQgaGFzIHRoZSBmaW5hbCBlbmNvZGVkIGF1ZGlvIGJ1ZmZlciBmb3IgdXNcbiAgICAgICAgICAgIGlmIChlLmRhdGEuYWN0aW9uID09PSBcImVuY29kZWRcIikge1xuICAgICAgICAgICAgICAgIHZhciBlbmNvZGVkX2Jsb2IgPSBuZXcgQmxvYihbZS5kYXRhLmJ1ZmZlcl0sIHt0eXBlOiAnYXVkaW8vb2dnJ30pO1xuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJlLmRhdGEuYnVmZmVyLmJ1ZmZlciA9IFwiICsgZS5kYXRhLmJ1ZmZlci5idWZmZXIpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZS5kYXRhLmJ1ZmZlci5ieXRlTGVuZ3RoID0gXCIgKyBlLmRhdGEuYnVmZmVyLmJ5dGVMZW5ndGgpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwic2FtcGxlUmF0ZSA9IFwiICsgdGhpcy5fYXVkaW9Db250ZXh0LnNhbXBsZVJhdGUpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidG90YWxOdW1TYW1wbGVzID0gXCIgKyB0aGlzLl90b3RhbE51bVNhbXBsZXMpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRHVyYXRpb24gb2YgcmVjb3JkaW5nID0gXCIgKyAodGhpcy5fdG90YWxOdW1TYW1wbGVzIC8gdGhpcy5fYXVkaW9Db250ZXh0LnNhbXBsZVJhdGUpICsgXCIgc2Vjb25kc1wiKTtcblxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZ290IGVuY29kZWQgYmxvYjogc2l6ZT1cIiArIGVuY29kZWRfYmxvYi5zaXplICsgXCIgdHlwZT1cIiArIGVuY29kZWRfYmxvYi50eXBlKTtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9vbkNhcHR1cmVDb21wbGV0ZUNhbGxiYWNrKVxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9vbkNhcHR1cmVDb21wbGV0ZUNhbGxiYWNrKGVuY29kZWRfYmxvYik7XG5cbiAgICAgICAgICAgICAgICAvLyB3b3JrZXIgaGFzIGV4aXRlZCwgdW5yZWZlcmVuY2UgaXRcbiAgICAgICAgICAgICAgICB0aGlzLl9lbmNvZGluZ1dvcmtlciA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gY29uZmlndXJlIHdvcmtlciB3aXRoIGEgc2FtcGxpbmcgcmF0ZSBhbmQgYnVmZmVyLXNpemVcbiAgICAgICAgdGhpcy5fZW5jb2RpbmdXb3JrZXIucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgYWN0aW9uOiBcImluaXRpYWxpemVcIixcbiAgICAgICAgICAgIHNhbXBsZV9yYXRlOiB0aGlzLl9hdWRpb0NvbnRleHQuc2FtcGxlUmF0ZSxcbiAgICAgICAgICAgIGJ1ZmZlcl9zaXplOiB0aGlzLl9hdWRpb0xpc3RlbmVyLmJ1ZmZlclNpemVcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVE9ETzogaXQgbWlnaHQgYmUgYmV0dGVyIHRvIGxpc3RlbiBmb3IgYSBtZXNzYWdlIGJhY2sgZnJvbSB0aGUgYmFja2dyb3VuZCB3b3JrZXIgYmVmb3JlIGNvbnNpZGVyaW5nIHRoYXQgcmVjb3JkaW5nIGhhcyBiZWdhblxuICAgICAgICAvLyBpdCdzIGVhc2llciB0byB0cmltIGF1ZGlvIHRoYW4gY2FwdHVyZSBhIG1pc3Npbmcgd29yZCBhdCB0aGUgc3RhcnQgb2YgYSBzZW50ZW5jZVxuICAgICAgICB0aGlzLl9pc1JlY29yZGluZyA9IGZhbHNlO1xuXG4gICAgICAgIC8vIGNvbm5lY3QgYXVkaW8gbm9kZXNcbiAgICAgICAgLy8gYXVkaW8taW5wdXQgLT4gZ2FpbiAtPiBmZnQtYW5hbHl6ZXIgLT4gUENNLWRhdGEgY2FwdHVyZSAtPiBkZXN0aW5hdGlvblxuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQXVkaW9DYXB0dXJlOjpzdGFydE1hbnVhbEVuY29kaW5nKCk7IENvbm5lY3RpbmcgQXVkaW8gTm9kZXMuLlwiKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcImNvbm5lY3Rpbmc6IGlucHV0LT5nYWluXCIpO1xuICAgICAgICB0aGlzLl9hdWRpb0lucHV0LmNvbm5lY3QodGhpcy5fYXVkaW9HYWluKTtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcImNvbm5lY3Rpbmc6IGdhaW4tPmFuYWx5emVyXCIpO1xuICAgICAgICAvL3RoaXMuX2F1ZGlvR2Fpbi5jb25uZWN0KHRoaXMuX2F1ZGlvQW5hbHl6ZXIpO1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiY29ubmVjdGluZzogYW5hbHl6ZXItPmxpc3Rlc25lclwiKTtcbiAgICAgICAgLy90aGlzLl9hdWRpb0FuYWx5emVyLmNvbm5lY3QodGhpcy5fYXVkaW9MaXN0ZW5lcik7XG4gICAgICAgIC8vIGNvbm5lY3QgZ2FpbiBkaXJlY3RseSBpbnRvIGxpc3RlbmVyLCBieXBhc3NpbmcgYW5hbHl6ZXJcbiAgICAgICAgY29uc29sZS5sb2coXCJjb25uZWN0aW5nOiBnYWluLT5saXN0ZW5lclwiKTtcbiAgICAgICAgdGhpcy5fYXVkaW9HYWluLmNvbm5lY3QodGhpcy5fYXVkaW9MaXN0ZW5lcik7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiY29ubmVjdGluZzogbGlzdGVuZXItPmRlc3RpbmF0aW9uXCIpO1xuICAgICAgICB0aGlzLl9hdWRpb0xpc3RlbmVyLmNvbm5lY3QodGhpcy5fYXVkaW9EZXN0aW5hdGlvbik7XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgc2h1dGRvd25NYW51YWxFbmNvZGluZygpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJBdWRpb0NhcHR1cmU6OnNodXRkb3duTWFudWFsRW5jb2RpbmcoKTsgVGVhcmluZyBkb3duIEF1ZGlvQVBJIGNvbm5lY3Rpb25zLi5cIik7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJkaXNjb25uZWN0aW5nOiBsaXN0ZW5lci0+ZGVzdGluYXRpb25cIik7XG4gICAgICAgIHRoaXMuX2F1ZGlvTGlzdGVuZXIuZGlzY29ubmVjdCh0aGlzLl9hdWRpb0Rlc3RpbmF0aW9uKTtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcImRpc2Nvbm5lY3Rpbmc6IGFuYWx5emVyLT5saXN0ZXNuZXJcIik7XG4gICAgICAgIC8vdGhpcy5fYXVkaW9BbmFseXplci5kaXNjb25uZWN0KHRoaXMuX2F1ZGlvTGlzdGVuZXIpO1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiZGlzY29ubmVjdGluZzogZ2Fpbi0+YW5hbHl6ZXJcIik7XG4gICAgICAgIC8vdGhpcy5fYXVkaW9HYWluLmRpc2Nvbm5lY3QodGhpcy5fYXVkaW9BbmFseXplcik7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiZGlzY29ubmVjdGluZzogZ2Fpbi0+bGlzdGVuZXJcIik7XG4gICAgICAgIHRoaXMuX2F1ZGlvR2Fpbi5kaXNjb25uZWN0KHRoaXMuX2F1ZGlvTGlzdGVuZXIpO1xuICAgICAgICBjb25zb2xlLmxvZyhcImRpc2Nvbm5lY3Rpbmc6IGlucHV0LT5nYWluXCIpO1xuICAgICAgICB0aGlzLl9hdWRpb0lucHV0LmRpc2Nvbm5lY3QodGhpcy5fYXVkaW9HYWluKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUaGUgbWljcm9waG9uZSBtYXkgYmUgbGl2ZSwgYnV0IGl0IGlzbid0IHJlY29yZGluZy4gVGhpcyB0b2dnbGVzIHRoZSBhY3R1YWwgd3JpdGluZyB0byB0aGUgY2FwdHVyZSBzdHJlYW0uXG4gICAgICogY2FwdHVyZUF1ZGlvU2FtcGxlcyBib29sIGluZGljYXRlcyB3aGV0aGVyIHRvIHJlY29yZCBmcm9tIG1pY1xuICAgICAqL1xuICAgIHRvZ2dsZU1pY3JvcGhvbmVSZWNvcmRpbmcoY2FwdHVyZUF1ZGlvU2FtcGxlcykge1xuICAgICAgICB0aGlzLl9pc1JlY29yZGluZyA9IGNhcHR1cmVBdWRpb1NhbXBsZXM7XG4gICAgfVxuXG4gICAgLy8gY2FsbGVkIHdoZW4gdXNlciBhbGxvd3MgdXMgdXNlIG9mIHRoZWlyIG1pY3JvcGhvbmVcbiAgICBvbk1pY3JvcGhvbmVQcm92aWRlZChtZWRpYVN0cmVhbSkge1xuXG4gICAgICAgIHRoaXMuX2NhY2hlZE1lZGlhU3RyZWFtID0gbWVkaWFTdHJlYW07XG5cbiAgICAgICAgLy8gd2UgY291bGQgY2hlY2sgaWYgdGhlIGJyb3dzZXIgY2FuIHBlcmZvcm0gaXRzIG93biBlbmNvZGluZyBhbmQgdXNlIHRoYXRcbiAgICAgICAgLy8gRmlyZWZveCBjYW4gcHJvdmlkZSB1cyBvZ2crc3BlZXggb3Igb2dnK29wdXM/IGZpbGVzLCBidXQgdW5mb3J0dW5hdGVseSB0aGF0IGNvZGVjIGlzbid0IHN1cHBvcnRlZCB3aWRlbHkgZW5vdWdoXG4gICAgICAgIC8vIHNvIGluc3RlYWQgd2UgcGVyZm9ybSBtYW51YWwgZW5jb2RpbmcgZXZlcnl3aGVyZSByaWdodCBub3cgdG8gZ2V0IHVzIG9nZyt2b3JiaXNcbiAgICAgICAgLy8gdGhvdWdoIG9uZSBkYXksIGkgd2FudCBvZ2crb3B1cyEgb3B1cyBoYXMgYSB3b25kZXJmdWwgcmFuZ2Ugb2YgcXVhbGl0eSBzZXR0aW5ncyBwZXJmZWN0IGZvciB0aGlzIHByb2plY3RcblxuICAgICAgICBpZiAoZmFsc2UgJiYgdHlwZW9mKE1lZGlhUmVjb3JkZXIpICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXJ0QXV0b21hdGljRW5jb2RpbmcobWVkaWFTdHJlYW0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gbm8gbWVkaWEgcmVjb3JkZXIgYXZhaWxhYmxlLCBkbyBpdCBtYW51YWxseVxuICAgICAgICAgICAgdGhpcy5zdGFydE1hbnVhbEVuY29kaW5nKG1lZGlhU3RyZWFtKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRPRE86IG1pZ2h0IGJlIGEgZ29vZCB0aW1lIHRvIHN0YXJ0IGEgc3BlY3RyYWwgYW5hbHl6ZXJcbiAgICAgICAgaWYgKHRoaXMuX29uU3RhcnRlZENhbGxiYWNrKVxuICAgICAgICAgICAgdGhpcy5fb25TdGFydGVkQ2FsbGJhY2soKTtcbiAgICB9XG5cbiAgICBzZXRHYWluKGdhaW4pIHtcbiAgICAgICAgaWYgKHRoaXMuX2F1ZGlvR2FpbilcbiAgICAgICAgICAgIHRoaXMuX2F1ZGlvR2Fpbi5nYWluLnZhbHVlID0gZ2FpbjtcblxuICAgICAgICBjb25zb2xlLmxvZyhcInNldHRpbmcgZ2FpbjogXCIgKyBnYWluKTtcbiAgICAgICAgdGhpcy5fY2FjaGVkR2FpblZhbHVlID0gZ2FpbjtcbiAgICB9XG5cbiAgICBwcmVsb2FkTWVkaWFTdHJlYW0oKSB7XG4gICAgICAgIGlmICh0aGlzLl9jYWNoZWRNZWRpYVN0cmVhbSlcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICBuYXZpZ2F0b3IubWVkaWFEZXZpY2VcbiAgICAgICAgICAgIC5nZXRVc2VyTWVkaWEoe2F1ZGlvOiB0cnVlfSlcbiAgICAgICAgICAgIC50aGVuKChtcykgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuX2NhY2hlZE1lZGlhU3RyZWFtID0gbXM7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkF1ZGlvQ2FwdHVyZTo6c3RhcnQoKTsgY291bGQgbm90IGdyYWIgbWljcm9waG9uZS4gcGVyaGFwcyB1c2VyIGRpZG4ndCBnaXZlIHVzIHBlcm1pc3Npb24/XCIpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihlcnIpO1xuICAgICAgICAgICAgfSlcbiAgICB9O1xuXG5cblxuICAgIHN0YXJ0KG9uU3RhcnRlZENhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMuX29uU3RhcnRlZENhbGxiYWNrID0gb25TdGFydGVkQ2FsbGJhY2s7XG5cbiAgICAgICAgaWYgKHRoaXMuX2NhY2hlZE1lZGlhU3RyZWFtKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMub25NaWNyb3Bob25lUHJvdmlkZWQodGhpcy5fY2FjaGVkTWVkaWFTdHJlYW0pO1xuXG4gICAgICAgIG5hdmlnYXRvci5tZWRpYURldmljZVxuICAgICAgICAgICAgLmdldFVzZXJNZWRpYSh7YXVkaW86IHRydWV9KVxuICAgICAgICAgICAgLnRoZW4oKG1zKSA9PiB0aGlzLm9uTWljcm9waG9uZVByb3ZpZGVkKG1zKSlcbiAgICAgICAgICAgIC5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJBdWRpb0NhcHR1cmU6OnN0YXJ0KCk7IGNvdWxkIG5vdCBncmFiIG1pY3JvcGhvbmUuIHBlcmhhcHMgdXNlciBkaWRuJ3QgZ2l2ZSB1cyBwZXJtaXNzaW9uP1wiKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oZXJyKTtcbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgc3RvcChjYXB0dXJlQ29tcGxldGVDYWxsYmFjaykge1xuICAgICAgICB0aGlzLl9vbkNhcHR1cmVDb21wbGV0ZUNhbGxiYWNrID0gY2FwdHVyZUNvbXBsZXRlQ2FsbGJhY2s7XG4gICAgICAgIHRoaXMuX2lzUmVjb3JkaW5nID0gZmFsc2U7XG5cbiAgICAgICAgaWYgKHRoaXMuX2F1ZGlvQ29udGV4dCkge1xuICAgICAgICAgICAgLy8gc3RvcCB0aGUgbWFudWFsIGVuY29kZXJcbiAgICAgICAgICAgIHRoaXMuX2VuY29kaW5nV29ya2VyLnBvc3RNZXNzYWdlKHthY3Rpb246IFwiZmluaXNoXCJ9KTtcbiAgICAgICAgICAgIHRoaXMuc2h1dGRvd25NYW51YWxFbmNvZGluZygpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2F1ZGlvRW5jb2Rlcikge1xuICAgICAgICAgICAgLy8gc3RvcCB0aGUgYXV0b21hdGljIGVuY29kZXJcblxuICAgICAgICAgICAgaWYgKHRoaXMuX2F1ZGlvRW5jb2Rlci5zdGF0ZSAhPT0gJ3JlY29yZGluZycpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJBdWRpb0NhcHR1cmU6OnN0b3AoKTsgX2F1ZGlvRW5jb2Rlci5zdGF0ZSAhPSAncmVjb3JkaW5nJ1wiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5fYXVkaW9FbmNvZGVyLnJlcXVlc3REYXRhKCk7XG4gICAgICAgICAgICB0aGlzLl9hdWRpb0VuY29kZXIuc3RvcCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVE9ETzogc3RvcCBhbnkgYWN0aXZlIHNwZWN0cmFsIGFuYWx5c2lzXG4gICAgfTtcbn1cblxuLypcbi8vIHVudXNlZCBhdCB0aGUgbW9tZW50XG5mdW5jdGlvbiBBbmFseXplcigpIHtcblxuICAgIHZhciBfYXVkaW9DYW52YXNBbmltYXRpb25JZCxcbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXNcbiAgICAgICAgO1xuXG4gICAgdGhpcy5zdGFydEFuYWx5emVyVXBkYXRlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdXBkYXRlQW5hbHl6ZXIoKTtcbiAgICB9O1xuXG4gICAgdGhpcy5zdG9wQW5hbHl6ZXJVcGRhdGVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIV9hdWRpb0NhbnZhc0FuaW1hdGlvbklkKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZShfYXVkaW9DYW52YXNBbmltYXRpb25JZCk7XG4gICAgICAgIF9hdWRpb0NhbnZhc0FuaW1hdGlvbklkID0gbnVsbDtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gdXBkYXRlQW5hbHl6ZXIoKSB7XG5cbiAgICAgICAgaWYgKCFfYXVkaW9TcGVjdHJ1bUNhbnZhcylcbiAgICAgICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZWNvcmRpbmctdmlzdWFsaXplclwiKS5nZXRDb250ZXh0KFwiMmRcIik7XG5cbiAgICAgICAgdmFyIGZyZXFEYXRhID0gbmV3IFVpbnQ4QXJyYXkoX2F1ZGlvQW5hbHl6ZXIuZnJlcXVlbmN5QmluQ291bnQpO1xuICAgICAgICBfYXVkaW9BbmFseXplci5nZXRCeXRlRnJlcXVlbmN5RGF0YShmcmVxRGF0YSk7XG5cbiAgICAgICAgdmFyIG51bUJhcnMgPSBfYXVkaW9BbmFseXplci5mcmVxdWVuY3lCaW5Db3VudDtcbiAgICAgICAgdmFyIGJhcldpZHRoID0gTWF0aC5mbG9vcihfY2FudmFzV2lkdGggLyBudW1CYXJzKSAtIF9mZnRCYXJTcGFjaW5nO1xuXG5cbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gXCJzb3VyY2Utb3ZlclwiO1xuXG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmNsZWFyUmVjdCgwLCAwLCBfY2FudmFzV2lkdGgsIF9jYW52YXNIZWlnaHQpO1xuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5maWxsU3R5bGUgPSAnI2Y2ZDU2NSc7XG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmxpbmVDYXAgPSAncm91bmQnO1xuXG4gICAgICAgIHZhciB4LCB5LCB3LCBoO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbnVtQmFyczsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBmcmVxRGF0YVtpXTtcbiAgICAgICAgICAgIHZhciBzY2FsZWRfdmFsdWUgPSAodmFsdWUgLyAyNTYpICogX2NhbnZhc0hlaWdodDtcblxuICAgICAgICAgICAgeCA9IGkgKiAoYmFyV2lkdGggKyBfZmZ0QmFyU3BhY2luZyk7XG4gICAgICAgICAgICB5ID0gX2NhbnZhc0hlaWdodCAtIHNjYWxlZF92YWx1ZTtcbiAgICAgICAgICAgIHcgPSBiYXJXaWR0aDtcbiAgICAgICAgICAgIGggPSBzY2FsZWRfdmFsdWU7XG5cbiAgICAgICAgICAgIHZhciBncmFkaWVudCA9IF9hdWRpb1NwZWN0cnVtQ2FudmFzLmNyZWF0ZUxpbmVhckdyYWRpZW50KHgsIF9jYW52YXNIZWlnaHQsIHgsIHkpO1xuICAgICAgICAgICAgZ3JhZGllbnQuYWRkQ29sb3JTdG9wKDEuMCwgXCJyZ2JhKDAsMCwwLDEuMClcIik7XG4gICAgICAgICAgICBncmFkaWVudC5hZGRDb2xvclN0b3AoMC4wLCBcInJnYmEoMCwwLDAsMS4wKVwiKTtcblxuICAgICAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFN0eWxlID0gZ3JhZGllbnQ7XG4gICAgICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5maWxsUmVjdCh4LCB5LCB3LCBoKTtcblxuICAgICAgICAgICAgaWYgKHNjYWxlZF92YWx1ZSA+IF9oaXRIZWlnaHRzW2ldKSB7XG4gICAgICAgICAgICAgICAgX2hpdFZlbG9jaXRpZXNbaV0gKz0gKHNjYWxlZF92YWx1ZSAtIF9oaXRIZWlnaHRzW2ldKSAqIDY7XG4gICAgICAgICAgICAgICAgX2hpdEhlaWdodHNbaV0gPSBzY2FsZWRfdmFsdWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIF9oaXRWZWxvY2l0aWVzW2ldIC09IDQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIF9oaXRIZWlnaHRzW2ldICs9IF9oaXRWZWxvY2l0aWVzW2ldICogMC4wMTY7XG5cbiAgICAgICAgICAgIGlmIChfaGl0SGVpZ2h0c1tpXSA8IDApXG4gICAgICAgICAgICAgICAgX2hpdEhlaWdodHNbaV0gPSAwO1xuICAgICAgICB9XG5cbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gXCJzb3VyY2UtYXRvcFwiO1xuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5kcmF3SW1hZ2UoX2NhbnZhc0JnLCAwLCAwKTtcblxuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSBcInNvdXJjZS1vdmVyXCI7XG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxTdHlsZSA9IFwicmdiYSgyNTUsMjU1LDI1NSwwLjcpXCI7XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG51bUJhcnM7IGkrKykge1xuICAgICAgICAgICAgeCA9IGkgKiAoYmFyV2lkdGggKyBfZmZ0QmFyU3BhY2luZyk7XG4gICAgICAgICAgICB5ID0gX2NhbnZhc0hlaWdodCAtIE1hdGgucm91bmQoX2hpdEhlaWdodHNbaV0pIC0gMjtcbiAgICAgICAgICAgIHcgPSBiYXJXaWR0aDtcbiAgICAgICAgICAgIGggPSBiYXJXaWR0aDtcblxuICAgICAgICAgICAgaWYgKF9oaXRIZWlnaHRzW2ldID09PSAwKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICAvL19hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxTdHlsZSA9IFwicmdiYSgyNTUsIDI1NSwgMjU1LFwiKyBNYXRoLm1heCgwLCAxIC0gTWF0aC5hYnMoX2hpdFZlbG9jaXRpZXNbaV0vMTUwKSkgKyBcIilcIjtcbiAgICAgICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxSZWN0KHgsIHksIHcsIGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgX2F1ZGlvQ2FudmFzQW5pbWF0aW9uSWQgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHVwZGF0ZUFuYWx5emVyKTtcbiAgICB9XG5cbiAgICB2YXIgX2NhbnZhc1dpZHRoLCBfY2FudmFzSGVpZ2h0O1xuICAgIHZhciBfZmZ0U2l6ZSA9IDI1NjtcbiAgICB2YXIgX2ZmdFNtb290aGluZyA9IDAuODtcbiAgICB2YXIgX2ZmdEJhclNwYWNpbmcgPSAxO1xuXG4gICAgdmFyIF9oaXRIZWlnaHRzID0gW107XG4gICAgdmFyIF9oaXRWZWxvY2l0aWVzID0gW107XG5cbiAgICB0aGlzLnRlc3RDYW52YXMgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgdmFyIGNhbnZhc0NvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicmVjb3JkaW5nLXZpc3VhbGl6ZXJcIik7XG5cbiAgICAgICAgX2NhbnZhc1dpZHRoID0gY2FudmFzQ29udGFpbmVyLndpZHRoO1xuICAgICAgICBfY2FudmFzSGVpZ2h0ID0gY2FudmFzQ29udGFpbmVyLmhlaWdodDtcblxuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcyA9IGNhbnZhc0NvbnRhaW5lci5nZXRDb250ZXh0KFwiMmRcIik7XG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiA9IFwic291cmNlLW92ZXJcIjtcbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFN0eWxlID0gXCJyZ2JhKDAsMCwwLDApXCI7XG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxSZWN0KDAsIDAsIF9jYW52YXNXaWR0aCwgX2NhbnZhc0hlaWdodCk7XG5cbiAgICAgICAgdmFyIG51bUJhcnMgPSBfZmZ0U2l6ZSAvIDI7XG4gICAgICAgIHZhciBiYXJTcGFjaW5nID0gX2ZmdEJhclNwYWNpbmc7XG4gICAgICAgIHZhciBiYXJXaWR0aCA9IE1hdGguZmxvb3IoX2NhbnZhc1dpZHRoIC8gbnVtQmFycykgLSBiYXJTcGFjaW5nO1xuXG4gICAgICAgIHZhciB4LCB5LCB3LCBoLCBpO1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBudW1CYXJzOyBpKyspIHtcbiAgICAgICAgICAgIF9oaXRIZWlnaHRzW2ldID0gX2NhbnZhc0hlaWdodCAtIDE7XG4gICAgICAgICAgICBfaGl0VmVsb2NpdGllc1tpXSA9IDA7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbnVtQmFyczsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgc2NhbGVkX3ZhbHVlID0gTWF0aC5hYnMoTWF0aC5zaW4oTWF0aC5QSSAqIDYgKiAoaSAvIG51bUJhcnMpKSkgKiBfY2FudmFzSGVpZ2h0O1xuXG4gICAgICAgICAgICB4ID0gaSAqIChiYXJXaWR0aCArIGJhclNwYWNpbmcpO1xuICAgICAgICAgICAgeSA9IF9jYW52YXNIZWlnaHQgLSBzY2FsZWRfdmFsdWU7XG4gICAgICAgICAgICB3ID0gYmFyV2lkdGg7XG4gICAgICAgICAgICBoID0gc2NhbGVkX3ZhbHVlO1xuXG4gICAgICAgICAgICB2YXIgZ3JhZGllbnQgPSBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5jcmVhdGVMaW5lYXJHcmFkaWVudCh4LCBfY2FudmFzSGVpZ2h0LCB4LCB5KTtcbiAgICAgICAgICAgIGdyYWRpZW50LmFkZENvbG9yU3RvcCgxLjAsIFwicmdiYSgwLDAsMCwwLjApXCIpO1xuICAgICAgICAgICAgZ3JhZGllbnQuYWRkQ29sb3JTdG9wKDAuMCwgXCJyZ2JhKDAsMCwwLDEuMClcIik7XG5cbiAgICAgICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxTdHlsZSA9IGdyYWRpZW50O1xuICAgICAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFJlY3QoeCwgeSwgdywgaCk7XG4gICAgICAgIH1cblxuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSBcInNvdXJjZS1hdG9wXCI7XG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmRyYXdJbWFnZShfY2FudmFzQmcsIDAsIDApO1xuXG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiA9IFwic291cmNlLW92ZXJcIjtcbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFN0eWxlID0gXCIjZmZmZmZmXCI7XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG51bUJhcnM7IGkrKykge1xuICAgICAgICAgICAgeCA9IGkgKiAoYmFyV2lkdGggKyBiYXJTcGFjaW5nKTtcbiAgICAgICAgICAgIHkgPSBfY2FudmFzSGVpZ2h0IC0gX2hpdEhlaWdodHNbaV07XG4gICAgICAgICAgICB3ID0gYmFyV2lkdGg7XG4gICAgICAgICAgICBoID0gMjtcblxuICAgICAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFJlY3QoeCwgeSwgdywgaCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIF9zY29wZSA9IHRoaXM7XG5cbiAgICB2YXIgX2NhbnZhc0JnID0gbmV3IEltYWdlKCk7XG4gICAgX2NhbnZhc0JnLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgX3Njb3BlLnRlc3RDYW52YXMoKTtcbiAgICB9O1xuICAgIC8vX2NhbnZhc0JnLnNyYyA9IFwiL2ltZy9iZzVzLmpwZ1wiO1xuICAgIF9jYW52YXNCZy5zcmMgPSBcIi9pbWcvYmc2LXdpZGUuanBnXCI7XG59XG4qL1xuXG5leHBvcnQgeyBBdWRpb0NhcHR1cmUgfVxuIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSdcblxuY2xhc3MgQXVkaW9QbGF5ZXJFdmVudHMgZXh0ZW5kcyBCYWNrYm9uZS5Nb2RlbCB7XG4gICAgcGF1c2UoKSB7XG4gICAgICAgIHRoaXMudHJpZ2dlcihcInBhdXNlXCIpO1xuICAgIH1cbn1cblxuZXhwb3J0IGxldCBBdWRpb1BsYXllciA9IG5ldyBBdWRpb1BsYXllckV2ZW50cygpO1xuXG5jbGFzcyBBdWRpb1BsYXllclZpZXcgZXh0ZW5kcyBCYWNrYm9uZS5WaWV3IHtcbiAgICBkZWZhdWx0cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGF1ZGlvUGxheWVyOiBudWxsLFxuICAgICAgICAgICAgcXVpcE1vZGVsOiBudWxsXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkF1ZGlvUGxheWVyVmlldyBpbml0aWFsaXplZFwiKTtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYXVkaW8tcGxheWVyXCIpO1xuICAgICAgICBBdWRpb1BsYXllci5vbihcInRvZ2dsZVwiLCAocXVpcCkgPT4gdGhpcy5vblRvZ2dsZShxdWlwKSwgdGhpcyk7XG4gICAgICAgIEF1ZGlvUGxheWVyLm9uKFwicGF1c2VcIiwgKHF1aXApID0+IHRoaXMucGF1c2UocXVpcCksIHRoaXMpO1xuICAgIH1cblxuICAgIGNsb3NlKCkge1xuICAgICAgICB0aGlzLnN0b3BQZXJpb2RpY1RpbWVyKCk7XG4gICAgfVxuXG4gICAgc3RhcnRQZXJpb2RpY1RpbWVyKCkge1xuICAgICAgICBpZih0aGlzLnBlcmlvZGljVGltZXIgPT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5wZXJpb2RpY1RpbWVyID0gc2V0SW50ZXJ2YWwoKCkgPT4gdGhpcy5jaGVja1Byb2dyZXNzKCksIDEwMCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzdG9wUGVyaW9kaWNUaW1lcigpIHtcbiAgICAgICAgaWYodGhpcy5wZXJpb2RpY1RpbWVyICE9IG51bGwpIHtcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5wZXJpb2RpY1RpbWVyKTtcbiAgICAgICAgICAgIHRoaXMucGVyaW9kaWNUaW1lciA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjaGVja1Byb2dyZXNzKCkge1xuICAgICAgICBpZih0aGlzLnF1aXBNb2RlbCA9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcHJvZ3Jlc3NVcGRhdGUgPSB7XG4gICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5hdWRpb1BsYXllci5jdXJyZW50VGltZSwgLy8gc2VjXG4gICAgICAgICAgICBkdXJhdGlvbjogdGhpcy5hdWRpb1BsYXllci5kdXJhdGlvbiwgLy8gc2VjXG4gICAgICAgICAgICBwcm9ncmVzczogMTAwICogdGhpcy5hdWRpb1BsYXllci5jdXJyZW50VGltZSAvIHRoaXMuYXVkaW9QbGF5ZXIuZHVyYXRpb24gLy8gJVxuICAgICAgICB9XG5cbiAgICAgICAgQXVkaW9QbGF5ZXIudHJpZ2dlcihcIi9cIiArIHRoaXMucXVpcE1vZGVsLmlkICsgXCIvcHJvZ3Jlc3NcIiwgcHJvZ3Jlc3NVcGRhdGUpO1xuICAgIH1cblxuICAgIG9uVG9nZ2xlKHF1aXBNb2RlbCkge1xuICAgICAgICB0aGlzLnF1aXBNb2RlbCA9IHF1aXBNb2RlbDtcblxuICAgICAgICBpZighdGhpcy50cmFja0lzTG9hZGVkKHF1aXBNb2RlbC51cmwpKSB7XG4gICAgICAgICAgICB0aGlzLmxvYWRUcmFjayhxdWlwTW9kZWwudXJsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKCF0aGlzLnRyYWNrSXNMb2FkZWQocXVpcE1vZGVsLnVybCkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHRoaXMuYXVkaW9QbGF5ZXIucGF1c2VkKSB7XG4gICAgICAgICAgICB0aGlzLnBsYXkocXVpcE1vZGVsKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMucGF1c2UocXVpcE1vZGVsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHBsYXkocXVpcE1vZGVsKSB7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuY3VycmVudFRpbWUgPSBNYXRoLmZsb29yKHF1aXBNb2RlbC5wb3NpdGlvbik7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIucGxheSgpO1xuXG4gICAgICAgIEF1ZGlvUGxheWVyLnRyaWdnZXIoXCIvXCIgKyBxdWlwTW9kZWwuaWQgKyBcIi9wbGF5aW5nXCIpO1xuICAgICAgICB0aGlzLnN0YXJ0UGVyaW9kaWNUaW1lcigpO1xuICAgIH1cblxuICAgIHBhdXNlKHF1aXBNb2RlbCkge1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnBhdXNlKCk7XG4gICAgICAgIGlmKHF1aXBNb2RlbCAhPSBudWxsKSB7XG4gICAgICAgICAgICBBdWRpb1BsYXllci50cmlnZ2VyKFwiL1wiICsgcXVpcE1vZGVsLmlkICsgXCIvcGF1c2VkXCIpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc3RvcFBlcmlvZGljVGltZXIoKTtcbiAgICB9XG5cbiAgICB0cmFja0lzTG9hZGVkKHVybCkge1xuICAgICAgICByZXR1cm4gfnRoaXMuYXVkaW9QbGF5ZXIuc3JjLmluZGV4T2YodXJsKTtcbiAgICB9XG5cbiAgICBsb2FkVHJhY2sodXJsKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiTG9hZGluZyBhdWRpbzogXCIgKyB1cmwpO1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IHVybDtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5sb2FkKCk7XG4gICAgfVxufVxuXG5jbGFzcyBTb3VuZFBsYXllciB7XG4gICAgc3RhdGljIGNyZWF0ZSAobW9kZWwpIHtcbiAgICAgICAgdmFyIHJlc3VtZVBvc2l0aW9uID0gcGFyc2VJbnQobW9kZWwuZ2V0KCdwb3NpdGlvbicpIHx8IDApO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQ3JlYXRpbmcgc291bmQgcGxheWVyIGZvciBtb2RlbDpcIiwgbW9kZWwpO1xuXG4gICAgICAgIHJldHVybiBzb3VuZE1hbmFnZXIuY3JlYXRlU291bmQoe1xuICAgICAgICAgICAgaWQ6IG1vZGVsLmlkLFxuICAgICAgICAgICAgdXJsOiBtb2RlbC51cmwsXG4gICAgICAgICAgICB2b2x1bWU6IDEwMCxcbiAgICAgICAgICAgIGF1dG9Mb2FkOiB0cnVlLFxuICAgICAgICAgICAgYXV0b1BsYXk6IGZhbHNlLFxuICAgICAgICAgICAgZnJvbTogcmVzdW1lUG9zaXRpb24sXG4gICAgICAgICAgICB3aGlsZWxvYWRpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImxvYWRlZDogXCIgKyB0aGlzLmJ5dGVzTG9hZGVkICsgXCIgb2YgXCIgKyB0aGlzLmJ5dGVzVG90YWwpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9ubG9hZDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTb3VuZDsgYXVkaW8gbG9hZGVkOyBwb3NpdGlvbiA9ICcgKyByZXN1bWVQb3NpdGlvbiArICcsIGR1cmF0aW9uID0gJyArIHRoaXMuZHVyYXRpb24pO1xuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZHVyYXRpb24gPT0gbnVsbCB8fCB0aGlzLmR1cmF0aW9uID09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJkdXJhdGlvbiBpcyBudWxsXCIpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKChyZXN1bWVQb3NpdGlvbiArIDEwKSA+IHRoaXMuZHVyYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhlIHRyYWNrIGlzIHByZXR0eSBtdWNoIGNvbXBsZXRlLCBsb29wIGl0XG4gICAgICAgICAgICAgICAgICAgIC8vIEZJWE1FOiB0aGlzIHNob3VsZCBhY3R1YWxseSBoYXBwZW4gZWFybGllciwgd2Ugc2hvdWxkIGtub3cgdGhhdCB0aGUgYWN0aW9uIHdpbGwgY2F1c2UgYSByZXdpbmRcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgIGFuZCBpbmRpY2F0ZSB0aGUgcmV3aW5kIHZpc3VhbGx5IHNvIHRoZXJlIGlzIG5vIHN1cnByaXNlXG4gICAgICAgICAgICAgICAgICAgIHJlc3VtZVBvc2l0aW9uID0gMDtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1NvdW5kOyB0cmFjayBuZWVkZWQgYSByZXdpbmQnKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBGSVhNRTogcmVzdW1lIGNvbXBhdGliaWxpdHkgd2l0aCB2YXJpb3VzIGJyb3dzZXJzXG4gICAgICAgICAgICAgICAgLy8gRklYTUU6IHNvbWV0aW1lcyB5b3UgcmVzdW1lIGEgZmlsZSBhbGwgdGhlIHdheSBhdCB0aGUgZW5kLCBzaG91bGQgbG9vcCB0aGVtIGFyb3VuZFxuICAgICAgICAgICAgICAgIHRoaXMuc2V0UG9zaXRpb24ocmVzdW1lUG9zaXRpb24pO1xuICAgICAgICAgICAgICAgIHRoaXMucGxheSgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHdoaWxlcGxheWluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBwcm9ncmVzcyA9ICh0aGlzLmR1cmF0aW9uID4gMCA/IDEwMCAqIHRoaXMucG9zaXRpb24gLyB0aGlzLmR1cmF0aW9uIDogMCkudG9GaXhlZCgwKSArICclJztcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcInF1aXA6XCIgKyB0aGlzLmlkICsgXCI6cHJvZ3Jlc3NcIiwgcHJvZ3Jlc3MpO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicXVpcDpcIiArIHRoaXMuaWQgKyBcIjpwb3NpdGlvblwiLCB0aGlzLnBvc2l0aW9uLnRvRml4ZWQoMCkpO1xuICAgICAgICAgICAgICAgIG1vZGVsLnNldCh7J3Byb2dyZXNzJzogcHJvZ3Jlc3N9KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbnBhdXNlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJTb3VuZDsgcGF1c2VkOiBcIiArIHRoaXMuaWQpO1xuICAgICAgICAgICAgICAgIHZhciBwb3NpdGlvbiA9IHRoaXMucG9zaXRpb24gPyB0aGlzLnBvc2l0aW9uLnRvRml4ZWQoMCkgOiAwO1xuICAgICAgICAgICAgICAgIHZhciBwcm9ncmVzcyA9ICh0aGlzLmR1cmF0aW9uID4gMCA/IDEwMCAqIHBvc2l0aW9uIC8gdGhpcy5kdXJhdGlvbiA6IDApLnRvRml4ZWQoMCkgKyAnJSc7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJxdWlwOlwiICsgdGhpcy5pZCArIFwiOnByb2dyZXNzXCIsIHByb2dyZXNzKTtcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcInF1aXA6XCIgKyB0aGlzLmlkICsgXCI6cG9zaXRpb25cIiwgcG9zaXRpb24pO1xuICAgICAgICAgICAgICAgIG1vZGVsLnNldCh7J3Byb2dyZXNzJzogcHJvZ3Jlc3N9KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbmZpbmlzaDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiU291bmQ7IGZpbmlzaGVkIHBsYXlpbmc6IFwiICsgdGhpcy5pZCk7XG5cbiAgICAgICAgICAgICAgICAvLyBzdG9yZSBjb21wbGV0aW9uIGluIGJyb3dzZXJcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcInF1aXA6XCIgKyB0aGlzLmlkICsgXCI6cHJvZ3Jlc3NcIiwgJzEwMCUnKTtcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcInF1aXA6XCIgKyB0aGlzLmlkICsgXCI6cG9zaXRpb25cIiwgdGhpcy5kdXJhdGlvbi50b0ZpeGVkKDApKTtcbiAgICAgICAgICAgICAgICBtb2RlbC5zZXQoeydwcm9ncmVzcyc6ICcxMDAlJ30pO1xuXG4gICAgICAgICAgICAgICAgLy8gVE9ETzogdW5sb2NrIHNvbWUgc29ydCBvZiBhY2hpZXZlbWVudCBmb3IgZmluaXNoaW5nIHRoaXMgdHJhY2ssIG1hcmsgaXQgYSBkaWZmIGNvbG9yLCBldGNcbiAgICAgICAgICAgICAgICAvLyBUT0RPOiB0aGlzIGlzIGEgZ29vZCBwbGFjZSB0byBmaXJlIGEgaG9vayB0byBhIHBsYXliYWNrIG1hbmFnZXIgdG8gbW92ZSBvbnRvIHRoZSBuZXh0IGF1ZGlvIGNsaXBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9XG59XG5cbmV4cG9ydCB7IFNvdW5kUGxheWVyLCBBdWRpb1BsYXllclZpZXcsIEF1ZGlvUGxheWVyRXZlbnRzIH07XG4iLCJpbXBvcnQgQmFja2JvbmUgZnJvbSAnYmFja2JvbmUnXG5pbXBvcnQgeyBRdWlwVmlldywgfSBmcm9tICcuL3F1aXAtY29udHJvbC5qcydcbmltcG9ydCB7IEF1ZGlvUGxheWVyLCBBdWRpb1BsYXllclZpZXcgfSBmcm9tICcuL2F1ZGlvLXBsYXllcidcbmltcG9ydCB7IFF1aXBNb2RlbCwgTXlRdWlwQ29sbGVjdGlvbiB9IGZyb20gJy4vbW9kZWxzL1F1aXAnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEhvbWVwYWdlVmlldyBleHRlbmRzIEJhY2tib25lLlZpZXcge1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIG5ldyBNeVF1aXBDb2xsZWN0aW9uKCkuZmV0Y2goKS50aGVuKHF1aXBzID0+IHRoaXMub25RdWlwc0xvYWRlZChxdWlwcykpXG4gICAgfVxuXG4gICAgc2h1dGRvd24oKSB7XG4gICAgICAgIGlmICh0aGlzLnF1aXBWaWV3cyAhPSBudWxsKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBxdWlwIG9mIHRoaXMucXVpcFZpZXdzKSB7XG4gICAgICAgICAgICAgICAgcXVpcC5zaHV0ZG93bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgQXVkaW9QbGF5ZXIudHJpZ2dlcihcInBhdXNlXCIpO1xuICAgIH1cblxuICAgIG9uUXVpcHNMb2FkZWQocXVpcHMpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJsb2FkZWQgcXVpcHNcIiwgcXVpcHMpO1xuXG4gICAgICAgIHRoaXMucXVpcFZpZXdzID0gW107XG5cbiAgICAgICAgZm9yICh2YXIgcXVpcCBvZiBxdWlwcykge1xuICAgICAgICAgICAgdmFyIHF1aXBWaWV3ID0gbmV3IFF1aXBWaWV3KHttb2RlbDogbmV3IFF1aXBNb2RlbChxdWlwKX0pO1xuICAgICAgICAgICAgdGhpcy5xdWlwVmlld3MucHVzaChxdWlwVmlldyk7XG4gICAgICAgICAgICB0aGlzLiRlbC5hcHBlbmQocXVpcFZpZXcuZWwpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuXG5jbGFzcyBDdXJyZW50VXNlck1vZGVsIGV4dGVuZHMgQmFja2JvbmUuTW9kZWwge1xuICAgIGRlZmF1bHRzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdXNlcm5hbWU6IFwiXCIsXG4gICAgICAgICAgICBwcm9maWxlSW1hZ2U6IFwiXCIsXG4gICAgICAgICAgICBjcmVhdGVkQXQ6IFwiXCIsXG4gICAgICAgICAgICBpZDogXCJcIlxuICAgICAgICB9XG4gICAgfVxuXG4gICAgY29uc3RydWN0b3IocHJvcHMpIHtcbiAgICAgICAgc3VwZXIocHJvcHMpO1xuICAgICAgICB0aGlzLnVybCA9IFwiL2N1cnJlbnRfdXNlclwiO1xuICAgIH1cbn1cblxuZXhwb3J0IHsgQ3VycmVudFVzZXJNb2RlbCB9XG4iLCJpbXBvcnQgQmFja2JvbmUgZnJvbSAnYmFja2JvbmUnXG5cbmNsYXNzIExpc3RlblN0YXRlIGV4dGVuZHMgQmFja2JvbmUuTW9kZWwge1xuICAgIGRlZmF1bHRzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgYXVkaW9JZDogMCwgLy8gaWQgc3RyaW5nIG9mIHF1aXBcbiAgICAgICAgICAgIHByb2dyZXNzOiAwLCAvLyBbMC0xMDBdXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdHJ1Y3Rvcihwcm9wcykge1xuICAgICAgICBzdXBlcihwcm9wcyk7XG4gICAgICAgIHRoaXMudXJsUm9vdCA9ICcvbGlzdGVuJztcbiAgICB9XG59XG5cbmNsYXNzIExpc3RlblN0YXRlQ29sbGVjdGlvbiBleHRlbmRzIEJhY2tib25lLkNvbGxlY3Rpb24ge1xuICAgIGNvbnN0cnVjdG9yKG9wdHMpIHtcbiAgICAgICAgc3VwZXIob3B0cyk7XG4gICAgICAgIHRoaXMubW9kZWwgPSBMaXN0ZW5TdGF0ZTtcbiAgICAgICAgdGhpcy51cmwgPSBcIi9saXN0ZW5cIjtcbiAgICB9XG59XG5cbmV4cG9ydCB7IExpc3RlblN0YXRlLCBMaXN0ZW5TdGF0ZUNvbGxlY3Rpb24gfVxuIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSdcblxuY2xhc3MgUXVpcE1vZGVsIGV4dGVuZHMgQmFja2JvbmUuTW9kZWwge1xuICAgIGRlZmF1bHRzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaWQ6IDAsIC8vIGd1aWRcbiAgICAgICAgICAgIHByb2dyZXNzOiAwLCAvLyBbMC0xMDBdIHBlcmNlbnRhZ2VcbiAgICAgICAgICAgIHBvc2l0aW9uOiAwLCAvLyBzZWNvbmRzXG4gICAgICAgICAgICBkdXJhdGlvbjogMCwgLy8gc2Vjb25kc1xuICAgICAgICAgICAgaXNQdWJsaWM6IGZhbHNlXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdHJ1Y3RvcihvcHRzKSB7XG4gICAgICAgIHN1cGVyKG9wdHMpO1xuXG4gICAgICAgIHRoaXMudXJsUm9vdCA9IFwiL3F1aXBzXCI7XG5cbiAgICAgICAgLy8gc2F2ZSBsaXN0ZW5pbmcgcHJvZ3Jlc3MgYXQgbW9zdCBldmVyeSAzIHNlY29uZHNcbiAgICAgICAgdGhpcy50aHJvdHRsZWRTYXZlID0gXy50aHJvdHRsZSh0aGlzLnNhdmUsIDMwMDApO1xuICAgIH1cbn1cblxuY2xhc3MgTXlRdWlwQ29sbGVjdGlvbiBleHRlbmRzIEJhY2tib25lLkNvbGxlY3Rpb24ge1xuICAgIGNvbnN0cnVjdG9yKG9wdHMpIHtcbiAgICAgICAgc3VwZXIob3B0cyk7XG4gICAgICAgIHRoaXMubW9kZWwgPSBRdWlwTW9kZWw7XG4gICAgICAgIHRoaXMudXJsID0gXCIvcXVpcHNcIjtcbiAgICB9XG59XG5cbmV4cG9ydCB7IFF1aXBNb2RlbCwgTXlRdWlwQ29sbGVjdGlvbiB9XG4iLCJleHBvcnQgZGVmYXVsdCBjbGFzcyBQb2x5ZmlsbCB7XG4gICAgc3RhdGljIGluc3RhbGwoKSB7XG4gICAgICAgIHdpbmRvdy5BdWRpb0NvbnRleHQgPSB3aW5kb3cuQXVkaW9Db250ZXh0IHx8IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQgfHwgZmFsc2U7XG4gICAgICAgIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgPSBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhIHx8IG5hdmlnYXRvci53ZWJraXRHZXRVc2VyTWVkaWEgfHwgbmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYSB8fCBuYXZpZ2F0b3IubXNHZXRVc2VyTWVkaWEgfHwgZmFsc2U7XG5cbiAgICAgICAgaWYgKG5hdmlnYXRvci5tZWRpYURldmljZSA9PSBudWxsKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInBvbHlmaWxsaW5nIG1lZGlhRGV2aWNlLmdldFVzZXJNZWRpYVwiKTtcblxuICAgICAgICAgICAgbmF2aWdhdG9yLm1lZGlhRGV2aWNlID0ge1xuICAgICAgICAgICAgICAgIGdldFVzZXJNZWRpYTogKHByb3BzKSA9PiBuZXcgUHJvbWlzZSgoeSwgbikgPT4gbmF2aWdhdG9yLmdldFVzZXJNZWRpYShwcm9wcywgeSwgbikpXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW5hdmlnYXRvci5nZXRVc2VyTWVkaWEpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJBdWRpb0NhcHR1cmU6OnBvbHlmaWxsKCk7IGdldFVzZXJNZWRpYSgpIG5vdCBzdXBwb3J0ZWQuXCIpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxufVxuIiwiaW1wb3J0IHZhZ3VlVGltZSBmcm9tICd2YWd1ZS10aW1lJ1xuaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSdcbmltcG9ydCB7IEF1ZGlvUGxheWVyIH0gZnJvbSAnLi9hdWRpby1wbGF5ZXIuanMnXG5pbXBvcnQgeyBRdWlwTW9kZWwgfSBmcm9tICcuL21vZGVscy9RdWlwJ1xuXG5cbi8vY2xhc3MgQXVkaW9QbGF5ZXJFdmVudHMgZXh0ZW5kcyBCYWNrYm9uZS5FdmVudHMge1xuLy9cbi8vfVxuXG5jbGFzcyBRdWlwVmlldyBleHRlbmRzIEJhY2tib25lLlZpZXcge1xuICAgIGdldCBkZWZhdWx0cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHF1aXBJZDogMCxcbiAgICAgICAgICAgIGF1ZGlvUGxheWVyOiBudWxsXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZXQgZXZlbnRzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgXCJjbGljayAucXVpcC1hY3Rpb25zIC5sb2NrLWluZGljYXRvclwiOiBcInRvZ2dsZVB1YmxpY1wiLFxuICAgICAgICAgICAgXCJjbGljayAucXVpcC1wbGF5ZXJcIjogXCJ0b2dnbGVQbGF5YmFja1wiXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZXQgdGFnTmFtZSgpIHtcbiAgICAgICAgcmV0dXJuICdkaXYnO1xuICAgIH1cblxuICAgIG9uUGF1c2UoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUXVpcFZpZXc7IHBhdXNlZFwiKTtcblxuICAgICAgICAkKHRoaXMuZWwpXG4gICAgICAgICAgICAuZmluZCgnLmZhLXBhdXNlJylcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZmEtcGF1c2UnKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdmYS1wbGF5Jyk7XG4gICAgfVxuXG4gICAgb25QbGF5KCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlF1aXBWaWV3OyBwbGF5aW5nXCIpO1xuXG4gICAgICAgICQodGhpcy5lbClcbiAgICAgICAgICAgIC5maW5kKCcuZmEtcGxheScpXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2ZhLXBsYXknKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdmYS1wYXVzZScpO1xuICAgIH1cblxuICAgIG9uUHJvZ3Jlc3MocHJvZ3Jlc3NVcGRhdGUpIHtcbiAgICAgICAgdGhpcy5tb2RlbC5zZXQoeydwb3NpdGlvbic6IHByb2dyZXNzVXBkYXRlLnBvc2l0aW9ufSk7IC8vIHNlY1xuICAgICAgICB0aGlzLm1vZGVsLnNldCh7J2R1cmF0aW9uJzogcHJvZ3Jlc3NVcGRhdGUuZHVyYXRpb259KTsgLy8gc2VjXG4gICAgICAgIHRoaXMubW9kZWwuc2V0KHsncHJvZ3Jlc3MnOiBwcm9ncmVzc1VwZGF0ZS5wcm9ncmVzc30pOyAvLyAlXG4gICAgICAgIHRoaXMubW9kZWwudGhyb3R0bGVkU2F2ZSgpO1xuICAgIH1cblxuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHRoaXMudGVtcGxhdGUgPSBfLnRlbXBsYXRlKCQoJyNxdWlwLXRlbXBsYXRlJykuaHRtbCgpKTtcblxuICAgICAgICB2YXIgaWQgPSB0aGlzLm1vZGVsLmdldChcImlkXCIpO1xuXG4gICAgICAgIEF1ZGlvUGxheWVyLm9uKFwiL1wiICsgaWQgKyBcIi9wYXVzZWRcIiwgKCkgPT4gdGhpcy5vblBhdXNlKCksIHRoaXMpO1xuICAgICAgICBBdWRpb1BsYXllci5vbihcIi9cIiArIGlkICsgXCIvcGxheWluZ1wiLCAoKSA9PiB0aGlzLm9uUGxheSgpLCB0aGlzKTtcbiAgICAgICAgQXVkaW9QbGF5ZXIub24oXCIvXCIgKyBpZCArIFwiL3Byb2dyZXNzXCIsICh1cGRhdGUpID0+IHRoaXMub25Qcm9ncmVzcyh1cGRhdGUpLCB0aGlzKTtcblxuICAgICAgICB0aGlzLnJlbmRlcigpO1xuXG4gICAgICAgICQodGhpcy5lbCkuZmluZChcIi5wcm9ncmVzcy1iYXJcIikuY3NzKFwid2lkdGhcIiwgdGhpcy5tb2RlbC5nZXQoJ3Byb2dyZXNzJykgKyBcIiVcIik7XG5cbiAgICAgICAgLy8gdXBkYXRlIHZpc3VhbHMgdG8gaW5kaWNhdGUgcGxheWJhY2sgcHJvZ3Jlc3NcbiAgICAgICAgdGhpcy5tb2RlbC5vbignY2hhbmdlOnByb2dyZXNzJywgKG1vZGVsLCBwcm9ncmVzcykgPT4ge1xuICAgICAgICAgICAgJCh0aGlzLmVsKS5maW5kKFwiLnByb2dyZXNzLWJhclwiKS5jc3MoXCJ3aWR0aFwiLCBwcm9ncmVzcyArIFwiJVwiKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc2h1dGRvd24oKSB7XG4gICAgICAgIEF1ZGlvUGxheWVyLm9mZihudWxsLCBudWxsLCB0aGlzKTtcbiAgICAgICAgdGhpcy5tb2RlbC5vZmYoKTtcbiAgICB9XG5cbiAgICBsb2FkTW9kZWwoKSB7XG4gICAgICAgIHZhciBwcm9ncmVzcyA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwicXVpcDpcIiArIHRoaXMucXVpcElkICsgXCI6cHJvZ3Jlc3NcIik7XG4gICAgICAgIHZhciBwb3NpdGlvbiA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwicXVpcDpcIiArIHRoaXMucXVpcElkICsgXCI6cG9zaXRpb25cIik7XG5cbiAgICAgICAgdGhpcy5tb2RlbC5zZXQoe1xuICAgICAgICAgICAgJ2lkJzogdGhpcy5xdWlwSWQsXG4gICAgICAgICAgICAncHJvZ3Jlc3MnOiBwcm9ncmVzcyxcbiAgICAgICAgICAgICdwb3NpdGlvbic6IHBvc2l0aW9uLFxuICAgICAgICAgICAgJ2lzUHVibGljJzogdGhpcy4kZWwuZGF0YShcImlzUHVibGljXCIpID09ICdUcnVlJyxcbiAgICAgICAgICAgICdpc01pbmUnOiB0aGlzLiRlbC5kYXRhKFwiaXNNaW5lXCIpID09ICdUcnVlJ1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICB0b2dnbGVQdWJsaWMoZXYpIHtcbiAgICAgICAgdmFyIG5ld1N0YXRlID0gIXRoaXMubW9kZWwuZ2V0KCdpc1B1YmxpYycpO1xuICAgICAgICB0aGlzLm1vZGVsLnNldCh7J2lzUHVibGljJzogbmV3U3RhdGV9KTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcInRvZ2dsaW5nIG5ldyBwdWJsaXNoZWQgc3RhdGU6IFwiICsgbmV3U3RhdGUpO1xuXG4gICAgICAgIHRoaXMubW9kZWwuc2F2ZSgpO1xuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB0b2dnbGVQbGF5YmFjayhldmVudCkge1xuICAgICAgICBBdWRpb1BsYXllci50cmlnZ2VyKFwidG9nZ2xlXCIsIHRoaXMubW9kZWwuYXR0cmlidXRlcyk7XG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuICAgICAgICB2YXIgdmlld01vZGVsID0gdGhpcy5tb2RlbC50b0pTT04oKTtcbiAgICAgICAgdmlld01vZGVsLnZhZ3VlVGltZSA9IHZhZ3VlVGltZS5nZXQoe2Zyb206IG5ldyBEYXRlKCksIHRvOiBuZXcgRGF0ZSh0aGlzLm1vZGVsLmdldChcInRpbWVzdGFtcFwiKSl9KTtcblxuICAgICAgICB0aGlzLiRlbC5odG1sKHRoaXMudGVtcGxhdGUodmlld01vZGVsKSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cblxuY2xhc3MgUXVpcExpc3QgZXh0ZW5kcyBCYWNrYm9uZS5Db2xsZWN0aW9uIHtcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG4gICAgICAgIHN1cGVyKG9wdGlvbnMpO1xuICAgICAgICB0aGlzLm1vZGVsID0gUXVpcE1vZGVsO1xuICAgIH1cbn1cblxudmFyIFF1aXBzID0gbmV3IFF1aXBMaXN0KCk7XG5cbmV4cG9ydCB7IFF1aXBNb2RlbCwgUXVpcFZpZXcsIFF1aXBMaXN0LCBRdWlwcyB9O1xuIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSdcbmltcG9ydCB7IFF1aXBNb2RlbCwgUXVpcFZpZXcsIFF1aXBzIH0gZnJvbSAnLi9xdWlwLWNvbnRyb2wuanMnXG5pbXBvcnQgeyBBdWRpb0NhcHR1cmUgfSBmcm9tICcuL2F1ZGlvLWNhcHR1cmUnXG5pbXBvcnQgeyBBdWRpb1BsYXllclZpZXcgfSBmcm9tICcuL2F1ZGlvLXBsYXllcidcblxuZXhwb3J0IGNsYXNzIFJlY29yZGVyIGV4dGVuZHMgQmFja2JvbmUuTW9kZWwge1xuICAgIGRlZmF1bHRzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVjb3JkaW5nVGltZTogMFxuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgUmVjb3JkZXJWaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlldyB7XG4gICAgLy8gICAgZWw6ICcubS1yZWNvcmRpbmctY29udGFpbmVyJyxcblxuICAgIEludFRvVGltZSh2YWx1ZSkge1xuICAgICAgICB2YXIgbWludXRlcyA9IE1hdGguZmxvb3IodmFsdWUgLyA2MCk7XG4gICAgICAgIHZhciBzZWNvbmRzID0gTWF0aC5yb3VuZCh2YWx1ZSAtIG1pbnV0ZXMgKiA2MCk7XG5cbiAgICAgICAgcmV0dXJuIChcIjAwXCIgKyBtaW51dGVzKS5zdWJzdHIoLTIpICsgXCI6XCIgKyAoXCIwMFwiICsgc2Vjb25kcykuc3Vic3RyKC0yKTtcbiAgICB9XG5cbiAgICBkZWZhdWx0cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGF1ZGlvQ2FwdHVyZTogbnVsbCxcbiAgICAgICAgICAgIGF1ZGlvQmxvYjogbnVsbCxcbiAgICAgICAgICAgIGF1ZGlvQmxvYlVybDogbnVsbCxcbiAgICAgICAgICAgIGF1ZGlvUGxheWVyOiBudWxsLFxuICAgICAgICAgICAgaXNSZWNvcmRpbmc6IGZhbHNlLFxuICAgICAgICAgICAgdGltZXJJZDogMCxcbiAgICAgICAgICAgIHRpbWVyU3RhcnQ6IDNcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGV2ZW50cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIFwiY2xpY2sgLnJlY29yZGluZy10b2dnbGVcIjogXCJ0b2dnbGVcIixcbiAgICAgICAgICAgIFwiY2xpY2sgI2NhbmNlbC1yZWNvcmRpbmdcIjogXCJjYW5jZWxSZWNvcmRpbmdcIixcbiAgICAgICAgICAgIFwiY2xpY2sgI3VwbG9hZC1yZWNvcmRpbmdcIjogXCJ1cGxvYWRSZWNvcmRpbmdcIixcbiAgICAgICAgICAgIFwiY2xpY2sgI2hlbHBlci1idG5cIjogXCJwbGF5UHJldmlld1wiXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZW5kZXIoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwicmVuZGVyaW5nIHJlY29yZGVyIGNvbnRyb2xcIik7XG4gICAgICAgIHRoaXMudGVtcGxhdGUgPSBfLnRlbXBsYXRlKCQoJyNxdWlwLXJlY29yZGVyLXRlbXBsYXRlJykuaHRtbCgpKTtcbiAgICAgICAgdGhpcy4kZWwuaHRtbCh0aGlzLnRlbXBsYXRlKHRoaXMubW9kZWwudG9KU09OKCkpKTtcbiAgICB9XG5cbiAgICBpbml0aWFsaXplKG9wdGlvbnMpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJSZWNvcmRlclZpZXcgaW5pdFwiKTtcbiAgICAgICAgdGhpcy5hdWRpb0NhcHR1cmUgPSBuZXcgQXVkaW9DYXB0dXJlKCk7XG5cbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcblxuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZWNvcmRlZC1wcmV2aWV3XCIpO1xuICAgICAgICBpZiAodGhpcy5hdWRpb1BsYXllciA9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zb2xlLmxvZyhcImNhbiBwbGF5IHZvcmJpczogXCIsICEhdGhpcy5hdWRpb1BsYXllci5jYW5QbGF5VHlwZSAmJiBcIlwiICE9IHRoaXMuYXVkaW9QbGF5ZXIuY2FuUGxheVR5cGUoJ2F1ZGlvL29nZzsgY29kZWNzPVwidm9yYmlzXCInKSk7XG5cbiAgICAgICAgLy90aGlzLmF1ZGlvUGxheWVyLmxvb3AgPSBcImxvb3BcIjtcbiAgICAgICAgLy90aGlzLmF1ZGlvUGxheWVyLmF1dG9wbGF5ID0gXCJhdXRvcGxheVwiO1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IFwiL2Fzc2V0cy9zb3VuZHMvYmVlcF9zaG9ydF9vbi5vZ2dcIjtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5wbGF5KCk7XG5cbiAgICAgICAgdGhpcy5tb2RlbC5vbignY2hhbmdlOnJlY29yZGluZ1RpbWUnLCBmdW5jdGlvbiAobW9kZWwsIHRpbWUpIHtcbiAgICAgICAgICAgICQoXCIucmVjb3JkaW5nLXRpbWVcIikudGV4dCh0aW1lKTtcbiAgICAgICAgfSlcblxuICAgICAgICAvLyBhdHRlbXB0IHRvIGZldGNoIG1lZGlhLXN0cmVhbSBvbiBwYWdlLWxvYWRcbiAgICAgICAgdGhpcy5hdWRpb0NhcHR1cmUucHJlbG9hZE1lZGlhU3RyZWFtKCk7XG5cblxuICAgICAgICAvLyBUT0RPOiBhIHByZXR0eSBhZHZhbmNlZCBidXQgbmVhdCBmZWF0dXJlIG1heSBiZSB0byBzdG9yZSBhIGJhY2t1cCBjb3B5IG9mIGEgcmVjb3JkaW5nIGxvY2FsbHkgaW4gY2FzZSBvZiBhIGNyYXNoIG9yIHVzZXItZXJyb3JcbiAgICAgICAgLypcbiAgICAgICAgIC8vIGNoZWNrIGhvdyBtdWNoIHRlbXBvcmFyeSBzdG9yYWdlIHNwYWNlIHdlIGhhdmUuIGl0J3MgYSBnb29kIHdheSB0byBzYXZlIHJlY29yZGluZyB3aXRob3V0IGxvc2luZyBpdFxuICAgICAgICAgd2luZG93LndlYmtpdFN0b3JhZ2VJbmZvLnF1ZXJ5VXNhZ2VBbmRRdW90YShcbiAgICAgICAgIHdlYmtpdFN0b3JhZ2VJbmZvLlRFTVBPUkFSWSxcbiAgICAgICAgIGZ1bmN0aW9uKHVzZWQsIHJlbWFpbmluZykge1xuICAgICAgICAgdmFyIHJtYiA9IChyZW1haW5pbmcgLyAxMDI0IC8gMTAyNCkudG9GaXhlZCg0KTtcbiAgICAgICAgIHZhciB1bWIgPSAodXNlZCAvIDEwMjQgLyAxMDI0KS50b0ZpeGVkKDQpO1xuICAgICAgICAgY29uc29sZS5sb2coXCJVc2VkIHF1b3RhOiBcIiArIHVtYiArIFwibWIsIHJlbWFpbmluZyBxdW90YTogXCIgKyBybWIgKyBcIm1iXCIpO1xuICAgICAgICAgfSwgZnVuY3Rpb24oZSkge1xuICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yJywgZSk7XG4gICAgICAgICB9XG4gICAgICAgICApO1xuXG4gICAgICAgICBmdW5jdGlvbiBvbkVycm9ySW5GUygpIHtcbiAgICAgICAgIHZhciBtc2cgPSAnJztcblxuICAgICAgICAgc3dpdGNoIChlLmNvZGUpIHtcbiAgICAgICAgIGNhc2UgRmlsZUVycm9yLlFVT1RBX0VYQ0VFREVEX0VSUjpcbiAgICAgICAgIG1zZyA9ICdRVU9UQV9FWENFRURFRF9FUlInO1xuICAgICAgICAgYnJlYWs7XG4gICAgICAgICBjYXNlIEZpbGVFcnJvci5OT1RfRk9VTkRfRVJSOlxuICAgICAgICAgbXNnID0gJ05PVF9GT1VORF9FUlInO1xuICAgICAgICAgYnJlYWs7XG4gICAgICAgICBjYXNlIEZpbGVFcnJvci5TRUNVUklUWV9FUlI6XG4gICAgICAgICBtc2cgPSAnU0VDVVJJVFlfRVJSJztcbiAgICAgICAgIGJyZWFrO1xuICAgICAgICAgY2FzZSBGaWxlRXJyb3IuSU5WQUxJRF9NT0RJRklDQVRJT05fRVJSOlxuICAgICAgICAgbXNnID0gJ0lOVkFMSURfTU9ESUZJQ0FUSU9OX0VSUic7XG4gICAgICAgICBicmVhaztcbiAgICAgICAgIGNhc2UgRmlsZUVycm9yLklOVkFMSURfU1RBVEVfRVJSOlxuICAgICAgICAgbXNnID0gJ0lOVkFMSURfU1RBVEVfRVJSJztcbiAgICAgICAgIGJyZWFrO1xuICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgIG1zZyA9ICdVbmtub3duIEVycm9yJztcbiAgICAgICAgIGJyZWFrO1xuICAgICAgICAgfVxuXG4gICAgICAgICBjb25zb2xlLmxvZygnRXJyb3I6ICcgKyBtc2cpO1xuICAgICAgICAgfVxuXG4gICAgICAgICB3aW5kb3cucmVxdWVzdEZpbGVTeXN0ZW0gID0gd2luZG93LnJlcXVlc3RGaWxlU3lzdGVtIHx8IHdpbmRvdy53ZWJraXRSZXF1ZXN0RmlsZVN5c3RlbTtcblxuICAgICAgICAgd2luZG93LnJlcXVlc3RGaWxlU3lzdGVtKHdpbmRvdy5URU1QT1JBUlksIDUgKiAxMDI0ICogMTAyNCwgZnVuY3Rpb24gb25TdWNjZXNzKGZzKSB7XG5cbiAgICAgICAgIGNvbnNvbGUubG9nKCdvcGVuaW5nIGZpbGUnKTtcblxuICAgICAgICAgZnMucm9vdC5nZXRGaWxlKFwidGVzdFwiLCB7Y3JlYXRlOnRydWV9LCBmdW5jdGlvbihmZSkge1xuXG4gICAgICAgICBjb25zb2xlLmxvZygnc3Bhd25lZCB3cml0ZXInKTtcblxuICAgICAgICAgZmUuY3JlYXRlV3JpdGVyKGZ1bmN0aW9uKGZ3KSB7XG5cbiAgICAgICAgIGZ3Lm9ud3JpdGVlbmQgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgICBjb25zb2xlLmxvZygnd3JpdGUgY29tcGxldGVkJyk7XG4gICAgICAgICB9O1xuXG4gICAgICAgICBmdy5vbmVycm9yID0gZnVuY3Rpb24oZSkge1xuICAgICAgICAgY29uc29sZS5sb2coJ3dyaXRlIGZhaWxlZDogJyArIGUudG9TdHJpbmcoKSk7XG4gICAgICAgICB9O1xuXG4gICAgICAgICBjb25zb2xlLmxvZygnd3JpdGluZyBibG9iIHRvIGZpbGUuLicpO1xuXG4gICAgICAgICB2YXIgYmxvYiA9IG5ldyBCbG9iKFsneWVoIHRoaXMgaXMgYSB0ZXN0ISddLCB7dHlwZTogJ3RleHQvcGxhaW4nfSk7XG4gICAgICAgICBmdy53cml0ZShibG9iKTtcblxuICAgICAgICAgfSwgb25FcnJvckluRlMpO1xuXG4gICAgICAgICB9LCBvbkVycm9ySW5GUyk7XG5cbiAgICAgICAgIH0sIG9uRXJyb3JJbkZTKTtcbiAgICAgICAgICovXG4gICAgfVxuXG4gICAgdG9nZ2xlKGV2ZW50KSB7XG4gICAgICAgIGlmICh0aGlzLmlzUmVjb3JkaW5nKSB7XG4gICAgICAgICAgICB0aGlzLmlzUmVjb3JkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLnN0b3BSZWNvcmRpbmcoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaXNSZWNvcmRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5zdGFydFJlY29yZGluZygpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgY2FuY2VsUmVjb3JkaW5nKGV2ZW50KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkZXI6Om9uUmVjb3JkaW5nQ29tcGxldGVkKCk7IGNhbmNlbGluZyByZWNvcmRpbmdcIik7XG4gICAgICAgICQoXCIjcmVjb3JkZXItZnVsbFwiKS5yZW1vdmVDbGFzcyhcImRpc2FibGVkXCIpO1xuICAgICAgICAkKFwiI3JlY29yZGVyLXVwbG9hZGVyXCIpLmFkZENsYXNzKFwiZGlzYWJsZWRcIik7XG4gICAgICAgICQoXCIubS1yZWNvcmRpbmctY29udGFpbmVyXCIpLnJlbW92ZUNsYXNzKFwiZmxpcHBlZFwiKTtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5zcmMgPSBcIlwiO1xuICAgICAgICB0aGlzLm1vZGVsLnNldCgncmVjb3JkaW5nVGltZScsIDMpO1xuICAgIH1cblxuICAgIHVwbG9hZFJlY29yZGluZyhldmVudCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJlY29yZGVyOjpvblJlY29yZGluZ0NvbXBsZXRlZCgpOyB1cGxvYWRpbmcgcmVjb3JkaW5nXCIpO1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IFwiXCI7XG5cbiAgICAgICAgJChcIiNyZWNvcmRlci1mdWxsXCIpLmFkZENsYXNzKFwiZGlzYWJsZWRcIik7XG4gICAgICAgICQoXCIjcmVjb3JkZXItdXBsb2FkZXJcIikucmVtb3ZlQ2xhc3MoXCJkaXNhYmxlZFwiKTtcbiAgICAgICAgJChcIi5tLXJlY29yZGluZy1jb250YWluZXJcIikucmVtb3ZlQ2xhc3MoXCJmbGlwcGVkXCIpO1xuXG4gICAgICAgIHZhciBkZXNjcmlwdGlvbiA9ICQoJ3RleHRhcmVhW25hbWU9ZGVzY3JpcHRpb25dJylbMF0udmFsdWU7XG5cbiAgICAgICAgdmFyIGRhdGEgPSBuZXcgRm9ybURhdGEoKTtcbiAgICAgICAgZGF0YS5hcHBlbmQoJ2Rlc2NyaXB0aW9uJywgZGVzY3JpcHRpb24pO1xuICAgICAgICBkYXRhLmFwcGVuZCgnaXNQdWJsaWMnLCAxKTtcbiAgICAgICAgZGF0YS5hcHBlbmQoJ2F1ZGlvLWJsb2InLCB0aGlzLmF1ZGlvQmxvYik7XG5cbiAgICAgICAgLy8gc2VuZCByYXcgYmxvYiBhbmQgbWV0YWRhdGFcblxuICAgICAgICAvLyBUT0RPOiBnZXQgYSByZXBsYWNlbWVudCBhamF4IGxpYnJhcnkgKG1heWJlIHBhdGNoIHJlcXdlc3QgdG8gc3VwcG9ydCBiaW5hcnk/KVxuICAgICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgIHhoci5vcGVuKCdwb3N0JywgJy9yZWNvcmRpbmcvY3JlYXRlJywgdHJ1ZSk7XG4gICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdBY2NlcHQnLCAnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgICB4aHIudXBsb2FkLm9ucHJvZ3Jlc3MgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgdmFyIHBlcmNlbnQgPSAoKGUubG9hZGVkIC8gZS50b3RhbCkgKiAxMDApLnRvRml4ZWQoMCkgKyAnJSc7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInBlcmNlbnRhZ2U6IFwiICsgcGVyY2VudCk7XG4gICAgICAgICAgICAkKFwiI3JlY29yZGVyLXVwbG9hZGVyXCIpLmZpbmQoXCIuYmFyXCIpLmNzcygnd2lkdGgnLCBwZXJjZW50KTtcbiAgICAgICAgfTtcbiAgICAgICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAkKFwiI3JlY29yZGVyLXVwbG9hZGVyXCIpLmZpbmQoXCIuYmFyXCIpLmNzcygnd2lkdGgnLCAnMTAwJScpO1xuICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT0gMjAwKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJSZWNvcmRlcjo6b25SZWNvcmRpbmdDb21wbGV0ZWQoKTsgbWFudWFsIHhociBzdWNjZXNzZnVsXCIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlJlY29yZGVyOjpvblJlY29yZGluZ0NvbXBsZXRlZCgpOyBtYW51YWwgeGhyIGVycm9yXCIsIHhocik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gSlNPTi5wYXJzZSh4aHIucmVzcG9uc2UpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJ4aHIucmVzcG9uc2VcIiwgeGhyLnJlc3BvbnNlKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicmVzdWx0XCIsIHJlc3VsdCk7XG5cbiAgICAgICAgICAgIGlmIChyZXN1bHQuc3RhdHVzID09IFwic3VjY2Vzc1wiKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSByZXN1bHQudXJsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICB4aHIuc2VuZChkYXRhKTtcbiAgICB9XG5cbiAgICBvblJlY29yZGluZ1RpY2soKSB7XG4gICAgICAgIHZhciB0aW1lU3BhbiA9IHBhcnNlSW50KCgobmV3IERhdGUoKS5nZXRUaW1lKCkgLSB0aGlzLnRpbWVyU3RhcnQpIC8gMTAwMCkudG9GaXhlZCgpKTtcbiAgICAgICAgdmFyIHRpbWVTdHIgPSB0aGlzLkludFRvVGltZSh0aW1lU3Bhbik7XG4gICAgICAgIHRoaXMubW9kZWwuc2V0KCdyZWNvcmRpbmdUaW1lJywgdGltZVN0cik7XG4gICAgfVxuXG4gICAgb25Db3VudGRvd25UaWNrKCkge1xuICAgICAgICBpZiAoLS10aGlzLnRpbWVyU3RhcnQgPiAwKSB7XG4gICAgICAgICAgICB0aGlzLm1vZGVsLnNldCgncmVjb3JkaW5nVGltZScsIHRoaXMudGltZXJTdGFydCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImNvdW50ZG93biBoaXQgemVyby4gYmVnaW4gcmVjb3JkaW5nLlwiKTtcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy50aW1lcklkKTtcbiAgICAgICAgICAgIHRoaXMubW9kZWwuc2V0KCdyZWNvcmRpbmdUaW1lJywgdGhpcy5JbnRUb1RpbWUoMCkpO1xuICAgICAgICAgICAgdGhpcy5vbk1pY1JlY29yZGluZygpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc3RhcnRSZWNvcmRpbmcoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwic3RhcnRpbmcgcmVjb3JkaW5nXCIpO1xuICAgICAgICB0aGlzLmF1ZGlvQ2FwdHVyZS5zdGFydCgoKSA9PiB0aGlzLm9uTWljUmVhZHkoKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTWljcm9waG9uZSBpcyByZWFkeSB0byByZWNvcmQuIERvIGEgY291bnQtZG93biwgdGhlbiBzaWduYWwgZm9yIGlucHV0LXNpZ25hbCB0byBiZWdpbiByZWNvcmRpbmdcbiAgICAgKi9cbiAgICBvbk1pY1JlYWR5KCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIm1pYyByZWFkeSB0byByZWNvcmQuIGRvIGNvdW50ZG93bi5cIik7XG4gICAgICAgIHRoaXMudGltZXJTdGFydCA9IDM7XG4gICAgICAgIC8vIHJ1biBjb3VudGRvd25cbiAgICAgICAgLy90aGlzLnRpbWVySWQgPSBzZXRJbnRlcnZhbCh0aGlzLm9uQ291bnRkb3duVGljay5iaW5kKHRoaXMpLCAxMDAwKTtcblxuICAgICAgICAvLyBvciBsYXVuY2ggY2FwdHVyZSBpbW1lZGlhdGVseVxuICAgICAgICB0aGlzLm1vZGVsLnNldCgncmVjb3JkaW5nVGltZScsIHRoaXMuSW50VG9UaW1lKDApKTtcbiAgICAgICAgdGhpcy5vbk1pY1JlY29yZGluZygpO1xuXG4gICAgICAgICQoXCIucmVjb3JkaW5nLXRpbWVcIikuYWRkQ2xhc3MoXCJpcy12aXNpYmxlXCIpO1xuICAgIH1cblxuICAgIG9uTWljUmVjb3JkaW5nKCkge1xuICAgICAgICB0aGlzLnRpbWVyU3RhcnQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgdGhpcy50aW1lcklkID0gc2V0SW50ZXJ2YWwodGhpcy5vblJlY29yZGluZ1RpY2suYmluZCh0aGlzKSwgMTAwMCk7XG4gICAgICAgICQoXCIubS1yZWNvcmRpbmctc2NyZWVuXCIpLmFkZENsYXNzKFwiaXMtcmVjb3JkaW5nXCIpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiTWljIHJlY29yZGluZyBzdGFydGVkXCIpO1xuXG4gICAgICAgIC8vIFRPRE86IHRoZSBtaWMgY2FwdHVyZSBpcyBhbHJlYWR5IGFjdGl2ZSwgc28gYXVkaW8gYnVmZmVycyBhcmUgZ2V0dGluZyBidWlsdCB1cFxuICAgICAgICAvLyB3aGVuIHRvZ2dsaW5nIHRoaXMgb24sIHdlIG1heSBhbHJlYWR5IGJlIGNhcHR1cmluZyBhIGJ1ZmZlciB0aGF0IGhhcyBhdWRpbyBwcmlvciB0byB0aGUgY291bnRkb3duXG4gICAgICAgIC8vIGhpdHRpbmcgemVyby4gd2UgY2FuIGRvIGEgZmV3IHRoaW5ncyBoZXJlOlxuICAgICAgICAvLyAxKSBmaWd1cmUgb3V0IGhvdyBtdWNoIGF1ZGlvIHdhcyBhbHJlYWR5IGNhcHR1cmVkLCBhbmQgY3V0IGl0IG91dFxuICAgICAgICAvLyAyKSB1c2UgYSBmYWRlLWluIHRvIGNvdmVyIHVwIHRoYXQgc3BsaXQtc2Vjb25kIG9mIGF1ZGlvXG4gICAgICAgIC8vIDMpIGFsbG93IHRoZSB1c2VyIHRvIGVkaXQgcG9zdC1yZWNvcmQgYW5kIGNsaXAgYXMgdGhleSB3aXNoIChiZXR0ZXIgYnV0IG1vcmUgY29tcGxleCBvcHRpb24hKVxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHRoaXMuYXVkaW9DYXB0dXJlLnRvZ2dsZU1pY3JvcGhvbmVSZWNvcmRpbmcodHJ1ZSksIDUwMCk7XG4gICAgfVxuXG4gICAgc3RvcFJlY29yZGluZygpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJzdG9wcGluZyByZWNvcmRpbmdcIik7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy50aW1lcklkKTtcblxuICAgICAgICAvLyBwbGF5IHNvdW5kIGltbWVkaWF0ZWx5IHRvIGJ5cGFzcyBtb2JpbGUgY2hyb21lJ3MgXCJ1c2VyIGluaXRpYXRlZCBtZWRpYVwiIHJlcXVpcmVtZW50XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuc3JjID0gXCIvYXNzZXRzL3NvdW5kcy9iZWVwX3Nob3J0X29uLm9nZ1wiO1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnBsYXkoKTtcblxuICAgICAgICB0aGlzLmF1ZGlvQ2FwdHVyZS5zdG9wKChibG9iKSA9PiB0aGlzLm9uUmVjb3JkaW5nQ29tcGxldGVkKGJsb2IpKTtcblxuICAgICAgICAkKFwiLnJlY29yZGluZy10aW1lXCIpLnJlbW92ZUNsYXNzKFwiaXMtdmlzaWJsZVwiKTtcbiAgICAgICAgJChcIi5tLXJlY29yZGluZy1zY3JlZW5cIikucmVtb3ZlQ2xhc3MoXCJpcy1yZWNvcmRpbmdcIik7XG5cbiAgICAgICAgLy8gVE9ETzogYW5pbWF0ZSByZWNvcmRlciBvdXRcbiAgICAgICAgLy8gVE9ETzogYW5pbWF0ZSB1cGxvYWRlciBpblxuICAgIH1cblxuICAgIG9uUmVjb3JkaW5nQ29tcGxldGVkKGJsb2IpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJSZWNvcmRlcjo6b25SZWNvcmRpbmdDb21wbGV0ZWQoKTsgcHJldmlld2luZyByZWNvcmRlZCBhdWRpb1wiKTtcbiAgICAgICAgdGhpcy5hdWRpb0Jsb2IgPSBibG9iO1xuICAgICAgICB0aGlzLnNob3dDb21wbGV0aW9uU2NyZWVuKCk7XG4gICAgfVxuXG4gICAgcGxheVByZXZpZXcoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwicGxheWluZyBwcmV2aWV3Li5cIik7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiYXVkaW8gYmxvYlwiLCB0aGlzLmF1ZGlvQmxvYik7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiYXVkaW8gYmxvYiB1cmxcIiwgdGhpcy5hdWRpb0Jsb2JVcmwpO1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IHRoaXMuYXVkaW9CbG9iVXJsO1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnBsYXkoKTtcbiAgICB9XG5cbiAgICBzaG93Q29tcGxldGlvblNjcmVlbigpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJSZWNvcmRlcjo6b25SZWNvcmRpbmdDb21wbGV0ZWQoKTsgZmxpcHBpbmcgdG8gYXVkaW8gcGxheWJhY2tcIik7XG4gICAgICAgIHRoaXMuYXVkaW9CbG9iVXJsID0gd2luZG93LlVSTC5jcmVhdGVPYmplY3RVUkwodGhpcy5hdWRpb0Jsb2IpO1xuICAgICAgICAkKFwiLm0tcmVjb3JkaW5nLWNvbnRhaW5lclwiKS5hZGRDbGFzcyhcImZsaXBwZWRcIik7XG5cbiAgICAgICAgLy8gSEFDSzogcm91dGUgYmxvYiB0aHJvdWdoIHhociB0byBsZXQgQW5kcm9pZCBDaHJvbWUgcGxheSBibG9icyB2aWEgPGF1ZGlvPlxuICAgICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgIHhoci5vcGVuKCdHRVQnLCB0aGlzLmF1ZGlvQmxvYlVybCwgdHJ1ZSk7XG4gICAgICAgIHhoci5yZXNwb25zZVR5cGUgPSAnYmxvYic7XG4gICAgICAgIHhoci5vdmVycmlkZU1pbWVUeXBlKCdhdWRpby9vZ2cnKTtcblxuICAgICAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gKCkgPT4ge1xuICAgICAgICAgICAgaWYgKHhoci5yZWFkeVN0YXRlID09PSA0ICYmIHhoci5zdGF0dXMgPT0gMjAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIHhockJsb2JVcmwgPSB3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTCh4aHIucmVzcG9uc2UpO1xuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJMb2FkZWQgYmxvYiBmcm9tIGNhY2hlIHVybDogXCIgKyB0aGlzLmF1ZGlvQmxvYlVybCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJSb3V0ZWQgaW50byBibG9iIHVybDogXCIgKyB4aHJCbG9iVXJsKTtcblxuICAgICAgICAgICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuc3JjID0geGhyQmxvYlVybDtcbiAgICAgICAgICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnBsYXkoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgeGhyLnNlbmQoKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgQmFja2JvbmUgZnJvbSAnYmFja2JvbmUnXG5pbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJ1xuaW1wb3J0IEhvbWVwYWdlVmlldyBmcm9tICcuL2hvbWVwYWdlJ1xuaW1wb3J0IHsgUmVjb3JkZXJWaWV3LCBSZWNvcmRlciB9IGZyb20gJy4vcmVjb3JkaW5nLWNvbnRyb2wnXG5pbXBvcnQgeyBVc2VyUG9kQ29sbGVjdGlvblZpZXcgfSBmcm9tICcuL3VzZXItcG9kLWNvbGxlY3Rpb24nXG5cbmNsYXNzIFJvdXRlciBleHRlbmRzIEJhY2tib25lLlJvdXRlciB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKHtcbiAgICAgICAgICAgIHJvdXRlczoge1xuICAgICAgICAgICAgICAgICcnOiAnaG9tZScsXG4gICAgICAgICAgICAgICAgJ3JlY29yZCc6ICdyZWNvcmQnLFxuICAgICAgICAgICAgICAgICd1Lzp1c2VybmFtZSc6ICd1c2VyJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBob21lKCkge1xuICAgICAgICBjb25zb2xlLmxvZygnUm91dGVyI2hvbWUgY2FsbGVkJyk7XG5cbiAgICAgICAgdmFyIHZpZXcgPSBuZXcgSG9tZXBhZ2VWaWV3KCk7XG4gICAgICAgIHRoaXMuc3dpdGNoVmlldyh2aWV3KTtcbiAgICB9XG5cbiAgICB1c2VyKHVzZXJuYW1lKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdSb3V0ZXIjdXNlciBjYWxsZWQgZm9yIHVzZXJuYW1lID0gJyArIHVzZXJuYW1lKTtcbiAgICAgICAgdmFyIHZpZXcgPSBuZXcgVXNlclBvZENvbGxlY3Rpb25WaWV3KHVzZXJuYW1lKTtcbiAgICAgICAgdGhpcy5zd2l0Y2hWaWV3KHZpZXcpO1xuICAgIH1cblxuICAgIHJlY29yZCgpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1JvdXRlciNyZWNvcmQgY2FsbGVkJyk7XG5cbiAgICAgICAgdmFyIHZpZXcgPSBuZXcgUmVjb3JkZXJWaWV3KHtcbiAgICAgICAgICAgIG1vZGVsOiBuZXcgUmVjb3JkZXIoe3JlY29yZGluZ1RpbWU6IC0zfSlcbiAgICAgICAgfSlcblxuICAgICAgICB0aGlzLnN3aXRjaFZpZXcodmlldyk7XG4gICAgfVxuXG4gICAgc3dpdGNoVmlldyhuZXdWaWV3KSB7XG4gICAgICAgIGlmKHRoaXMudmlldykge1xuICAgICAgICAgICAgdmFyIG9sZFZpZXcgPSB0aGlzLnZpZXc7XG4gICAgICAgICAgICBvbGRWaWV3LiRlbC5yZW1vdmVDbGFzcyhcInRyYW5zaXRpb24taW5cIik7XG4gICAgICAgICAgICBvbGRWaWV3LiRlbC5hZGRDbGFzcyhcInRyYW5zaXRpb24tb3V0XCIpO1xuICAgICAgICAgICAgb2xkVmlldy4kZWwub25lKFwiYW5pbWF0aW9uZW5kXCIsICgpID0+IHtcbiAgICAgICAgICAgICAgICBvbGRWaWV3LnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIG9sZFZpZXcudW5iaW5kKCk7XG4gICAgICAgICAgICAgICAgaWYob2xkVmlldy5zaHV0ZG93biAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIG9sZFZpZXcuc2h1dGRvd24oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIG5ld1ZpZXcuJGVsLmFkZENsYXNzKFwidHJhbnNpdGlvbmFibGUgdHJhbnNpdGlvbi1pblwiKTtcbiAgICAgICAgbmV3Vmlldy4kZWwub25lKFwiYW5pbWF0aW9uZW5kXCIsICgpID0+IHtcbiAgICAgICAgICAgIG5ld1ZpZXcuJGVsLnJlbW92ZUNsYXNzKFwidHJhbnNpdGlvbi1pblwiKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJCgnI3ZpZXctY29udGFpbmVyJykuYXBwZW5kKG5ld1ZpZXcuZWwpO1xuICAgICAgICB0aGlzLnZpZXcgPSBuZXdWaWV3O1xuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgUm91dGVyO1xuIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuaW1wb3J0IHsgUXVpcFZpZXcsIH0gZnJvbSAnLi9xdWlwLWNvbnRyb2wuanMnXG5pbXBvcnQgeyBBdWRpb1BsYXllciwgQXVkaW9QbGF5ZXJWaWV3IH0gZnJvbSAnLi9hdWRpby1wbGF5ZXInXG5pbXBvcnQgeyBRdWlwTW9kZWwsIE15UXVpcENvbGxlY3Rpb24gfSBmcm9tICcuL21vZGVscy9RdWlwJ1xuXG5jbGFzcyBVc2VyUG9kQ29sbGVjdGlvbiBleHRlbmRzIEJhY2tib25lLkNvbGxlY3Rpb24ge1xuICAgIGNvbnN0cnVjdG9yKHVzZXJuYW1lKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMubW9kZWwgPSBRdWlwTW9kZWw7XG4gICAgICAgIHRoaXMudXNlcm5hbWUgPSB1c2VybmFtZTtcbiAgICB9XG5cbiAgICB1cmwoKSB7XG4gICAgICAgIHJldHVybiBcIi9hcGkvdS9cIiArIHRoaXMudXNlcm5hbWUgKyBcIi9xdWlwc1wiO1xuICAgIH1cbn1cblxuY2xhc3MgVXNlclBvZENvbGxlY3Rpb25WaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlldyB7XG4gICAgY29uc3RydWN0b3IodXNlcm5hbWUpIHtcbiAgICAgICAgc3VwZXIodXNlcm5hbWUpO1xuICAgIH1cblxuICAgIGluaXRpYWxpemUodXNlcm5hbWUpIHtcbiAgICAgICAgbmV3IFVzZXJQb2RDb2xsZWN0aW9uKHVzZXJuYW1lKVxuICAgICAgICAgICAgLmZldGNoKClcbiAgICAgICAgICAgIC50aGVuKHF1aXBzID0+IHRoaXMuY3JlYXRlQ2hpbGRWaWV3cyhxdWlwcykpXG4gICAgfVxuXG4gICAgc2h1dGRvd24oKSB7XG4gICAgICAgIEF1ZGlvUGxheWVyLnBhdXNlKCk7XG4gICAgICAgIHRoaXMuZGVzdHJveUNoaWxkVmlld3MoKTtcbiAgICB9XG5cbiAgICBjcmVhdGVDaGlsZFZpZXdzKHF1aXBzKSB7XG4gICAgICAgIHRoaXMucXVpcFZpZXdzID0gW107XG5cbiAgICAgICAgZm9yICh2YXIgcXVpcCBvZiBxdWlwcykge1xuICAgICAgICAgICAgdmFyIHF1aXBWaWV3ID0gbmV3IFF1aXBWaWV3KHttb2RlbDogbmV3IFF1aXBNb2RlbChxdWlwKX0pO1xuICAgICAgICAgICAgdGhpcy5xdWlwVmlld3MucHVzaChxdWlwVmlldyk7XG4gICAgICAgICAgICB0aGlzLiRlbC5hcHBlbmQocXVpcFZpZXcuZWwpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZGVzdHJveUNoaWxkVmlld3MoKSB7XG4gICAgICAgIGlmICh0aGlzLnF1aXBWaWV3cyAhPSBudWxsKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBxdWlwIG9mIHRoaXMucXVpcFZpZXdzKSB7XG4gICAgICAgICAgICAgICAgcXVpcC5zaHV0ZG93bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgeyBVc2VyUG9kQ29sbGVjdGlvbiwgVXNlclBvZENvbGxlY3Rpb25WaWV3IH1cblxuIl19
