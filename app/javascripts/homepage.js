import Backbone from 'backbone'
import vagueTime from 'vague-time'
import { QuipView, Quips, AudioPlayerView } from './quip-control.js'
import { QuipModel, MyQuipCollection } from './models/Quip'

export default class RecordingsList extends Backbone.View {
    initialize() {
        var audioPlayer = new AudioPlayerView({el: '#audio-player'});

        // load recordings
        new MyQuipCollection().fetch().then(quips => this.onQuipsLoaded(quips))

        return;

        $('.quip').each(elem => {
            var view = new QuipView({
                el: elem,
                model: new QuipModel()
            });

            Quips.add(view.model);
            view.render();
        });

        // process all timestamps
        var vagueTime = require('vague-time');
        var now = new Date();

        $("time[datetime]").each((idx, ele) => {
            ele.textContent = vagueTime.get({from: now, to: new Date(ele.getAttribute('datetime'))});
        });

        this.listenTo(Quips, 'add', this.quipAdded);
    }

    onQuipsLoaded(quips) {
        console.log("loaded quips", quips);

        for( var quip of quips) {
            var quipView = new QuipView({model: new QuipModel(quip)});
            this.$el.append(quipView.el);
        }
    }

    quipAdded(quip) {
    }
};

