import CreateStreamView from './CreateStream'

export default class StreamController {
    constructor(presenter) {
        this.presenter = presenter;
    }

    create() {
        console.log("Showing stream creation view");
        this.presenter.switchView(new CreateStreamView());
    }
}
