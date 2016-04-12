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