const gulp = require('gulp');
var browserSync = require('browser-sync').create();
var webpack = require('webpack-stream');
const eslint = require('gulp-eslint');
const sass = require('gulp-sass');
const babel = require('gulp-babel');
const del = require('del');
const uglify = require('gulp-uglify');

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

gulp.task('scripts', ['lint'] , function() {
  return gulp.src(paths.scripts)
    .pipe(webpack(
      {output: {
        filename: 'index.js',
      }}
    ))
    .pipe(babel({
      "presets": [
        ["env", { targets: { node: true } }],
      ]
    }))
    .pipe(uglify())
    .pipe(gulp.dest('docs/js'));
});

gulp.task('images', function() {
  return gulp.src(paths.images)
    .pipe(gulp.dest('docs/assets'));
});

gulp.task('sass', function () {
  return gulp.src(paths.sass)
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest('docs/css'))
});

gulp.task('clean', function() {
    del('docs/css');
    del('docs/js');
    del('docs/assets');
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
        server: "./docs"
    });
});

gulp.task('default', ['clean', 'scripts', 'images', 'sass']);
