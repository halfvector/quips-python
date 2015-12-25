import Backbone from 'backbone'
import _ from 'underscore'
import Handlebars from 'handlebars'

import template from '../templates/header-nav.hbs'

export class HeaderNavView extends Backbone.View {
    initialize(user) {
        this.model = user;
        this.render();
    }

    render() {
        console.log("Rendering header nav view");
        this.$el.html(template(this.model));
    }
}
