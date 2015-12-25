import Backbone from 'backbone'
import _ from 'underscore'
import Handlebars from 'handlebars'

import template from '../templates/changelog.hbs'

export class ChangelogView extends Backbone.View {
    initialize() {
        console.log("Initializing changelog view");
        this.render();
    }

    render() {
        console.log("Rendering changelog view");
        this.$el.html(template());
    }
}
