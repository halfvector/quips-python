import StreamList from './StreamList'
import StreamDetailsView from './StreamDetails'

export default class StreamController {
    constructor(presenter) {
        this.presenter = presenter;
    }

    list_streams() {
        this.presenter.switchView(new StreamList());
    }

    details(id) {
        this.presenter.switchView(new StreamDetailsView(id));
    }
}
