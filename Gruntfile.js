module.exports = function (grunt) {
    "use strict";

    // Project configuration.
    grunt.initConfig({

         ///////////////////////////////
         //
         // Global Config
         // Store your Package file so you can reference its specific data whenever necessary
         // Globals banner configuration which is displayed in the js and css files
         ////////////////////////////////
         pkg: grunt.file.readJSON('package.json'),

         header: '/*!\nname: <%= pkg.title %> \n' + 'version: <%= pkg.version %> \n' + 'date: <%= grunt.template.today("yyyy-mm-dd") %>\n' + 'url: <%= pkg.author.homepage %> \n' + 'email: <%= pkg.author.email %> \n' + 'copyright (c) <%= grunt.template.today("yyyy") %>\n' + '*/\n',

         footer: '/*! -----deck36-----*/',

         label: {
             main: 'deck36 plan9 backend'
         },

         dirs: {
             main  : 'public',
             lib: 'lib/server',
             src: 'src',
             node_modules: 'node_modules',
             config: 'config'
         },

         'git-describe': {
             options: {
                 prop: 'meta.revision'
             },
             me: {}
         },

         ///////////////////////////////
         //
         // Mocha and Cucumber tests
         //
         ////////////////////////////////
         mochacli: {
             options: {
                 require: ['assert'],
                 reporter: 'nyan',
                 bail: true,
                 recursive: true,
                 'check-leaks': true
             },
             all: ['lib/server/test/*.js', 'lib/server/test/**/*.js', 'src/**/test/*.js', 'src/**/test/**/*.js']
         },

         ///////////////////////////////
         //
         // If something changes to these tasks
         //
         ////////////////////////////////
         watch: {
             dev: {
                 files: [
                     "<%= dirs.lib %>/*.js", "<%= dirs.lib %>/**/*.js", "<%= dirs.src %>/**/*.js", "<%= dirs.src %>/*.js", "<%= dirs.config %>/*.js", "<%= dirs.config %>/../*.js"
                 ],
                 tasks: [ 'mochacli' ]
             },
             test: {
                 files: [
                     "<%= dirs.lib %>/*.js", "<%= dirs.lib %>/**/*.js", "<%= dirs.src %>/**/*.js", "<%= dirs.src %>/*.js", "<%= dirs.config %>/*.js", "<%= dirs.config %>/../*.js"
                 ],
                 tasks: [ 'mochacli' ]
             }
         },

         ///////////////////////////////
         //
         // Let nodemon and watch run in parallel
         //
         ////////////////////////////////
         concurrent: {
             dev: {
                 tasks: ['nodemon:dev'],
                 //tasks: ['nodemon:dev', 'watch:dev'],
                 options: {
                     logConcurrentOutput: true
                 }
             },
             test: {
                 tasks: ['nodemon:test'],
                 options: {
                     logConcurrentOutput: true
                 }
             },
             prod: {
                 tasks: ['exec:pm2prod'],
                 options: {
                     logConcurrentOutput: true
                 }
             }
         },

         ///////////////////////////////
         //
         // Nodemon config for watching changes in app_test.js
         //
         ////////////////////////////////
         nodemon: {
            dev: {
                script: 'plan9.js',
                options: {
                     args: ['dev'],
                     nodeArgs: ['--debug'],
                     ignore: ['README.md', 'node_modules/**'],
                     ext: 'js,twig',
                     watch: ['./', './lib/', 'src/'],
                     delay: 1,
                     legacyWatch: true,
                     env: {
                         NODE_ENV: 'dev',
                         NODE_CONFIG_DIR: 'config',
                         DEBUG: '*'
                     }
                 }
            },
            test: {
                script: 'plan9.js',
                options: {
                     args: ['test'],
                     delay: 1,
                     legacyWatch: false,
                     env: {
                         NODE_ENV: 'test',
                         NODE_CONFIG_DIR: 'config'
                     }
                 }
            }
         },

         ///////////////////////////////
         //
         // Patch sources based on patch files
         //
         ////////////////////////////////
         exec: {
             patch: {
                 command: 'sh `pwd`', // patching not necessary atm and causes grunt to fail..  /bin/patch.sh',
                 stdout: true,
                 stderr: false
             },
             rabbit: {
                 command: 'sh `pwd`/bin/setup_rabbitmq.sh'
             },
             pm2prod: {
                 command: 'sh `pwd`/bin/start_server_prod.sh --file plan9.js',
                 stdout: true,
                 stderr: false
             }
         }
     });

    // Load NPM Tasks
    grunt.loadNpmTasks('grunt-concurrent');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-mocha-cli');
    grunt.loadNpmTasks('grunt-nodemon');
    grunt.loadNpmTasks('grunt-exec');

    // Default Task
    grunt.registerTask('default', 'My "helper" task.', function () {
        // Log... conditionally.
        grunt.log.writeln('*****************************************************************');
        grunt.log.writeln('frontend special task based on grunt.\n');
        grunt.log.writeln('Available tasks\n');
        grunt.log.writeln('\t =================================================================');
        grunt.log.writeln('\t start-plan9-(dev|test|prod)   = Start plan9 in dev|test|prod mode');
        grunt.log.writeln('\t concurrent = watches the client files and rebrowserify them for development and restart test node plan9.js');
        grunt.log.writeln('\t test       = runs the unit and functionaltests tests for Javascript');
        grunt.log.writeln('\t prepare    = prepares the environment');
        grunt.log.writeln('\t =================================================================');
        grunt.log.writeln('\n --- Usage: grunt  \<task\> ---');
        grunt.log.writeln('\n*****************************************************************');
    });

    // only available in grunt v0.4.2: grunt.unregisterTasks('qunit', 'concat', 'uglify', 'clean', 'copy', 'jshint');

    grunt.registerTask('start-plan9-dev', [
        //'concurrent:dev'
        'nodemon:dev'
    ]);

    grunt.registerTask('start-plan9-test', [
         'concurrent:test'
    ]);

    grunt.registerTask('start-plan9-prod', [
        'concurrent:prod'
    ]);

    grunt.registerTask('mocha', [
        'mochacli'
    ]);

    grunt.registerTask('test', [
        'mocha'
    ]);

    grunt.registerTask('prepare',[
        'exec:patch',
        'exec:rabbit'
    ]);
};
