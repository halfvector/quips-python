import Backbone from 'backbone'

class ListenState extends Backbone.Model {
    defaults() {
        return {
            audioId: 0, // id string of quip
            progress: 0, // [0-100]
        }
    }

    constructor(props) {
        super(props);
        this.urlRoot = '/listen';
    }
}

class ListenStateCollection extends Backbone.Collection {
    constructor(opts) {
        super(opts);
        this.model = ListenState;
        this.url = "/listen";
    }
}

export { ListenState, ListenStateCollection }
