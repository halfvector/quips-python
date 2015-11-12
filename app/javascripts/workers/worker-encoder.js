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

onmessage = function(e) {

    if(e.data.action == "initialize") {
        console.log("e.data.sample_rate = " + e.data.sample_rate);
        console.log("e.data.buffer_size = " + e.data.buffer_size);
        initializeEncoder(e.data.sample_rate, e.data.buffer_size);
    }

    if(e.data.action == "finish")
        shutdownEncoder();

    if(e.data.action == "process") {

        // copy PCM data into Emscripten's linear heap memory
        // so that our transcompiled vorbis-encoder can read and process the data
        // fun idea: optimize emscripten's heap to avoid changing the underlying data-structure when diff data is written across it
        //           fork off separate heaps, optimized for bytes, floats, etc. this *might* be a huge win for slow machines.
        //           also check on how data is being passed to this worker, need to make sure chrome is doing it by-reference and not doing extra copies

        for( var i = 0; i < e.data.left.length; i ++) {
            g_AudioBufferLeft[i] = e.data.left[i];
            g_AudioBufferRight[i] = e.data.right[i];
        }

        // one 2.7ghz core encodes 1 second of audio within 60-200ms, a lot faster than realtime!
        Module._lexy_encoder_write(g_EncoderState, g_AudioBufferLeft.byteOffset, g_AudioBufferRight.byteOffset, g_BufferSamples);
    }

};

importScripts('/assets/js/ogg-vorbis-encoder.min.js');
