postMessage({action: "started"});

var g_AudioBufferLeft,
    g_AudioBufferRight;
var g_Initialized = false;
var g_EncoderState;
var g_BufferSamples = 4096;

function initializeEncoder(sample_rate, samples_per_buffer) {
    g_EncoderState = Module._lexy_encoder_start(sample_rate, 0.3);
    g_BufferSamples = samples_per_buffer;

    // create a f32 view over the heap buffers
    g_AudioBufferLeft = new Float32Array(Module.HEAPF32.buffer, Module._malloc(g_BufferSamples * 4), g_BufferSamples);
    g_AudioBufferRight = new Float32Array(Module.HEAPF32.buffer, Module._malloc(g_BufferSamples * 4), g_BufferSamples);
}

function shutdownEncoder() {
    Module._lexy_encoder_finish(g_EncoderState);

    // get a ptr and length of a buffer in Emscripten's heap
    var encoded_buffer_ptr = Module._lexy_get_buffer(g_EncoderState);
    var encoded_length = Module._lexy_get_buffer_length(g_EncoderState);

    // build an array out of it to send back from the web-worker into main JS code
    var encoded_buffer = new Uint8Array(Module.HEAPU8.buffer, encoded_buffer_ptr, encoded_length);

    postMessage({action: "encoded", buffer: encoded_buffer});

    // end the worker
    self.close();
}

function getAverageVolume(array) {
    var values = 0;
    var average;

    var length = array.length;

    // get all the frequency amplitudes
    for (var i = 0; i < length; i++) {
        values += array[i];
    }

    average = values / length;
    return average;
}

onmessage = function(e) {

    if(e.data.action == "initialize") {
        initializeEncoder(e.data.sample_rate, e.data.buffer_size);
    }

    if(e.data.action == "finish") {
        shutdownEncoder();
    }

    if(e.data.action == "process") {

        // copy PCM data into Emscripten's linear heap memory
        // so that our transcompiled vorbis-encoder can read and process the data
        for( var i = 0; i < e.data.left.length; i ++) {
            g_AudioBufferLeft[i] = e.data.left[i];
            g_AudioBufferRight[i] = e.data.right[i];
        }

        // 1 second of audio takes 60-200ms to encode, faster than realtime. background worker needs to work on a queue in low-priority
        // or this needs to be done after PCM data was recorded
        Module._lexy_encoder_write(g_EncoderState, g_AudioBufferLeft.byteOffset, g_AudioBufferRight.byteOffset, g_BufferSamples);
    }

};

importScripts('/assets/js/ogg-vorbis-encoder.js');