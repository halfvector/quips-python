import Backbone from 'backbone'
import template from './StreamList.hbs'
import 'backbone-bindings'
import 'backbone.epoxy'

class StreamModel extends Backbone.Model {
    defaults() {
        return {
            name: "",
            description: "",
            isPublic: true
        }
    }

    initialize() {
        this.urlRoot = "/api/streams";
    }

    get computeds() {
        return {
            canSubmit: function() {
                return this.get('name') != "";
            }
        }
    }
}

export default class StreamList extends Backbone.Epoxy.View {
    initialize() {
        this.model = new StreamModel();
        this.render();
        this.$el.addClass("stream-details");
    }

    get bindings() {
        return {
            "[name=name]": "value:name",
            "[name=isPublic]": "checked:isPublic"
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
        this.model.save();

        return false;
    }

    render() {
        this.$el.html(template(this.model.attributes));
    }

}
