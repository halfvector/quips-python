export default class MicrophonePermissions {
    constructor() {
        this.microphoneMediaStream = null;
    }

    haveMicrophone() {
        return this.microphoneMediaStream != null ? true : false;
    }

    setMicrophone(ms) {
        this.microphoneMediaStream = ms;
    }

    grabMicrophone(onMicrophoneGranted, onMicrophoneDenied) {
        if (this.haveMicrophone()) {
            onMicrophoneGranted();
            return;
        }

        navigator.mediaDevice
            .getUserMedia({audio: true})
            .then((ms) => {
                this.setMicrophone(ms);
                onMicrophoneGranted(ms);
            })
            .catch((err) => {
                console.log("AudioCapture::start(); could not grab microphone. perhaps user didn't give us permission?");
                console.warn(err);
                onMicrophoneDenied(err);
            })
    }
}
