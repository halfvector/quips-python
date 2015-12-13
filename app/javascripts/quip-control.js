import Backbone from 'backbone'
import _ from 'underscore'
import SoundPlayer from './audio-player.js'
import { QuipModel } from './models/Quip'


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
            position: this.audioPlayer.currentTime, // sec
            duration: this.audioPlayer.duration, // sec
            progress: 100 * this.audioPlayer.currentTime / this.audioPlayer.duration // %
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
        this.audioPlayer.currentTime = Math.floor(quipModel.position);
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
        this.audioPlayer.load();
    }
}

class QuipView extends Backbone.View {
    get defaults() {
        return {
            quipId: 0,
            audioPlayer: null
        }
    }

    get events() {
        return {
            "click .quip-actions .lock-indicator": "togglePublic",
            "click .quip-player": "togglePlayback"
        }
    }

    get tagName() { return 'div'; }

    onPause() {
        console.log("QuipView; paused");

        $(this.el)
            .find('.fa-pause')
            .removeClass('fa-pause')
            .addClass('fa-play');
    }

    onPlay() {
        console.log("QuipView; playing");

        $(this.el)
            .find('.fa-play')
            .removeClass('fa-play')
            .addClass('fa-pause');
    }

    onProgress(progressUpdate) {
        this.model.set({'position': progressUpdate.position}); // sec
        this.model.set({'duration': progressUpdate.duration}); // sec
        this.model.set({'progress': progressUpdate.progress}); // %
        this.model.throttledSave();
    }

    initialize() {
        this.template = _.template($('#quip-template').html());

        var id = this.model.get("id");

        AudioPlayer.on("/" + id + "/paused", () => this.onPause());
        AudioPlayer.on("/" + id + "/playing", () => this.onPlay());
        AudioPlayer.on("/" + id + "/progress", (update) => this.onProgress(update));

        this.render();

        $(this.el).find(".progress-bar").css("width", this.model.get('progress') + "%");

        // update visuals to indicate playback progress
        this.model.on('change:progress', (model, progress) => {
            $(this.el).find(".progress-bar").css("width", progress + "%");
        });

        //this.on(this.model, "change", this.render);
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

        this.model.save();

        return false;
    }

    togglePlayback(event) {
        AudioPlayer.trigger("toggle", this.model.attributes);
    }

    render() {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
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
