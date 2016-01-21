import CreateStreamView from './CreateStream'
import StreamDetailsView from './StreamDetails'

export default class StreamController {
    constructor(presenter) {
        this.presenter = presenter;
    }

    create() {
        this.presenter.switchView(new CreateStreamView());
    }

    details(id) {
        this.presenter.switchView(new StreamDetailsView(id));
    }
}
