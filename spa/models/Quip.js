import Backbone from 'backbone'
import _ from 'underscore'

/**
 * Recording
 * get: recording metadata + calling user's listening status
 * post: create new recording
 * put: update recording metadata
 */
class QuipModel extends Backbone.Model {
    defaults() {
        return {
            id: 0, // guid
            progress: 0, // [0-100] percentage
            position: 0, // seconds
            duration: 0, // seconds
            isPublic: false
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

export { QuipModel, MyQuipCollection }
