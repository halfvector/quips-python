import Backbone from 'backbone'
import _ from 'underscore'
import { AudioPlayer } from './audio-player.js'
import { QuipModel } from './models/Quip'




//class AudioPlayerEvents extends Backbone.Events {
//
//}

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

        AudioPlayer.on("/" + id + "/paused", () => this.onPause(), this);
        AudioPlayer.on("/" + id + "/playing", () => this.onPlay(), this);
        AudioPlayer.on("/" + id + "/progress", (update) => this.onProgress(update), this);

        this.render();

        $(this.el).find(".progress-bar").css("width", this.model.get('progress') + "%");

        // update visuals to indicate playback progress
        this.model.on('change:progress', (model, progress) => {
            $(this.el).find(".progress-bar").css("width", progress + "%");
        });

        //this.on(this.model, "change", this.render);
    }

    shutdown() {
        AudioPlayer.off(null, null, this);
        this.model.off();
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

export { QuipModel, QuipView, QuipList, Quips };
