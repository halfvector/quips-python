import Backbone from 'backbone'
import template from './StreamDetails.hbs'
import 'backbone-bindings'
import 'backbone.epoxy'
import { QuipModel, MyQuipCollection } from '../../models/Quip'
import QuipView from '../../partials/QuipView.js'

export default class StreamDetailsView extends Backbone.Epoxy.View {
    initialize(id) {
        this.render();
        this.$el.addClass("stream-details");
        new MyQuipCollection().fetch().then(quips => this.onQuipsLoaded(quips))
    }

    onQuipsLoaded(quips) {
        this.quipViews = [];
        var list = this.$el.find('.g-quips-list');

        for (var quip of quips) {
            var quipView = new QuipView({model: new QuipModel(quip)});
            this.quipViews.push(quipView);
            list.append(quipView.el);
        }
    }

    shutdown() {
        if (this.quipViews != null) {
            for (var quip of this.quipViews) {
                quip.shutdown();
            }
        }
    }

    get bindings() {
        return {
            //"[name=streamName]": "value:streamName",
            //"[name=privacy]": "checked:privacy"
        }
    }

    get events() {
        return {
            //"click .m-create-stream button": "onCreateStream",
        }
    }

    onCreateStream() {
        console.log("this model", this.model.attributes);

        var streamName = this.model.get("streamName");
        var privacy = this.model.get("privacy");

        console.log("Creating new stream named " + streamName + " with privacy = " + privacy);

        return false;
    }

    render() {
        this.$el.html(template());
    }

}
