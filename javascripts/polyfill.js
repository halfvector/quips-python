export default class Polyfill {
    static install() {
        window.AudioContext = window.AudioContext || window.webkitAudioContext || false;
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia || false;

        if (navigator.mediaDevice == null) {
            console.log("polyfilling mediaDevice.getUserMedia");

            navigator.mediaDevice = {
                getUserMedia: (props) => new Promise((y, n) => navigator.getUserMedia(props, y, n))
            }
        }

        if (!navigator.getUserMedia) {
            console.error("AudioCapture::polyfill(); getUserMedia() not supported.");
            return false;
        }
    }
}
