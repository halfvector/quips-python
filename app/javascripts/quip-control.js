/**
 * Quip
 * Plays audio clips
 * Manages their state tracking
 */
App.Loaders.QuipController = (function(){
    'use strict';

    App.Models.Quip = Backbone.Model.extend({
        default: {
            title: '',
            position: 0,
            duration: 0,
            progress: 0
        },

        initialize: function() {
        },

        save: function(attributes) {
            console.log("Quip Model saving to localStorage");
            localStorage.setItem(this.id, JSON.stringify(this.toJSON()));
        },

        fetch: function() {
            console.log("Quip Model loading from localStorage");
            this.set(JSON.parse(localStorage.getItem(this.id)));
        },

        id: 0, // guid
        progress: 0, // percentage
        position: 0, // msec
        duration: 0, // msec

        updateProgress: function() {
            this.set({
                progress: (duration > 0 ? position / duration : 0).toFixed(0) + "%"
            });
        }
    });

    App.Collections.Quips = Backbone.Collection.extend({
        model: App.Models.Quip
    });

    App.Quips = new App.Collections.Quips();

    App.CurrentQuipAudio = null;

    App.Views.Quip = Backbone.View.extend({

        el: '.m-quip',

        quipId: 0,

        initialize: function(options) {
            var $this = this;

            $this.el = options.el;
            $this.model.view = $this;
            $this.quipId = $($this.el).data("quipId");

            //console.log("Initializing Quip Controller: id=" + quipId);

            var progress = localStorage.getItem("quip:" + $this.quipId + ":progress");
            var position = localStorage.getItem("quip:" + $this.quipId + ":position");

            this.model.on('change:progress', function(model, progress) {
                $("div[data-quip-id='" + $this.quipId + "'] .progress-bar").css("width", progress);
            });

            this.model.set({'id' : $this.quipId, 'progress':progress, 'position':position});
        },

        events: {
            "click .description" : "toggle"
        },

//        bindings: {
//            "csswidth .progress-bar" : "progress"
//        },

        toggle: function(event) {
            var quipId = $(this.el).data("quipId");
            var url = '/recordings/' + quipId + '.ogg';
            console.log("toggling recording: " + url);

            var that = this;

            var resumePosition = that.model.get('position');
            if(typeof resumePosition == "undefined")
                resumePosition = 0;
            console.log('resumePosition = ' + resumePosition);

            // check if sound is already buffered
            var existingQuip = soundManager.getSoundById(quipId);
            if( existingQuip ) {

                // resume existing audio clip
                if(!existingQuip.paused && existingQuip.playState) {
                    soundManager.pauseAll();
                    console.log("pausing existing clip");
                } else {
                    soundManager.pauseAll();

                    if(!existingQuip.playState) {
                        existingQuip.setPosition(0);
                    }

                    existingQuip.play();
                    console.log("resuming existing clip");
                }
            }

            if(existingQuip)
                return;

            soundManager.pauseAll();

            App.CurrentQuipAudio = soundManager.createSound({
                id: quipId,
                url: url,
                volume: 100,
                autoLoad: true,
                autoPlay: false,
                from: resumePosition,
                onload: function() {
                    //console.log("loaded: " + url);
                    console.log('starting playback at@ ' + resumePosition);
                    this.setPosition(resumePosition);
                    this.play();
                },
                onfinish: function() {
                    console.log("finished playing: " + this.id);
                    // TODO: perfect place to fire a hook to a playback manager to move onto the next song
                },
                whileloading: function() {
                    //console.log("loaded: " + this.bytesLoaded + " of " + this.bytesTotal);
                },
                whileplaying: function() {
                    //console.log("playing: " + this.position + " of " + this.duration);
                    var progress = this.duration > 0 ? 100 * this.position / this.duration : 0;
                    progress = progress.toFixed(0) + "%";
                    that.model.set({'progress' : progress});
                    localStorage.setItem("quip:" + this.id + ":progress", progress);
                    localStorage.setItem("quip:" + this.id + ":position", this.position.toFixed(0));
                }
            });
        },

        render: function() {
            //$(this.el).html(this.template());
            return this.bindModel();
        }

    });
});