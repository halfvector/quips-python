class StreamModel extends Backbone.Model {
    defaults() {
        return {
            id: 0,
            name: ""
        }
    }

    constructor(opts) {
        super(opts);

        this.urlRoot = "/api/quips";

        // save listening progress at most every 3 seconds
        this.throttledSave = _.throttle(this.save, 3000);
    }
}

class MyQuipCollection extends Backbone.Collection {
    constructor(opts) {
        super(opts);
        this.model = QuipModel;
        this.url = "/api/quips";
    }
}

class StreamPodCollection extends Backbone.Collection {
    constructor(streamId) {
        super();
        this.model = QuipModel;
        this.username = username;
    }

    url() {
        return "/api/u/" + this.username + "/quips";
    }
}
