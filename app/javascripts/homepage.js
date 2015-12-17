import Backbone from 'backbone'
import vagueTime from 'vague-time'
import { QuipView, Quips } from './quip-control.js'
import { AudioPlayer, AudioPlayerView } from './audio-player'
import { QuipModel, MyQuipCollection } from './models/Quip'

export default class RecordingsList extends Backbone.View {
    initialize() {

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

    shutdown() {
        if (this.quipViews != null) {
            for (var quip of this.quipViews) {
                quip.shutdown();
            }
        }
    }

    onQuipsLoaded(quips) {
        console.log("loaded quips", quips);

        this.quipViews = [];

        for (var quip of quips) {
            var quipView = new QuipView({model: new QuipModel(quip)});
            this.quipViews.push(quipView);
            this.$el.append(quipView.el);
        }
    }

    quipAdded(quip) {
    }

    render() {

    }
};

