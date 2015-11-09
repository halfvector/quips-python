import Backbone from 'backbone'
import { QuipModel, QuipView, Quips, AudioPlayerView } from './quip-control.js'

export default class RecordingsList extends Backbone.View {
    initialize() {

        var audioPlayer = new AudioPlayerView();

        soundManager.setup({
            debugMode: true,
            url: '/assets/swf/',
            preferFlash: false,
            onready: function () {
                console.log("soundManager ready");
            }
        });

        $('.quip').each(elem => {
            var view = new QuipView({
                el: elem,
                model: new QuipModel({progress: 0})
            });

            Quips.add(view.model);
            view.render();
        });

        // process all timestamps
        var vagueTime = require('vague-time');
        var now = new Date();

        $("time[datetime]").each(function generateVagueDate(ele) {
            ele.textContent = vagueTime.get({from: now, to: new Date(ele.getAttribute('datetime'))});
        });

        this.listenTo(Quips, 'add', this.quipAdded);
    }

    quipAdded(quip) {
    }
}

