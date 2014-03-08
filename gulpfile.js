var gulp 				= require('gulp'),
	gutil 				= require('gulp-util');

var http 				= require('http'),
	runSequence			= require('run-sequence'),
	sass 				= require('gulp-ruby-sass'),
	autoprefixer 		= require('gulp-autoprefixer'),
	minifycss 			= require('gulp-minify-css'),
	jshint 				= require('gulp-jshint'),
	rename 				= require('gulp-rename'),
	uglify				= require('gulp-uglify'),
	clean 				= require('gulp-clean'),
	concat 				= require('gulp-concat'),
	imagemin 			= require('gulp-imagemin'),
	cache 				= require('gulp-cache'),
	open				= require('gulp-open'),
	livereload 			= require('gulp-livereload'),
	embedlr				= require('gulp-embedlr'),
	ecstatic			= require('ecstatic'),
	lr 					= require('tiny-lr'),
	server 				= lr();

var config = {
	http_port: 			"1337",
	livereload_port: 	"35729",
	startpage:			"dist/index.html",

	// html
	src_html: 			"app/templates/*.html",

    //src_css: 			"public/assets/css/*.css",

	// styles
	src_sass: 			"app/stylesheets/*.sass",
	dest_css: 			"public/assets/css",

    // import ready scripts
    lib_src_js: 		"app/javascripts/libs/*.js",
    lib_dest_js: 		"public/assets/js",

	// concat scripts
	src_js: 			["app/javascripts/app.js", "app/javascripts/audio-capture.js", "app/javascripts/recording-control.js"],
	dest_js: 			"public/assets/js",
	js_concat_target: 	"main.js",

	// plugins
	src_plugins: 		"app/javascripts/plugins/*.js",
	dest_plugins: 		"public/assets/js",
	plugins_concat: 	"plugins.js",

	// images
	src_img: 			"app/images/**/*.*",
	dest_img: 			"public/assets/img",
	
};

// sass task
gulp.task('styles', function() {
	return gulp.src(config.src_sass)
		.pipe(sass({style:"compact", sourcemap: false, cacheLocation: "tmp/sass-cache"}))
		//.pipe(autoprefixer("last 2 version", "safari 5", "ie 7", "ie 8", "ie 9", "opera 12.1", "ios 6", "android 4"))
		//.pipe(gulp.dest(config.dest_css))
		//.pipe(rename({ suffix: ".min" }))
		//.pipe(minifycss())
		.pipe(gulp.dest(config.dest_css))
		.pipe(livereload(server))
});

// copy libs
gulp.task('lib-scripts', function() {
	return gulp.src(config.lib_src_js)
		.pipe(gulp.dest(config.lib_dest_js))
		.pipe(livereload(server))
});

// concat & minify js
gulp.task('scripts', function() {
	return gulp.src(config.src_js)
		.pipe(jshint(/* ".jshintrc" */))
		.pipe(jshint.reporter('default'))
		.pipe(concat(config.js_concat_target))
		.pipe(gulp.dest(config.dest_js))
		//.pipe(rename({ suffix: ".min" }))
		//.pipe(uglify())
		//.pipe(gulp.dest(config.dest_js))
		.pipe(livereload(server))
});

// concat & minify plugins
gulp.task('plugins', function() {
	return gulp.src(config.src_plugins)
		.pipe(jshint(/* ".jshintrc" */))
		.pipe(jshint.reporter('default'))
		.pipe(concat(config.plugins_concat))
		.pipe(gulp.dest(config.dest_plugins))
		.pipe(rename({ suffix: ".min" }))
		.pipe(uglify())
		.pipe(gulp.dest(config.dest_js))
		.pipe(livereload(server))
});

// minify images
gulp.task('images', function() {
	return gulp.src(config.src_img)
		.pipe(imagemin())
		.pipe(gulp.dest(config.dest_img))
});

// watch html & embed lr
gulp.task('html', function() {
	return gulp.src(config.src_html)
		.pipe(embedlr())
		.pipe(gulp.dest('dist/'))
		.pipe(livereload(server))
});

// clean '.dist/'
gulp.task('clean', function() {
	return gulp.src(['./dist/**/*.*'], { read: true })
		.pipe(clean())
});

// site launcher
gulp.task('open', function() {
	return gulp.src(config.startpage)
		.pipe(open(config.startpage, { url: 'http://localhost:'+config.http_port }));
});

// default task -- run 'gulp' from cli
gulp.task('default', function(callback) {
	runSequence('clean', ['plugins', 'scripts', 'styles', 'images', 'html'], 'open', callback);
	server.listen(config.livereload_port);
	http.createServer(ecstatic({ root: 'dist/' } )).listen(config.http_port);
    gulp.watch(config.src_sass, ['styles'])._watcher.on('all', livereload);
	//gulp.watch(config.src_plugins, ['plugins'])._watcher.on('all', livereload);
	gulp.watch(config.src_js, ['scripts'])._watcher.on('all', livereload);
    gulp.watch(config.lib_src_js, ['lib-scripts'])._watcher.on('all', livereload);
	gulp.watch(config.src_html, ['html'])._watcher.on('all', livereload);
	//gulp.watch(config.src_img, ['images'])._watcher.on('all', livereload);
});