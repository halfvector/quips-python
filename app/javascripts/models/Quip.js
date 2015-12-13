import Backbone from 'backbone'
import _ from 'underscore'

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

    constructor(props) {
        super(props);
        this.urlRoot = "/quips";

        // save listening progress at most every 3 seconds
        this.throttledSave = _.throttle(this.save, 3000);
    }

    //save(attributes) {
    //    console.log("Quip Model saving to localStorage");
    //    localStorage.setItem(this.id, JSON.stringify(this.toJSON()));
    //}
    //
    //fetch() {
    //    console.log("Quip Model loading from localStorage");
    //    this.set(JSON.parse(localStorage.getItem(this.id)));
    //}
}

class MyQuipCollection extends Backbone.Collection {
    constructor(opts) {
        super(opts);
        this.model = QuipModel;
        this.url = "/quips";
    }
}

export { QuipModel, MyQuipCollection }
