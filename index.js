var mysql = require('mysql'),
    config = require('./lib/config.js'),
    mysqlConfig = config.get('mysql')[process.env.NODE_ENV],
    awsConfig = config.get('aws')[process.env.NODE_ENV],
    connection = mysql.createConnection({
        host: mysqlConfig.host,
        user: mysqlConfig.user,
        password: mysqlConfig.password,
        database: mysqlConfig.database
    }),
    awsCredentials = {
        accessKeyId: awsConfig.accessKeyId,
        secretAccessKey: awsConfig.secretAccessKey
    },
    mysqlDump = require('./lib/mysqldump.js'),
    AWS = require('aws-sdk'),
    fs = require('fs'),
    rimraf = require('rimraf'),
    vaultName = awsConfig.vaultName,
    fileSize = function fileSize(filename) {
        var stats = fs.statSync(filename);
        var fileSizeInBytes = stats["size"];
        return fileSizeInBytes
    };

AWS.config.region = awsConfig.region;
AWS.config.accessKeyId = awsConfig.accessKeyId;
AWS.config.secretAccessKey = awsConfig.secretAccessKey;

mysqlDump(connection, function afterSqlBackup(err, tmpFile) {
    console.log('mysqlDump callback being called');
    if (err) {
        console.error(err);
        return;
    }

    var buffer = fs.readFileSync(tmpFile),
        params = {
            vaultName: awsConfig.vaultName,
            body: buffer
        };
    var glacier = new AWS.Glacier();


    AWS.config.update(awsCredentials);
    glacier.uploadArchive(params, function(err, data) {
        console.log('Glacier callback being called');
        if (err) {
            console.error("Error uploading archive!", err);
        }
        rimraf(tmpFile, function onDelete(err) {
            if (err) {
                console.error('Deleting file failed!', err);
            }
            console.log('File deleted');
        });
        console.log('Waiting for file to be deleted');
    });
});
