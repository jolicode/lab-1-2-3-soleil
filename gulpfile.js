const gulp = require('gulp');
var browserSync = require('browser-sync').create();
var webpack = require('webpack-stream');
const eslint = require('gulp-eslint');
const sass = require('gulp-sass');
const babel = require('gulp-babel');
const del = require('del');

var paths = {
  scripts: './app/*.js',
  images: './app/assets/*',
  sass: './app/*.scss'
};

gulp.task('lint', function () {
  return gulp.src(paths.scripts)
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('babel', ['lint'] , function() {
  return gulp.src(paths.scripts)
  .pipe(babel({
    "presets": [
      ["env", { targets: { node: true } }],
    ]
  }))
});

gulp.task('scripts', ['babel'] , function() {
  return gulp.src(paths.scripts)
    .pipe(webpack(
      {output: {
        filename: 'index.js',
      }}
    ))
    .pipe(gulp.dest('build/js'));
});

gulp.task('images', function() {
  return gulp.src(paths.images)
    .pipe(gulp.dest('build/assets'));
});

gulp.task('sass', function () {
  return gulp.src(paths.sass)
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest('build/css'))
});

gulp.task('clean', function() {
    del('build/css');
    del('build/js');
    del('build/assets');
});

//Rerun the task when a file changes
gulp.task('watch', function() {
  gulp.watch(paths.scripts, ['scripts']);
  gulp.watch(paths.images, ['images']);
  gulp.watch(paths.sass, ['sass']);
});

gulp.task('serve', ['watch'], () => {
    browserSync.init({
        port : 8000,
        browser: "google chrome",
        open: true,
        reloadOnRestart : true,
        online : true,
        server: "./build"
    });
});

gulp.task('default', ['clean', 'scripts', 'images', 'sass']);
