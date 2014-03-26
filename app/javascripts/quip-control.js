/**
 * Quip
 * Plays audio clips
 * Manages their state tracking
 */
App.Loaders.QuipController = (function QuipControlLoader(){
    'use strict';
    
    App.Models.Quip = Backbone.Model.extend({
        default: {
            id: 0,
            progress: 0,
            position: 0,
            duration: 0,
            isPublic: false
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
        isPublic: false,

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

            this.el = options.el;
            this.model.view = this;
            this.quipId = this.$el.data("quipId");

            var progress = localStorage.getItem("quip:" + $this.quipId + ":progress");
            var position = localStorage.getItem("quip:" + $this.quipId + ":position");

            // update visuals to indicate playback progress
            this.model.on('change:progress', function(model, progress) {
                $("div[data-quip-id='" + $this.quipId + "'] .progress-bar").css("width", progress);
            });
            
            //var desc = $($this.el).find('.description')[0];
            //Hammer(desc).on("swipeleft", this.onRevealControls.bind(this));
            //Hammer(desc).on("swiperight", this.onHideControls.bind(this));

            this.model.set({
                'id' : $this.quipId,
                'progress':progress,
                'position':position,
                'isPublic':  this.$el.data("isPublic") == 'True',
                'isMine':  this.$el.data("isMine") == 'True'
            });
            
            this.model.on('change', this.render, this);
        },

        events: {
            "click .description .lock-indicator" : "togglePublic",
            "click .description" : "toggle"
        },
        
        togglePublic: function(ev) {

            var newState = !this.model.get('isPublic');
            this.model.set({'isPublic': newState});
            
            console.log("toggling new published state: " + newState);
            
            $.ajax({
                url: '/recording/publish/' + this.quipId,
                method: 'post',
                data: { isPublic: newState },
                complete: function(resp) {
                    if(resp && resp.status == 'success') {
                        // change successful
                    } else
                    {   // change failed
                        // TODO: add visual to indicate change-failure
                        console.warn("Toggling recording publication state failed:");
                        console.dir(resp);
                    }
                }
            });
            
            return false;
        },
        
        onRevealControls: function(ev) {
            ev.gesture.preventDefault();
            $(this.el).find(".controls").css("right", "100px");
            console.log("swiped left");
            
        },
        
        onHideControls: function(ev) {
            ev.gesture.preventDefault();
            $(this.el).find(".controls").css("right", "0px");
            console.log("swiped right");
        },

        toggle: function(event) {
            var quipId = $(this.el).data("quipId");
            var url = '/recordings/' + quipId + '.ogg';
            console.log("toggling recording playback: " + url);

            var that = this;

            var resumePosition = parseInt(that.model.get('position') || 0);
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

            // would be better if this was a completely single-page ajax app and there was a persistent audio player
            App.CurrentQuipAudio = soundManager.createSound({
                id: quipId,
                url: url,
                volume: 100,
                autoLoad: true,
                autoPlay: false,
                from: resumePosition,
                whileloading: function() {
                    //console.log("loaded: " + this.bytesLoaded + " of " + this.bytesTotal);
                },
                onload: function() {
                    console.log('App.CurrentQuipAudio(); starting playback at position = ' + resumePosition + '/' + this.duration);

                    if((resumePosition + 10) > this.duration) {
                        // the track is pretty much complete, loop it
                        // FIXME: this should actually happen earlier, we should know that the action will cause a rewind
                        //        and indicate the rewind visually so there is no surprise
                        resumePosition = 0;
                        console.log('App.CurrentQuipAudio(); track needed a rewind');
                    }

                    // FIXME: resume compatibility with various browsers
                    // FIXME: sometimes you resume a file all the way at the end, should loop them around
                    this.setPosition(resumePosition);
                    this.play();
                },
                whileplaying: function() {
                    var progress = (this.duration > 0 ? 100 * this.position / this.duration : 0).toFixed(0) + '%';
                    localStorage.setItem("quip:" + this.id + ":progress", progress);
                    localStorage.setItem("quip:" + this.id + ":position", this.position.toFixed(0));
                    that.model.set({'progress' : progress});
                },
                onpause: function() {
                    console.log("App.CurrentQuipAudio(); paused: " + this.id);
                    var progress = (this.duration > 0 ? 100 * this.position / this.duration : 0).toFixed(0) + '%';
                    localStorage.setItem("quip:" + this.id + ":progress", '100%');
                    localStorage.setItem("quip:" + this.id + ":position", this.duration);
                    that.model.set({'progress' : progress});
                },
                onfinish: function() {
                    console.log("App.CurrentQuipAudio(); finished playing: " + this.id);

                    // store completion in browser
                    localStorage.setItem("quip:" + this.id + ":progress", '100%');
                    localStorage.setItem("quip:" + this.id + ":position", this.duration);
                    that.model.set({'progress' : '100%'});

                    // TODO: unlock some sort of achievement for finishing this track, mark it a diff color, etc
                    // TODO: this is a good place to fire a hook to a playback manager to move onto the next audio clip
                }
            });
        },
        
        render: function() {
            var _ = require('underscore');
            
            if(this.model.get('isMine')) {
                var html = _.template($("#quip-control-privacy").html());
                $(this.el).find(".controls").html(html({ isPublic: this.model.get('isPublic') }));
            }
        }
    });
});