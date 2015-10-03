var gulp = require('gulp'),
    gutil = require('gulp-util');

var http = require('http'),
    runSequence = require('run-sequence'),
    sass = require('gulp-ruby-sass'),
    jshint = require('gulp-jshint'),
    rename = require('gulp-rename'),
    uglify = require('gulp-uglify'),
    zopfli = require('gulp-zopfli'),
    clean = require('gulp-clean'),
    concat = require('gulp-concat'),
    cache = require('gulp-cache'),
    livereload = require('gulp-livereload'),
    lr = require('tiny-lr'),
    server = lr()
    ;

var continueOnError = function (stream) {
    return stream
        .on('error', function () {
        })
        .on('pipe', function (src) {
            cleaner(src);
        })
        .on('newListener', function () {
            cleaner(this);
        });
};

var jsDir = 'app/javascripts/';

var config = {
    livereload_port: "35729",

    src_html: "app/templates/*.html",

    src_sass: "app/stylesheets/site.sass",
    dest_css: "public/assets/css",

    // ready-libraries
    external_src_js: jsDir + 'libs/*.js',
    workers_src_js: jsDir + 'workers/*.js',

    // individual scripts
    main_src_js: [
        jsDir + 'app.js',
        jsDir + 'audio-capture.js',
        jsDir + 'homepage.js',
        jsDir + 'recording-control.js',
        jsDir + 'quip-control.js',
        jsDir + 'nav-user-dropdown.js'
    ],
    dest_js: "public/assets/js/",

    // concatenated result file names
    js_concat_main: "main.js",
    js_concat_externals: "externals.js"
};

// sass task
gulp.task('styles', function () {
    return sass(config.src_sass, {
        style: "compact", cacheLocation: "tmp/sass-cache",
        stopOnError: true
    })
        .on('error', sass.logError)
        .pipe(gulp.dest(config.dest_css))
});

// js: external libs
gulp.task('external-scripts', function () {
    return gulp.src(config.external_src_js)
        .pipe(rename(function (path) {
            if (path.basename.indexOf('.min') == -1)
                path.basename += '.min'
        }))
        .pipe(uglify())
        .pipe(concat(config.js_concat_externals))
        .pipe(gulp.dest(config.dest_js))
});

// js: individual worker scripts
gulp.task('worker-scripts', function () {
    return gulp.src(config.workers_src_js)
        .pipe(rename(function (path) {
            if (path.basename.indexOf('.min') == -1)
                path.basename += '.min'
        }))
        //.pipe(uglify()) // don't uglify for now, emscripten needs to be handled more carefully
        //.pipe(zopfli()) // TODO: figure out how to get Chrome's Workers to accept gzipped files
        .pipe(gulp.dest(config.dest_js))
});

// js: primary scripts
gulp.task('main-scripts', function () {
    return gulp.src(config.main_src_js)
        //.pipe(jshint(/* ".jshintrc" */))
        //.pipe(jshint.reporter('jshint-stylish'))
        .pipe(concat(config.js_concat_main))
        .pipe(gulp.dest(config.dest_js))
});

// watch html
gulp.task('html', function () {
    return gulp.src(config.src_html)
        .pipe(livereload(server))
});

gulp.task('clean', function () {
    return gulp.src(['public/assets/css/site.css', 'public/assets/js'], {read: false})
        .pipe(clean());
});

gulp.task('build', function(completed) {
    runSequence('clean', 'external-scripts', 'worker-scripts', 'main-scripts', 'styles', completed);
});

gulp.task('watch', ['build'], function(completed) {
    // rebuild asset when source is changed
    gulp.watch(config.src_sass, ['styles']);
    gulp.watch(config.external_src_js, ['external-scripts']);
    gulp.watch(config.workers_src_js, ['worker-scripts']);
    gulp.watch(config.main_src_js, ['main-scripts']);

    // live reload when asset is changed
    gulp.watch(config.src_html, livereload.changed);
    gulp.watch('public/assets/**/*.{css,html,js}', livereload.changed);
});

// default task -- run 'gulp' from cli
gulp.task('default', ['watch'], function (callback) {
    server.listen(config.livereload_port);
});