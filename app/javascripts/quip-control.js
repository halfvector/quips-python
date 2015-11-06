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

class QuipView extends Backbone.View {
    defaults() {
        return {
            quipId: 0
        }
    }

    events() {
        return {
            "click .description .lock-indicator": "togglePublic",
            "click .quip-player": "toggle"
        }
    }

    initialize() {
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

    toggle(event) {
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

                $(this.el)
                    .find('.fa-play-circle')
                    .removeClass('fa-pause')
                    .addClass('fa-play-circle');

            } else {
                soundManager.pauseAll();

                if (!existingQuip.playState) {
                    existingQuip.setPosition(0);
                }

                existingQuip.play();
                console.log("resuming existing clip");

                $(this.el)
                    .find('.fa-play-circle')
                    .removeClass('fa-play-circle')
                    .addClass('fa-pause');
            }
        }

        if (existingQuip)
            return;

        soundManager.pauseAll();

        this.model.url = url;

        // would be better if this was a completely single-page ajax app and there was a persistent audio player
        SoundPlayer.create(this.model);
    }

    render() {
        console.log("quip-control redraw");

        var result = $(this.el).find('.controls').find('.lock-indicator');
        if (result)
            result.remove();

        if (this.model.get('isMine')) {
            var _ = require('underscore');
            var html = _.template($("#quip-control-privacy").html());

            $(this.el).find(".controls").prepend(html({
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

export { QuipModel, QuipView, QuipList, Quips };
