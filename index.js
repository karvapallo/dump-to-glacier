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
    path = require('path'),
    rimraf = require('rimraf'),
    vaultName = awsConfig.vaultName,
    uploadToGlacier = function uploadToGlacier(tmpFile) {
        var glacier = new AWS.Glacier();
        var buffer = fs.readFileSync(tmpFile);
        var params = {
            vaultName: awsConfig.vaultName,
            body: buffer
        };
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
    },
    uploadToS3 = function uploadToS3(tmpFile) {
        var s3Config = {
            params: {
                Bucket: awsConfig.bucket
            }
        };
        var s3 = new AWS.S3(s3Config);
        var buffer = fs.readFileSync(tmpFile);
        var params = {
            Key: path.basename(tmpFile),
            Body: buffer
        };

        s3.upload(params, function(err, data) {
            console.log('S3 callback being called');
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
    },
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

    AWS.config.update(awsCredentials);

    if (config.get('storage') === 'glacier') {
        uploadToGlacier(tmpFile);
    } else {
        uploadToS3(tmpFile);
    }

});
