import vagueTime from 'vague-time'
import Backbone from 'backbone'
import _ from 'underscore'
import { AudioPlayer } from '../audio-player.js'
import { QuipModel } from '../models/Quip'
import template from '../../templates/recording_item.hbs'
import app from '../app'

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
            "click .quip-actions a[action=delete]": "delete",
            "click .quip-player": "togglePlayback"
        }
    }

    get tagName() {
        return 'div';
    }

    delete() {
        this.model.destroy()
            .then(() => window.app.router.home() , () => console.log("Delete failed"));
    }

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
        var id = this.model.get("id");

        AudioPlayer.on("/" + id + "/paused", () => this.onPause(), this);
        AudioPlayer.on("/" + id + "/playing", () => this.onPlay(), this);
        AudioPlayer.on("/" + id + "/progress", (update) => this.onProgress(update), this);

        this.render();

        // update visuals to indicate playback progress
        this.model.on('change:progress', (model, progress) => {
            $(this.el).find(".progress-bar").css("width", progress + "%");
        });

        this.model.on('change:isPublic', (model) => {
            this.render();
        });
    }

    shutdown() {
        AudioPlayer.off(null, null, this);
        this.model.off();
    }

    togglePublic(ev) {
        var newState = !this.model.get('isPublic');
        this.model.set({'isPublic': newState});
        this.model.save();
    }

    togglePlayback(event) {
        AudioPlayer.trigger("toggle", this.model.attributes);
    }

    render() {
        var viewModel = this.model.toJSON();
        viewModel.vagueTime = vagueTime.get({from: new Date(), to: new Date(this.model.get("timestamp"))});

        this.$el.html(template(viewModel));

        this.$el.find(".progress-bar").css("width", this.model.get('progress') + "%");

        return this;
    }
}

export { QuipModel, QuipView };
