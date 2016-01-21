import Backbone from 'backbone'
import template from './CreateStream.hbs'
import 'backbone-bindings'
import 'backbone.epoxy'

class StreamModel extends Backbone.Model {
    defaults() {
        return {
            streamName: "",
            privacy: "public",
            streams: [
                {
                    id: 1,
                    name: "stream 1",
                },
                {
                    id: 2,
                    name: "stream 2",
                }
            ]
        }
    }

    get computeds() {
        return {
            canSubmit: function() {
                return this.get('streamName') != "";
            }
        }
    }
}

export default class CreateStreamView extends Backbone.Epoxy.View {
    initialize() {
        this.model = new StreamModel();
        this.render();
        this.$el.addClass("stream-details");
    }

    get bindings() {
        return {
            "[name=streamName]": "value:streamName",
            "[name=privacy]": "checked:privacy"
        }
    }

    get events() {
        return {
            "click .m-create-stream button": "onCreateStream",
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
        this.$el.html(template(this.model.attributes));
    }

}
