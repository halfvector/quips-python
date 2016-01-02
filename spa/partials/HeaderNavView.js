import Backbone from 'backbone'
import template from './HeaderNavView.hbs'

export default class HeaderNavView extends Backbone.View {
    initialize(user) {
        this.model = user;
        this.render();
    }

    render() {
        console.log("Rendering header nav view");
        this.$el.html(template(this.model));
    }
}
