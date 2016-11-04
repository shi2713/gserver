var fs = require( 'fs' ),
    stat = fs.stat;

/*
 * 复制目录中的所有文件包括子目录
 * @param{ String } 需要复制的目录
 * @param{ String } 复制到指定的目录
 */
var copy = function( src, dst ){ 
    // 读取目录中的所有文件/目录
    fs.readdir( src, function( err, paths ){
        if( err ){
            throw err;
        }
        paths.forEach(function( path ){
            var _src = src + '/' + path,
                _dst = dst + '/' + path,
                readable, writable;       
            stat( _src, function( err, st ){
                if( err ){
                    throw err;
                }
                // 判断是否为文件
                if( st.isFile() ){

                    // 创建读取流
                    readable = fs.createReadStream( _src );
                    // 创建写入流
                    writable = fs.createWriteStream( _dst );   
                    // 通过管道来传输流
                    readable.pipe( writable );

                }
                // 如果是目录则递归调用自身
                else if( st.isDirectory() ){
                    exists( _src, _dst, copy );
                }
            });
        });
    });
};
// 在复制目录前需要判断该目录是否存在，不存在需要先创建目录
var exists = function( src, dst, callback ){
    fs.exists( dst, function( exists ){
        // 已存在
        if( exists ){ 
            callback( src, dst );
        }
        // 不存在
        else{
            fs.mkdir( dst, function(){
                callback( src, dst );
            });
        }
    });
};
// 复制目录
exports.copy = function(from, to){
    exists( from, to, copy );
};




/*
 * 判断文件是否存在，包括合并文件
 */
var path = require('path');
var fs = require('fs');
var Task = require(path.join(__dirname, './task.js'))

function fileExists(filePath, callback){ 


    if(filePath.indexOf('??') > -1){
        var pathSplit = filePath.split('??');
        var basePath = pathSplit[0];
        var filePaths = pathSplit[1].split(','); 

        var task = new Task.Concurrency;
        task.success(function(){
            callback(true);
        });

        task.error(function(path){
            callback(false, path);
        });

        filePaths.forEach(function(subPath, i){ 
            task.add(function(){
                var allPath = path.join(basePath, subPath);
                fs.exists(allPath, function(exists){ 
                    task[exists ? 'done' : 'fail'](allPath);
                });
            }); 
        });

        task.start(); 
    }else{  
        fs.exists(filePath, callback);
    }
}
// 文件是否存在
exports.fileExists = fileExists;



/*
 * 读取文件，包括合并文件
 */
var path = require('path');
var fs = require('fs');
var Task = require(path.join(__dirname, './task.js'))

function readFile(filePath, encode, callback){ 
    if(filePath.indexOf('??') > -1){
        var pathSplit = filePath.split('??');
        var basePath = pathSplit[0];
        var filePaths = pathSplit[1].split(','); 
        var content = '';

        var task = new Task.Queue;
        task.success(function(err, file){
            callback(err, content);
        });

        task.error(function(err, file){
            callback(err, content);
        });

        filePaths.forEach(function(path, i){   
            task.add(function(){ 
                fs.readFile(basePath + '/' + path, encode, function(err, file){ 
                    content = content + file;
                    task[err ? 'fail' : 'done'](err, file);
                });
            }); 
        });

        task.start(); 
    }else{  
        fs.readFile(filePath, encode, callback);
    }
}
// 读取文件
exports.readFile = readFile;





