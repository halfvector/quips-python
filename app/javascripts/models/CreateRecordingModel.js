import Backbone from 'backbone'
import _ from 'underscore'

class CreateRecordingModel extends Backbone.Model {
    defaults() {
        return {
            num_recordings: 0,
            recording_time: 0
        }
    }

    constructor(opts) {
        super(opts);
        //
        //this.defaults = {
        //    num_recordings: 0,
        //    recording_time: 0
        //}

        this.urlRoot = "/api/create_recording";
    }
}

export { CreateRecordingModel }
