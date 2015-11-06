(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _backbone = require('backbone');

var _backbone2 = _interopRequireDefault(_backbone);

var _homepage = require('./homepage');

var _homepage2 = _interopRequireDefault(_homepage);

var Application = function Application() {
    _classCallCheck(this, Application);

    _backbone2['default'].$ = $;
    _backbone2['default'].history.start();

    var view = new _homepage2['default']();
    view.render();

    //// locate any controllers on the page and load their requirements
    //// this is a part of Angular i really liked, the custom directives
    //$('[backbone-controller]').each(function(el) {
    //
    //    var controllerName = $(el).attr('backbone-controller');
    //    if(controllerName in App.Loaders)
    //        App.Loaders[controllerName]();
    //    else
    //        console.error("Controller: '" + controllerName + "' not found");
    //});
};

$(function () {
    // setup raven to push messages to our sentry
    Raven.config('https://d098712cb7064cf08b74d01b6f3be3da@app.getsentry.com/20973', {
        whitelistUrls: ['staging.couchpod.com', 'couchpod.com'] // production only
    }).install();

    new Application();

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
module.exports = exports['default'];

},{"./homepage":3,"backbone":"backbone"}],2:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var SoundPlayer = (function () {
    function SoundPlayer() {
        _classCallCheck(this, SoundPlayer);
    }

    _createClass(SoundPlayer, null, [{
        key: "create",
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

                    if (this.duration == null) {
                        console.log("duration is null");
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
                    var progress = (this.duration > 0 ? 100 * this.position / this.duration : 0).toFixed(0) + '%';
                    localStorage.setItem("quip:" + this.id + ":progress", progress);
                    localStorage.setItem("quip:" + this.id + ":position", this.position.toFixed(0));
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

exports["default"] = SoundPlayer;
module.exports = exports["default"];

},{}],3:[function(require,module,exports){
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

var RecordingsList = (function (_Backbone$View) {
    _inherits(RecordingsList, _Backbone$View);

    function RecordingsList() {
        _classCallCheck(this, RecordingsList);

        _get(Object.getPrototypeOf(RecordingsList.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(RecordingsList, [{
        key: 'initialize',
        value: function initialize() {
            soundManager.setup({
                debugMode: true,
                url: '/assets/swf/',
                preferFlash: false,
                onready: function onready() {
                    console.log("soundManager ready");
                }
            });

            $('.quip').each(function (elem) {
                var view = new _quipControlJs.QuipView({
                    el: elem,
                    model: new _quipControlJs.QuipModel({ progress: 0 })
                });

                _quipControlJs.Quips.add(view.model);
                view.render();
            });

            // process all timestamps
            var vagueTime = require('vague-time');
            var now = new Date();

            $("time[datetime]").each(function generateVagueDate(ele) {
                ele.textContent = vagueTime.get({ from: now, to: new Date(ele.getAttribute('datetime')) });
            });

            this.listenTo(_quipControlJs.Quips, 'add', this.quipAdded);
        }
    }, {
        key: 'quipAdded',
        value: function quipAdded(quip) {}
    }]);

    return RecordingsList;
})(_backbone2['default'].View);

exports['default'] = RecordingsList;
module.exports = exports['default'];

},{"./quip-control.js":4,"backbone":"backbone","vague-time":"vague-time"}],4:[function(require,module,exports){
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

var _audioPlayerJs = require('./audio-player.js');

var _audioPlayerJs2 = _interopRequireDefault(_audioPlayerJs);

/**
 * Quip
 * Plays audio and tracks position
 */

var QuipModel = (function (_Backbone$Model) {
    _inherits(QuipModel, _Backbone$Model);

    _createClass(QuipModel, [{
        key: 'defaults',
        value: function defaults() {
            return {
                id: 0, // guid
                progress: 0, // [0-100] percentage
                position: 0, // msec
                duration: 0, // msec
                isPublic: false
            };
        }
    }]);

    function QuipModel() {
        _classCallCheck(this, QuipModel);

        _get(Object.getPrototypeOf(QuipModel.prototype), 'constructor', this).call(this);
    }

    _createClass(QuipModel, [{
        key: 'save',
        value: function save(attributes) {
            console.log("Quip Model saving to localStorage");
            localStorage.setItem(this.id, JSON.stringify(this.toJSON()));
        }
    }, {
        key: 'fetch',
        value: function fetch() {
            console.log("Quip Model loading from localStorage");
            this.set(JSON.parse(localStorage.getItem(this.id)));
        }
    }, {
        key: 'updateProgress',
        value: function updateProgress() {
            this.set({
                progress: (duration > 0 ? position / duration : 0).toFixed(0) + "%"
            });
        }
    }]);

    return QuipModel;
})(_backbone2['default'].Model);

var QuipView = (function (_Backbone$View) {
    _inherits(QuipView, _Backbone$View);

    function QuipView() {
        _classCallCheck(this, QuipView);

        _get(Object.getPrototypeOf(QuipView.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(QuipView, [{
        key: 'defaults',
        value: function defaults() {
            return {
                quipId: 0
            };
        }
    }, {
        key: 'events',
        value: function events() {
            return {
                "click .description .lock-indicator": "togglePublic",
                "click .quip-player": "toggle"
            };
        }
    }, {
        key: 'initialize',
        value: function initialize() {
            //this.model.view = this;
            this.quipId = this.$el.data("quipId");

            var progress = localStorage.getItem("quip:" + this.quipId + ":progress");
            var position = localStorage.getItem("quip:" + this.quipId + ":position");

            // update visuals to indicate playback progress
            this.model.on('change:progress', function (model, progress) {
                $("div[data-quip-id='" + this.quipId + "'] .progress-bar").css("width", progress);
            });

            this.publicLink = '/u/' + this.quipId;

            this.model.set({
                'id': this.quipId,
                'progress': progress,
                'position': position,
                'isPublic': this.$el.data("isPublic") == 'True',
                'isMine': this.$el.data("isMine") == 'True'
            });

            // only redraw template on data change
            this.listenTo(this.model, "change", this.render);
            //this.model.on('change:isPublic', this.render, this);
            //this.model.on('change:isMine', this.render, this);
        }
    }, {
        key: 'togglePublic',
        value: function togglePublic(ev) {
            var newState = !this.model.get('isPublic');
            this.model.set({ 'isPublic': newState });

            console.log("toggling new published state: " + newState);

            $.ajax({
                url: '/recording/publish/' + this.quipId,
                method: 'post',
                data: { isPublic: newState },
                complete: function complete(resp) {
                    if (resp && resp.status == 'success') {
                        // change successful
                    } else {
                            // change failed
                            // TODO: add visual to indicate change-failure
                            console.warn("Toggling recording publication state failed:");
                            console.dir(resp);
                        }
                }
            });

            return false;
        }
    }, {
        key: 'toggle',
        value: function toggle(event) {
            var quipId = $(this.el).data("quipId");
            var url = '/recordings/' + quipId + '.ogg';
            console.log("toggling recording playback: " + url);

            var that = this;

            var resumePosition = parseInt(that.model.get('position') || 0);
            console.log('resumePosition = ' + resumePosition);

            // check if sound is already buffered
            var existingQuip = soundManager.getSoundById(quipId);
            if (existingQuip) {
                // resume existing audio clip
                if (!existingQuip.paused && existingQuip.playState) {
                    soundManager.pauseAll();
                    console.log("pausing existing clip");

                    $(this.el).find('.fa-play-circle').removeClass('fa-pause').addClass('fa-play-circle');
                } else {
                    soundManager.pauseAll();

                    if (!existingQuip.playState) {
                        existingQuip.setPosition(0);
                    }

                    existingQuip.play();
                    console.log("resuming existing clip");

                    $(this.el).find('.fa-play-circle').removeClass('fa-play-circle').addClass('fa-pause');
                }
            }

            if (existingQuip) return;

            soundManager.pauseAll();

            this.model.url = url;

            // would be better if this was a completely single-page ajax app and there was a persistent audio player
            _audioPlayerJs2['default'].create(this.model);
        }
    }, {
        key: 'render',
        value: function render() {
            console.log("quip-control redraw");

            var result = $(this.el).find('.controls').find('.lock-indicator');
            if (result) result.remove();

            if (this.model.get('isMine')) {
                var _ = require('underscore');
                var html = _.template($("#quip-control-privacy").html());

                $(this.el).find(".controls").prepend(html({
                    isPublic: this.model.get('isPublic'),
                    publicLink: this.publicLink
                }));
            }
        }
    }]);

    return QuipView;
})(_backbone2['default'].View);

var QuipList = (function (_Backbone$Collection) {
    _inherits(QuipList, _Backbone$Collection);

    function QuipList(options) {
        _classCallCheck(this, QuipList);

        _get(Object.getPrototypeOf(QuipList.prototype), 'constructor', this).call(this, options);
        this.model = QuipModel;
    }

    return QuipList;
})(_backbone2['default'].Collection);

var Quips = new QuipList();

exports.QuipModel = QuipModel;
exports.QuipView = QuipView;
exports.QuipList = QuipList;
exports.Quips = Quips;

},{"./audio-player.js":2,"backbone":"backbone","underscore":"underscore"}]},{},[1])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYWJhcmthbi9hbGV4LWRldi9xdWlwcy1weXRob24vYXBwL2phdmFzY3JpcHRzL2FwcC5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9hcHAvamF2YXNjcmlwdHMvYXVkaW8tcGxheWVyLmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL2FwcC9qYXZhc2NyaXB0cy9ob21lcGFnZS5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9hcHAvamF2YXNjcmlwdHMvcXVpcC1jb250cm9sLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozt3QkNBcUIsVUFBVTs7Ozt3QkFDSixZQUFZOzs7O0lBRWpDLFdBQVcsR0FDRixTQURULFdBQVcsR0FDQzswQkFEWixXQUFXOztBQUVULDBCQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDZiwwQkFBUyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7O0FBRXpCLFFBQUksSUFBSSxHQUFHLDJCQUFvQixDQUFDO0FBQ2hDLFFBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQzs7Ozs7Ozs7Ozs7O0NBWWpCOztBQUdMLENBQUMsQ0FBQyxZQUFNOztBQUVKLFNBQUssQ0FBQyxNQUFNLENBQUMsa0VBQWtFLEVBQUU7QUFDN0UscUJBQWEsRUFBRSxDQUFDLHNCQUFzQixFQUFFLGNBQWMsQ0FBQztLQUMxRCxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7O0FBRWIsUUFBSSxXQUFXLEVBQUUsQ0FBQzs7Ozs7Ozs7Ozs7OztDQWFyQixDQUFDLENBQUE7O3FCQUVhLEVBQUUsV0FBVyxFQUFYLFdBQVcsRUFBRTs7Ozs7Ozs7Ozs7Ozs7SUM3Q1QsV0FBVzthQUFYLFdBQVc7OEJBQVgsV0FBVzs7O2lCQUFYLFdBQVc7O2VB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LE1BQU0sRUFDTixNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7O0FBRXBCLGdCQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFO0FBQzFCLG9CQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDOUIsb0JBQUksSUFBSSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQzs7QUFFekQsaUJBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7QUFDdEMsNEJBQVEsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUM7QUFDcEMsOEJBQVUsRUFBRSxJQUFJLENBQUMsVUFBVTtpQkFDOUIsQ0FBQyxDQUFDLENBQUM7YUFDUDtTQUNKOzs7V0FySUMsUUFBUTtHQUFTLHNCQUFTLElBQUk7O0lBd0k5QixRQUFRO2NBQVIsUUFBUTs7QUFDQyxhQURULFFBQVEsQ0FDRSxPQUFPLEVBQUU7OEJBRG5CLFFBQVE7O0FBRU4sbUNBRkYsUUFBUSw2Q0FFQSxPQUFPLEVBQUU7QUFDZixZQUFJLENBQUMsS0FBSyxHQUFHLFNBQVMsQ0FBQztLQUMxQjs7V0FKQyxRQUFRO0dBQVMsc0JBQVMsVUFBVTs7QUFPMUMsSUFBSSxLQUFLLEdBQUcsSUFBSSxRQUFRLEVBQUUsQ0FBQzs7UUFFbEIsU0FBUyxHQUFULFNBQVM7UUFBRSxRQUFRLEdBQVIsUUFBUTtRQUFFLFFBQVEsR0FBUixRQUFRO1FBQUUsS0FBSyxHQUFMLEtBQUsiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuaW1wb3J0IFJlY29yZGluZ3NMaXN0IGZyb20gJy4vaG9tZXBhZ2UnXG5cbmNsYXNzIEFwcGxpY2F0aW9uIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgQmFja2JvbmUuJCA9ICQ7XG4gICAgICAgIEJhY2tib25lLmhpc3Rvcnkuc3RhcnQoKTtcblxuICAgICAgICB2YXIgdmlldyA9IG5ldyBSZWNvcmRpbmdzTGlzdCgpO1xuICAgICAgICB2aWV3LnJlbmRlcigpO1xuXG4gICAgICAgIC8vLy8gbG9jYXRlIGFueSBjb250cm9sbGVycyBvbiB0aGUgcGFnZSBhbmQgbG9hZCB0aGVpciByZXF1aXJlbWVudHNcbiAgICAgICAgLy8vLyB0aGlzIGlzIGEgcGFydCBvZiBBbmd1bGFyIGkgcmVhbGx5IGxpa2VkLCB0aGUgY3VzdG9tIGRpcmVjdGl2ZXNcbiAgICAgICAgLy8kKCdbYmFja2JvbmUtY29udHJvbGxlcl0nKS5lYWNoKGZ1bmN0aW9uKGVsKSB7XG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgIHZhciBjb250cm9sbGVyTmFtZSA9ICQoZWwpLmF0dHIoJ2JhY2tib25lLWNvbnRyb2xsZXInKTtcbiAgICAgICAgLy8gICAgaWYoY29udHJvbGxlck5hbWUgaW4gQXBwLkxvYWRlcnMpXG4gICAgICAgIC8vICAgICAgICBBcHAuTG9hZGVyc1tjb250cm9sbGVyTmFtZV0oKTtcbiAgICAgICAgLy8gICAgZWxzZVxuICAgICAgICAvLyAgICAgICAgY29uc29sZS5lcnJvcihcIkNvbnRyb2xsZXI6ICdcIiArIGNvbnRyb2xsZXJOYW1lICsgXCInIG5vdCBmb3VuZFwiKTtcbiAgICAgICAgLy99KTtcbiAgICB9XG59XG5cbiQoKCkgPT4ge1xuICAgIC8vIHNldHVwIHJhdmVuIHRvIHB1c2ggbWVzc2FnZXMgdG8gb3VyIHNlbnRyeVxuICAgIFJhdmVuLmNvbmZpZygnaHR0cHM6Ly9kMDk4NzEyY2I3MDY0Y2YwOGI3NGQwMWI2ZjNiZTNkYUBhcHAuZ2V0c2VudHJ5LmNvbS8yMDk3MycsIHtcbiAgICAgICAgd2hpdGVsaXN0VXJsczogWydzdGFnaW5nLmNvdWNocG9kLmNvbScsICdjb3VjaHBvZC5jb20nXSAvLyBwcm9kdWN0aW9uIG9ubHlcbiAgICB9KS5pbnN0YWxsKCk7XG5cbiAgICBuZXcgQXBwbGljYXRpb24oKTtcblxuICAgIC8vIGZvciBwcm9kdWN0aW9uLCBjb3VsZCB3cmFwIGRvbVJlYWR5Q2FsbGJhY2sgYW5kIGxldCByYXZlbiBoYW5kbGUgYW55IGV4Y2VwdGlvbnNcblxuICAgIC8qXG4gICAgdHJ5IHtcbiAgICAgICAgZG9tUmVhZHlDYWxsYmFjaygpO1xuICAgIH0gY2F0Y2goZXJyKSB7XG4gICAgICAgIFJhdmVuLmNhcHR1cmVFeGNlcHRpb24oZXJyKTtcbiAgICAgICAgY29uc29sZS5sb2coXCJbRXJyb3JdIFVuaGFuZGxlZCBFeGNlcHRpb24gd2FzIGNhdWdodCBhbmQgc2VudCB2aWEgUmF2ZW46XCIpO1xuICAgICAgICBjb25zb2xlLmRpcihlcnIpO1xuICAgIH1cbiAgICAqL1xufSlcblxuZXhwb3J0IGRlZmF1bHQgeyBBcHBsaWNhdGlvbiB9XG4iLCJleHBvcnQgZGVmYXVsdCBjbGFzcyBTb3VuZFBsYXllciB7XG4gICAgc3RhdGljIGNyZWF0ZSAobW9kZWwpIHtcbiAgICAgICAgdmFyIHJlc3VtZVBvc2l0aW9uID0gcGFyc2VJbnQobW9kZWwuZ2V0KCdwb3NpdGlvbicpIHx8IDApO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQ3JlYXRpbmcgc291bmQgcGxheWVyIGZvciBtb2RlbDpcIiwgbW9kZWwpO1xuXG4gICAgICAgIHJldHVybiBzb3VuZE1hbmFnZXIuY3JlYXRlU291bmQoe1xuICAgICAgICAgICAgaWQ6IG1vZGVsLmlkLFxuICAgICAgICAgICAgdXJsOiBtb2RlbC51cmwsXG4gICAgICAgICAgICB2b2x1bWU6IDEwMCxcbiAgICAgICAgICAgIGF1dG9Mb2FkOiB0cnVlLFxuICAgICAgICAgICAgYXV0b1BsYXk6IGZhbHNlLFxuICAgICAgICAgICAgZnJvbTogcmVzdW1lUG9zaXRpb24sXG4gICAgICAgICAgICB3aGlsZWxvYWRpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImxvYWRlZDogXCIgKyB0aGlzLmJ5dGVzTG9hZGVkICsgXCIgb2YgXCIgKyB0aGlzLmJ5dGVzVG90YWwpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9ubG9hZDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTb3VuZDsgYXVkaW8gbG9hZGVkOyBwb3NpdGlvbiA9ICcgKyByZXN1bWVQb3NpdGlvbiArICcsIGR1cmF0aW9uID0gJyArIHRoaXMuZHVyYXRpb24pO1xuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZHVyYXRpb24gPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImR1cmF0aW9uIGlzIG51bGxcIilcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoKHJlc3VtZVBvc2l0aW9uICsgMTApID4gdGhpcy5kdXJhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAvLyB0aGUgdHJhY2sgaXMgcHJldHR5IG11Y2ggY29tcGxldGUsIGxvb3AgaXRcbiAgICAgICAgICAgICAgICAgICAgLy8gRklYTUU6IHRoaXMgc2hvdWxkIGFjdHVhbGx5IGhhcHBlbiBlYXJsaWVyLCB3ZSBzaG91bGQga25vdyB0aGF0IHRoZSBhY3Rpb24gd2lsbCBjYXVzZSBhIHJld2luZFxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgYW5kIGluZGljYXRlIHRoZSByZXdpbmQgdmlzdWFsbHkgc28gdGhlcmUgaXMgbm8gc3VycHJpc2VcbiAgICAgICAgICAgICAgICAgICAgcmVzdW1lUG9zaXRpb24gPSAwO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnU291bmQ7IHRyYWNrIG5lZWRlZCBhIHJld2luZCcpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEZJWE1FOiByZXN1bWUgY29tcGF0aWJpbGl0eSB3aXRoIHZhcmlvdXMgYnJvd3NlcnNcbiAgICAgICAgICAgICAgICAvLyBGSVhNRTogc29tZXRpbWVzIHlvdSByZXN1bWUgYSBmaWxlIGFsbCB0aGUgd2F5IGF0IHRoZSBlbmQsIHNob3VsZCBsb29wIHRoZW0gYXJvdW5kXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRQb3NpdGlvbihyZXN1bWVQb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgdGhpcy5wbGF5KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgd2hpbGVwbGF5aW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHByb2dyZXNzID0gKHRoaXMuZHVyYXRpb24gPiAwID8gMTAwICogdGhpcy5wb3NpdGlvbiAvIHRoaXMuZHVyYXRpb24gOiAwKS50b0ZpeGVkKDApICsgJyUnO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicXVpcDpcIiArIHRoaXMuaWQgKyBcIjpwcm9ncmVzc1wiLCBwcm9ncmVzcyk7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJxdWlwOlwiICsgdGhpcy5pZCArIFwiOnBvc2l0aW9uXCIsIHRoaXMucG9zaXRpb24udG9GaXhlZCgwKSk7XG4gICAgICAgICAgICAgICAgbW9kZWwuc2V0KHsncHJvZ3Jlc3MnOiBwcm9ncmVzc30pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9ucGF1c2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlNvdW5kOyBwYXVzZWQ6IFwiICsgdGhpcy5pZCk7XG4gICAgICAgICAgICAgICAgdmFyIHByb2dyZXNzID0gKHRoaXMuZHVyYXRpb24gPiAwID8gMTAwICogdGhpcy5wb3NpdGlvbiAvIHRoaXMuZHVyYXRpb24gOiAwKS50b0ZpeGVkKDApICsgJyUnO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicXVpcDpcIiArIHRoaXMuaWQgKyBcIjpwcm9ncmVzc1wiLCBwcm9ncmVzcyk7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJxdWlwOlwiICsgdGhpcy5pZCArIFwiOnBvc2l0aW9uXCIsIHRoaXMucG9zaXRpb24udG9GaXhlZCgwKSk7XG4gICAgICAgICAgICAgICAgbW9kZWwuc2V0KHsncHJvZ3Jlc3MnOiBwcm9ncmVzc30pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uZmluaXNoOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJTb3VuZDsgZmluaXNoZWQgcGxheWluZzogXCIgKyB0aGlzLmlkKTtcblxuICAgICAgICAgICAgICAgIC8vIHN0b3JlIGNvbXBsZXRpb24gaW4gYnJvd3NlclxuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicXVpcDpcIiArIHRoaXMuaWQgKyBcIjpwcm9ncmVzc1wiLCAnMTAwJScpO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicXVpcDpcIiArIHRoaXMuaWQgKyBcIjpwb3NpdGlvblwiLCB0aGlzLmR1cmF0aW9uLnRvRml4ZWQoMCkpO1xuICAgICAgICAgICAgICAgIG1vZGVsLnNldCh7J3Byb2dyZXNzJzogJzEwMCUnfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBUT0RPOiB1bmxvY2sgc29tZSBzb3J0IG9mIGFjaGlldmVtZW50IGZvciBmaW5pc2hpbmcgdGhpcyB0cmFjaywgbWFyayBpdCBhIGRpZmYgY29sb3IsIGV0Y1xuICAgICAgICAgICAgICAgIC8vIFRPRE86IHRoaXMgaXMgYSBnb29kIHBsYWNlIHRvIGZpcmUgYSBob29rIHRvIGEgcGxheWJhY2sgbWFuYWdlciB0byBtb3ZlIG9udG8gdGhlIG5leHQgYXVkaW8gY2xpcFxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH1cbn1cbiIsImltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcbmltcG9ydCB7IFF1aXBNb2RlbCwgUXVpcFZpZXcsIFF1aXBzIH0gZnJvbSAnLi9xdWlwLWNvbnRyb2wuanMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJlY29yZGluZ3NMaXN0IGV4dGVuZHMgQmFja2JvbmUuVmlldyB7XG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgc291bmRNYW5hZ2VyLnNldHVwKHtcbiAgICAgICAgICAgIGRlYnVnTW9kZTogdHJ1ZSxcbiAgICAgICAgICAgIHVybDogJy9hc3NldHMvc3dmLycsXG4gICAgICAgICAgICBwcmVmZXJGbGFzaDogZmFsc2UsXG4gICAgICAgICAgICBvbnJlYWR5OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJzb3VuZE1hbmFnZXIgcmVhZHlcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgICQoJy5xdWlwJykuZWFjaChlbGVtID0+IHtcbiAgICAgICAgICAgIHZhciB2aWV3ID0gbmV3IFF1aXBWaWV3KHtcbiAgICAgICAgICAgICAgICBlbDogZWxlbSxcbiAgICAgICAgICAgICAgICBtb2RlbDogbmV3IFF1aXBNb2RlbCh7cHJvZ3Jlc3M6IDB9KVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIFF1aXBzLmFkZCh2aWV3Lm1vZGVsKTtcbiAgICAgICAgICAgIHZpZXcucmVuZGVyKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIHByb2Nlc3MgYWxsIHRpbWVzdGFtcHNcbiAgICAgICAgdmFyIHZhZ3VlVGltZSA9IHJlcXVpcmUoJ3ZhZ3VlLXRpbWUnKTtcbiAgICAgICAgdmFyIG5vdyA9IG5ldyBEYXRlKCk7XG5cbiAgICAgICAgJChcInRpbWVbZGF0ZXRpbWVdXCIpLmVhY2goZnVuY3Rpb24gZ2VuZXJhdGVWYWd1ZURhdGUoZWxlKSB7XG4gICAgICAgICAgICBlbGUudGV4dENvbnRlbnQgPSB2YWd1ZVRpbWUuZ2V0KHtmcm9tOiBub3csIHRvOiBuZXcgRGF0ZShlbGUuZ2V0QXR0cmlidXRlKCdkYXRldGltZScpKX0pO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmxpc3RlblRvKFF1aXBzLCAnYWRkJywgdGhpcy5xdWlwQWRkZWQpO1xuICAgIH1cblxuICAgIHF1aXBBZGRlZChxdWlwKSB7XG4gICAgfVxufVxuXG4iLCJpbXBvcnQgQmFja2JvbmUgZnJvbSAnYmFja2JvbmUnXG5pbXBvcnQgU291bmRQbGF5ZXIgZnJvbSAnLi9hdWRpby1wbGF5ZXIuanMnXG5cbi8qKlxuICogUXVpcFxuICogUGxheXMgYXVkaW8gYW5kIHRyYWNrcyBwb3NpdGlvblxuICovXG5cbmNsYXNzIFF1aXBNb2RlbCBleHRlbmRzIEJhY2tib25lLk1vZGVsIHtcbiAgICBkZWZhdWx0cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGlkOiAwLCAvLyBndWlkXG4gICAgICAgICAgICBwcm9ncmVzczogMCwgLy8gWzAtMTAwXSBwZXJjZW50YWdlXG4gICAgICAgICAgICBwb3NpdGlvbjogMCwgLy8gbXNlY1xuICAgICAgICAgICAgZHVyYXRpb246IDAsIC8vIG1zZWNcbiAgICAgICAgICAgIGlzUHVibGljOiBmYWxzZVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgfVxuXG4gICAgc2F2ZShhdHRyaWJ1dGVzKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUXVpcCBNb2RlbCBzYXZpbmcgdG8gbG9jYWxTdG9yYWdlXCIpO1xuICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSh0aGlzLmlkLCBKU09OLnN0cmluZ2lmeSh0aGlzLnRvSlNPTigpKSk7XG4gICAgfVxuXG4gICAgZmV0Y2goKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUXVpcCBNb2RlbCBsb2FkaW5nIGZyb20gbG9jYWxTdG9yYWdlXCIpO1xuICAgICAgICB0aGlzLnNldChKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKHRoaXMuaWQpKSk7XG4gICAgfVxuXG4gICAgdXBkYXRlUHJvZ3Jlc3MoKSB7XG4gICAgICAgIHRoaXMuc2V0KHtcbiAgICAgICAgICAgIHByb2dyZXNzOiAoZHVyYXRpb24gPiAwID8gcG9zaXRpb24gLyBkdXJhdGlvbiA6IDApLnRvRml4ZWQoMCkgKyBcIiVcIlxuICAgICAgICB9KTtcbiAgICB9XG59XG5cbmNsYXNzIFF1aXBWaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlldyB7XG4gICAgZGVmYXVsdHMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBxdWlwSWQ6IDBcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGV2ZW50cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIFwiY2xpY2sgLmRlc2NyaXB0aW9uIC5sb2NrLWluZGljYXRvclwiOiBcInRvZ2dsZVB1YmxpY1wiLFxuICAgICAgICAgICAgXCJjbGljayAucXVpcC1wbGF5ZXJcIjogXCJ0b2dnbGVcIlxuICAgICAgICB9XG4gICAgfVxuXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy90aGlzLm1vZGVsLnZpZXcgPSB0aGlzO1xuICAgICAgICB0aGlzLnF1aXBJZCA9IHRoaXMuJGVsLmRhdGEoXCJxdWlwSWRcIik7XG5cbiAgICAgICAgdmFyIHByb2dyZXNzID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJxdWlwOlwiICsgdGhpcy5xdWlwSWQgKyBcIjpwcm9ncmVzc1wiKTtcbiAgICAgICAgdmFyIHBvc2l0aW9uID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJxdWlwOlwiICsgdGhpcy5xdWlwSWQgKyBcIjpwb3NpdGlvblwiKTtcblxuICAgICAgICAvLyB1cGRhdGUgdmlzdWFscyB0byBpbmRpY2F0ZSBwbGF5YmFjayBwcm9ncmVzc1xuICAgICAgICB0aGlzLm1vZGVsLm9uKCdjaGFuZ2U6cHJvZ3Jlc3MnLCBmdW5jdGlvbiAobW9kZWwsIHByb2dyZXNzKSB7XG4gICAgICAgICAgICAkKFwiZGl2W2RhdGEtcXVpcC1pZD0nXCIgKyB0aGlzLnF1aXBJZCArIFwiJ10gLnByb2dyZXNzLWJhclwiKS5jc3MoXCJ3aWR0aFwiLCBwcm9ncmVzcyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMucHVibGljTGluayA9ICcvdS8nICsgdGhpcy5xdWlwSWQ7XG5cbiAgICAgICAgdGhpcy5tb2RlbC5zZXQoe1xuICAgICAgICAgICAgJ2lkJzogdGhpcy5xdWlwSWQsXG4gICAgICAgICAgICAncHJvZ3Jlc3MnOiBwcm9ncmVzcyxcbiAgICAgICAgICAgICdwb3NpdGlvbic6IHBvc2l0aW9uLFxuICAgICAgICAgICAgJ2lzUHVibGljJzogdGhpcy4kZWwuZGF0YShcImlzUHVibGljXCIpID09ICdUcnVlJyxcbiAgICAgICAgICAgICdpc01pbmUnOiB0aGlzLiRlbC5kYXRhKFwiaXNNaW5lXCIpID09ICdUcnVlJ1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBvbmx5IHJlZHJhdyB0ZW1wbGF0ZSBvbiBkYXRhIGNoYW5nZVxuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMubW9kZWwsIFwiY2hhbmdlXCIsIHRoaXMucmVuZGVyKTtcbiAgICAgICAgLy90aGlzLm1vZGVsLm9uKCdjaGFuZ2U6aXNQdWJsaWMnLCB0aGlzLnJlbmRlciwgdGhpcyk7XG4gICAgICAgIC8vdGhpcy5tb2RlbC5vbignY2hhbmdlOmlzTWluZScsIHRoaXMucmVuZGVyLCB0aGlzKTtcbiAgICB9XG5cbiAgICB0b2dnbGVQdWJsaWMoZXYpIHtcbiAgICAgICAgdmFyIG5ld1N0YXRlID0gIXRoaXMubW9kZWwuZ2V0KCdpc1B1YmxpYycpO1xuICAgICAgICB0aGlzLm1vZGVsLnNldCh7J2lzUHVibGljJzogbmV3U3RhdGV9KTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcInRvZ2dsaW5nIG5ldyBwdWJsaXNoZWQgc3RhdGU6IFwiICsgbmV3U3RhdGUpO1xuXG4gICAgICAgICQuYWpheCh7XG4gICAgICAgICAgICB1cmw6ICcvcmVjb3JkaW5nL3B1Ymxpc2gvJyArIHRoaXMucXVpcElkLFxuICAgICAgICAgICAgbWV0aG9kOiAncG9zdCcsXG4gICAgICAgICAgICBkYXRhOiB7aXNQdWJsaWM6IG5ld1N0YXRlfSxcbiAgICAgICAgICAgIGNvbXBsZXRlOiBmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwICYmIHJlc3Auc3RhdHVzID09ICdzdWNjZXNzJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBjaGFuZ2Ugc3VjY2Vzc2Z1bFxuICAgICAgICAgICAgICAgIH0gZWxzZSB7ICAgLy8gY2hhbmdlIGZhaWxlZFxuICAgICAgICAgICAgICAgICAgICAvLyBUT0RPOiBhZGQgdmlzdWFsIHRvIGluZGljYXRlIGNoYW5nZS1mYWlsdXJlXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIlRvZ2dsaW5nIHJlY29yZGluZyBwdWJsaWNhdGlvbiBzdGF0ZSBmYWlsZWQ6XCIpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmRpcihyZXNwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB0b2dnbGUoZXZlbnQpIHtcbiAgICAgICAgdmFyIHF1aXBJZCA9ICQodGhpcy5lbCkuZGF0YShcInF1aXBJZFwiKTtcbiAgICAgICAgdmFyIHVybCA9ICcvcmVjb3JkaW5ncy8nICsgcXVpcElkICsgJy5vZ2cnO1xuICAgICAgICBjb25zb2xlLmxvZyhcInRvZ2dsaW5nIHJlY29yZGluZyBwbGF5YmFjazogXCIgKyB1cmwpO1xuXG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcblxuICAgICAgICB2YXIgcmVzdW1lUG9zaXRpb24gPSBwYXJzZUludCh0aGF0Lm1vZGVsLmdldCgncG9zaXRpb24nKSB8fCAwKTtcbiAgICAgICAgY29uc29sZS5sb2coJ3Jlc3VtZVBvc2l0aW9uID0gJyArIHJlc3VtZVBvc2l0aW9uKTtcblxuICAgICAgICAvLyBjaGVjayBpZiBzb3VuZCBpcyBhbHJlYWR5IGJ1ZmZlcmVkXG4gICAgICAgIHZhciBleGlzdGluZ1F1aXAgPSBzb3VuZE1hbmFnZXIuZ2V0U291bmRCeUlkKHF1aXBJZCk7XG4gICAgICAgIGlmIChleGlzdGluZ1F1aXApIHtcbiAgICAgICAgICAgIC8vIHJlc3VtZSBleGlzdGluZyBhdWRpbyBjbGlwXG4gICAgICAgICAgICBpZiAoIWV4aXN0aW5nUXVpcC5wYXVzZWQgJiYgZXhpc3RpbmdRdWlwLnBsYXlTdGF0ZSkge1xuICAgICAgICAgICAgICAgIHNvdW5kTWFuYWdlci5wYXVzZUFsbCgpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicGF1c2luZyBleGlzdGluZyBjbGlwXCIpO1xuXG4gICAgICAgICAgICAgICAgJCh0aGlzLmVsKVxuICAgICAgICAgICAgICAgICAgICAuZmluZCgnLmZhLXBsYXktY2lyY2xlJylcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdmYS1wYXVzZScpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnZmEtcGxheS1jaXJjbGUnKTtcblxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzb3VuZE1hbmFnZXIucGF1c2VBbGwoKTtcblxuICAgICAgICAgICAgICAgIGlmICghZXhpc3RpbmdRdWlwLnBsYXlTdGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICBleGlzdGluZ1F1aXAuc2V0UG9zaXRpb24oMCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZXhpc3RpbmdRdWlwLnBsYXkoKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInJlc3VtaW5nIGV4aXN0aW5nIGNsaXBcIik7XG5cbiAgICAgICAgICAgICAgICAkKHRoaXMuZWwpXG4gICAgICAgICAgICAgICAgICAgIC5maW5kKCcuZmEtcGxheS1jaXJjbGUnKVxuICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2ZhLXBsYXktY2lyY2xlJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdmYS1wYXVzZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGV4aXN0aW5nUXVpcClcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICBzb3VuZE1hbmFnZXIucGF1c2VBbGwoKTtcblxuICAgICAgICB0aGlzLm1vZGVsLnVybCA9IHVybDtcblxuICAgICAgICAvLyB3b3VsZCBiZSBiZXR0ZXIgaWYgdGhpcyB3YXMgYSBjb21wbGV0ZWx5IHNpbmdsZS1wYWdlIGFqYXggYXBwIGFuZCB0aGVyZSB3YXMgYSBwZXJzaXN0ZW50IGF1ZGlvIHBsYXllclxuICAgICAgICBTb3VuZFBsYXllci5jcmVhdGUodGhpcy5tb2RlbCk7XG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcInF1aXAtY29udHJvbCByZWRyYXdcIik7XG5cbiAgICAgICAgdmFyIHJlc3VsdCA9ICQodGhpcy5lbCkuZmluZCgnLmNvbnRyb2xzJykuZmluZCgnLmxvY2staW5kaWNhdG9yJyk7XG4gICAgICAgIGlmIChyZXN1bHQpXG4gICAgICAgICAgICByZXN1bHQucmVtb3ZlKCk7XG5cbiAgICAgICAgaWYgKHRoaXMubW9kZWwuZ2V0KCdpc01pbmUnKSkge1xuICAgICAgICAgICAgdmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyk7XG4gICAgICAgICAgICB2YXIgaHRtbCA9IF8udGVtcGxhdGUoJChcIiNxdWlwLWNvbnRyb2wtcHJpdmFjeVwiKS5odG1sKCkpO1xuXG4gICAgICAgICAgICAkKHRoaXMuZWwpLmZpbmQoXCIuY29udHJvbHNcIikucHJlcGVuZChodG1sKHtcbiAgICAgICAgICAgICAgICBpc1B1YmxpYzogdGhpcy5tb2RlbC5nZXQoJ2lzUHVibGljJyksXG4gICAgICAgICAgICAgICAgcHVibGljTGluazogdGhpcy5wdWJsaWNMaW5rXG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmNsYXNzIFF1aXBMaXN0IGV4dGVuZHMgQmFja2JvbmUuQ29sbGVjdGlvbiB7XG4gICAgY29uc3RydWN0b3Iob3B0aW9ucykge1xuICAgICAgICBzdXBlcihvcHRpb25zKTtcbiAgICAgICAgdGhpcy5tb2RlbCA9IFF1aXBNb2RlbDtcbiAgICB9XG59XG5cbnZhciBRdWlwcyA9IG5ldyBRdWlwTGlzdCgpO1xuXG5leHBvcnQgeyBRdWlwTW9kZWwsIFF1aXBWaWV3LCBRdWlwTGlzdCwgUXVpcHMgfTtcbiJdfQ==
