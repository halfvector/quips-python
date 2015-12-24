var gulp = require('gulp'),
    gutil = require('gulp-util');

var source = require('vinyl-source-stream');
var babel = require('gulp-babel');
var es6transpiler = require('gulp-es6-transpiler');
var sourcemaps = require('gulp-sourcemaps');
var browserify = require('browserify');
var babelify = require('babelify');
var notify = require('gulp-notify');
var template = require('gulp-underscore-template');
var define = require('gulp-define-module');
var declare = require('gulp-declare');
var wrap = require('gulp-wrap');
var hbsfy = require("hbsfy");

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
    autoprefixer = require('gulp-autoprefixer'),
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

    src_sass_all: "app/stylesheets/**/*.sass",
    src_sass: "app/stylesheets/site.sass",
    dest_css: "public/assets/css",

    // ready-libraries
    external_src_js: jsDir + 'libs/*.js',
    workers_src_js: jsDir + 'workers/*.js',

    // individual scripts
    all_src_js: jsDir + '**/*.js',
    main_src_js: jsDir + 'app.js',
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
        .pipe(autoprefixer({browsers: ['last 3 versions', 'android 4', 'ie 9', '> 5%']}))
        .pipe(gulp.dest(config.dest_css))
});

// js: external libs
gulp.task('external-scripts', function () {
    return gulp.src(config.external_src_js)
        .pipe(rename(function (path) {
            if (path.basename.indexOf('.min') == -1)
                path.basename += '.min'
        }))
        //.pipe(uglify())
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

    //hbsfy.configure({
    //    extensions: ['hbs']
    //});

    return browserify({entries: config.main_src_js, debug: true})
        .external(['backbone', 'vague-time', 'underscore', 'jquery', 'babel/polyfill'])
        //.add(require.resolve("babel/polyfill"))
        .transform(hbsfy)
        .transform(babelify)
        .bundle()
        .on('error', notify.onError())
        .pipe(source('app.js'))
        .pipe(gulp.dest(config.dest_js))
        //.pipe(reload({stream:true}))
        //.pipe(notify("Browser reloaded after watchify update!"))
    ;


    //return gulp.src(config.all_src_js)
    //    .pipe(sourcemaps.init())
    //    .pipe(babel({
    //        presets: ['babel-preset-es2015']
    //    }))
    //    .on('error', onError)
    //    //.pipe(jshint(/* ".jshintrc" */))
    //    //.pipe(jshint.reporter('jshint-stylish'))
    //    //.pipe(concat(config.js_concat_main))
    //    .pipe(concat('all.js'))
    //    .pipe(sourcemaps.write('.'))
    //    .pipe(gulp.dest(config.dest_js))
});

gulp.task('templates', function () {
    "use strict";
    gulp.src("app/templates/**/*.hbs")
        .pipe(template())
        .pipe(define('hybrid', {require: {'_': 'underscore'}}))
        .pipe(declare({
            namespace: 'templates',
            noRedeclare: true,
            root: 'window'
        }))
        .pipe(concat('templates.js'))
        //.pipe(gulp.dest('app/javascripts/'))
        .pipe(gulp.dest(config.dest_js))
    ;
});

function onError(err) {
    console.log(err);
    this.emit('end');
}

// watch html
gulp.task('html', function () {
    return gulp.src(config.src_html)
        .pipe(livereload(server))
});

gulp.task('clean', function () {
    return gulp.src(['public/assets/css/site.css', 'public/assets/js'], {read: false})
        .pipe(clean());
});

gulp.task('build', function (completed) {
    runSequence('clean', 'external-scripts', 'worker-scripts', 'main-scripts', 'styles', completed);
});

gulp.task('watch', ['build'], function (completed) {
    // rebuild asset when source is changed
    gulp.watch(config.src_sass_all, ['styles']);
    gulp.watch(config.external_src_js, ['external-scripts']);
    gulp.watch(config.workers_src_js, ['worker-scripts']);
    gulp.watch(config.all_src_js, ['main-scripts']);
    gulp.watch('app/templates/**/*.hbs', ['main-scripts']);

    // live reload when asset is changed
    gulp.watch(config.src_html, livereload.changed);
    gulp.watch('public/assets/**/*.{css,html,js}', livereload.changed);
});

// default task -- run 'gulp' from cli
gulp.task('default', ['watch'], function (callback) {
    server.listen(config.livereload_port);
});
