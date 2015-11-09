import Backbone from 'backbone'
import SoundPlayer from './audio-player.js'

/**
 * Quip
 * Plays audio and tracks position
 */

class QuipModel extends Backbone.Model {
    defaults() {
        return {
            id: 0, // guid
            progress: 0, // [0-100] percentage
            position: 0, // msec
            duration: 0, // msec
            isPublic: false
        }
    }

    constructor() {
        super();
    }

    save(attributes) {
        console.log("Quip Model saving to localStorage");
        localStorage.setItem(this.id, JSON.stringify(this.toJSON()));
    }

    fetch() {
        console.log("Quip Model loading from localStorage");
        this.set(JSON.parse(localStorage.getItem(this.id)));
    }

    updateProgress() {
        this.set({
            progress: (duration > 0 ? position / duration : 0).toFixed(0) + "%"
        });
    }
}

class AudioPlayerEvents extends Backbone.Model {
    getPauseUrl(id) {
        var url = "/" + id + "/paused";
        console.log("pause url" + url);
        return url;
    }

    onPause(id, callback) {
        this.on(this.getPauseUrl(id), callback);
    }

    triggerPause(id) {
        this.trigger(this.getPauseUrl(id));
    }
}

var AudioPlayer = new AudioPlayerEvents();

//class AudioPlayerEvents extends Backbone.Events {
//
//}

class AudioPlayerView extends Backbone.View {
    defaults() {
        return {
            audioPlayer: null,
            quipModel: null
        }
    }

    initialize() {
        console.log("AudioPlayerView initialized");
        this.audioPlayer = document.getElementById("audio-player");
        AudioPlayer.on("toggle", (quip) => this.onToggle(quip));
    }

    close() {
        this.stopPeriodicTimer();
    }

    startPeriodicTimer() {
        if(this.periodicTimer == null) {
            this.periodicTimer = setInterval(() => this.checkProgress(), 100);
        }
    }

    stopPeriodicTimer() {
        if(this.periodicTimer != null) {
            clearInterval(this.periodicTimer);
            this.periodicTimer = null;
        }
    }

    checkProgress() {
        if(this.quipModel == null) {
            return;
        }

        var progressUpdate = {
            currentTime: this.audioPlayer.currentTime,
            duration: this.audioPlayer.duration,
            progress: 100 * this.audioPlayer.currentTime / this.audioPlayer.duration
        }

        AudioPlayer.trigger("/" + this.quipModel.id + "/progress", progressUpdate);
    }

    onToggle(quipModel) {
        this.quipModel = quipModel;

        if(!this.trackIsLoaded(quipModel.url)) {
            this.loadTrack(quipModel.url);
        }

        if(!this.trackIsLoaded(quipModel.url)) {
            return;
        }

        if(this.audioPlayer.paused) {
            this.play(quipModel);
        } else {
            this.pause(quipModel);
        }
    }

    play(quipModel) {
        this.audioPlayer.play();
        AudioPlayer.trigger("/" + quipModel.id + "/playing");
        this.startPeriodicTimer();
    }

    pause(quipModel) {
        this.audioPlayer.pause();
        AudioPlayer.trigger("/" + quipModel.id + "/paused");
        this.stopPeriodicTimer();
    }

    trackIsLoaded(url) {
        return ~this.audioPlayer.src.indexOf(url);
    }

    loadTrack(url) {
        console.log("Loading audio: " + url);
        this.audioPlayer.src = url;
    }
}

class QuipView extends Backbone.View {
    defaults() {
        return {
            quipId: 0,
            audioPlayer: null
        }
    }

    events() {
        return {
            "click .quip-actions .lock-indicator": "togglePublic",
            "click .quip-player": "toggle"
        }
    }

    onPause() {
        console.log("QuipView; paused");

        $(this.el)
            .find('.fa-play')
            .removeClass('fa-play')
            .addClass('fa-pause');
    }

    onPlay() {
        console.log("QuipView; playing");

        $(this.el)
            .find('.fa-pause')
            .removeClass('fa-pause')
            .addClass('fa-play');
    }

    onProgress(progressUpdate) {
        this.model.set({'progress': progressUpdate.progress});
    }

    initialize() {
        this.quipId = this.$el.data("quipId");
        this.publicLink = '/u/' + this.quipId;

        AudioPlayer.on("/" + this.quipId + "/paused", () => this.onPause());
        AudioPlayer.on("/" + this.quipId + "/playing", () => this.onPlay());
        AudioPlayer.on("/" + this.quipId + "/progress", (update) => this.onProgress(update));

        this.loadModel();

        // update visuals to indicate playback progress
        this.listenTo(this.model, 'change:progress', (model, progress) => {
            $(this.el).find(".progress-bar").css("width", progress + "%");
        });

        this.listenTo(this.model, "change", this.render);
    }

    loadModel() {
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

    togglePublic(ev) {
        var newState = !this.model.get('isPublic');
        this.model.set({'isPublic': newState});

        console.log("toggling new published state: " + newState);

        $.ajax({
            url: '/recording/publish/' + this.quipId,
            method: 'post',
            data: {isPublic: newState},
            complete: function (resp) {
                if (resp && resp.status == 'success') {
                    // change successful
                } else {   // change failed
                    // TODO: add visual to indicate change-failure
                    console.warn("Toggling recording publication state failed:");
                    console.dir(resp);
                }
            }
        });

        return false;
    }

    /**
     * Audio element fields
     * .duration (seconds)
     * .onprogress
     * .onplay
     * .onpause
     * .paused
     * .volume
     * .ended
     * .currentTime
     */

    toggle(event) {
        var quipId = $(this.el).data("quipId");
        this.model.url = '/recordings/' + quipId + '.ogg';

        AudioPlayer.trigger("toggle", this.model);
    }

    render() {
        //this.$el.html(_.template($('#quip-template').html()));
        //return this;
        var result = $(this.el).find('.quip-actions').find('.lock-indicator');
        if (result)
            result.remove();

        if (this.model.get('isMine')) {
            var _ = require('underscore');
            var html = _.template($("#quip-control-privacy").html());

            $(this.el).find(".quip-actions").append(html({
                isPublic: this.model.get('isPublic'),
                publicLink: this.publicLink
            }));
        }
    }
}

class QuipList extends Backbone.Collection {
    constructor(options) {
        super(options);
        this.model = QuipModel;
    }
}

var Quips = new QuipList();

export { QuipModel, QuipView, QuipList, Quips, AudioPlayerView };
