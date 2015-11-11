var exec = require('child_process').exec;
var moment = require('moment');
var fs = require('fs');
var os = require('os');
var filename = os.tmpdir() + "/dump-to-glacier-" + moment().format('YYYY-MM-DD-hh-mm') + '.sql';

console.log('Temp filename: ' + filename);

var backup = function backup(connection, cb) {
    var user = connection.config.user;
    var password = connection.config.password;
    var database = connection.config.database;
    var command = "export PATH=$PATH:/usr/bin:/usr/local/bin/; mysqldump -u " + user;
    if (typeof password !== 'undefined') {
        command += " -p'" + password + "'";
    }
    command += " " + database + " > " + filename;
    exec(command, function (err) {
        console.log('Exec callback being called');
        if (err) {
            cb(err);
            return;
        }
        cb(null, filename);
    });
};

module.exports = backup;
