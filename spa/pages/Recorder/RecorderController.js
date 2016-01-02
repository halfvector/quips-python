import MicrophonePermissions from '../GetMicrophone/MicrophonePermissions'
import RecorderView from './RecorderView'
import GetMicrophoneView from '../GetMicrophone/GetMicrophoneView'

export default class RecorderController {
    constructor(presenter) {
        this.presenter = presenter;
        new MicrophonePermissions()
            .grabMicrophone((ms) => this.onMicrophoneAcquired(ms), () => this.onMicrophoneDenied());
    }

    onMicrophoneAcquired(microphoneMediaStream) {
        this.presenter.switchView(new RecorderView(microphoneMediaStream));
    }

    onMicrophoneDenied() {
        this.presenter.switchView(new GetMicrophoneView());
    }
}
