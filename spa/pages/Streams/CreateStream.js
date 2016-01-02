import Backbone from 'backbone'
import template from './CreateStream.hbs'

export default class CreateStreamView extends Backbone.View {
    defaults() {
        return {

        }
    }

    initialize() {
        this.render();
    }

    events() {
        return {
            "click .m-create-stream button": "onCreateStream",
        }
    }

    onCreateStream() {

    }

    render() {
        this.$el.html(template());
    }

}
