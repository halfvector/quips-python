import Backbone from 'backbone'
import _ from 'underscore'
import template from './ChangelogView.hbs'

export default class ChangelogView extends Backbone.View {
    initialize() {
        console.log("Initializing changelog view");
        this.render();
    }

    render() {
        console.log("Rendering changelog view");
        this.$el.html(template());
    }
}
