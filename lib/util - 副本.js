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



function removeQuery(url){
    return url.replace(/\?[^\?]*$/, '') || '';
}
exports.removeQuery = removeQuery;

/*
 * 判断文件是否存在，包括合并文件
 */
var path = require('path');
var fs = require('fs');
var Task = require(path.join(__dirname, './task.js'))


function fileExists(filePath, callback, dirs){  
    // 合并多文件
    if(filePath.indexOf('??') > -1){
        var pathSplit = filePath.split('??'); 
        var filePaths = removeQuery(pathSplit[1]).split(','); 

        var task = new Task.Concurrency;
        task.success(function(){
            callback(true);
        });

        task.error(function(path){
            callback(false, path);
        });

        filePaths.forEach(function(subPath, i){ 
            task.add(function(){
                var allPath = path.join('/', subPath);
                // console.log('[util.js] allPath:' + allPath);
                fileExists(allPath, function(exists){ 
                    task[exists ? 'done' : 'fail'](allPath);
                }, dirs);
            }); 
        });

        task.start(); 
    // 多目录查找文件
    }else if(dirs && dirs.length){   
        var isFileExists = false; 
        var task = new Task.Concurrency;  
        // console.log(dirs);
        dirs.forEach(function(dir, i){ 
            task.add(function(){
                // console.log(path.join(dir, filePath));
                fs.exists(path.join(dir, removeQuery(filePath)), function(exists){
                    if(exists){
                        isFileExists = true;
                    }
                    task.done();
                });
            });
        });

        task.success(function(){
            callback(isFileExists);
        }); 

        task.start();
    // 根目录查找
    }else{
        fs.exists(removeQuery(filePath), callback);
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

function readFile(filePath, encode, callback, dirs){ 
    if(filePath.indexOf('??') > -1){ 
        var pathSplit = filePath.split('??'); 
        var filePaths = removeQuery(pathSplit[1]).split(','); 
        var content = '';

        var task = new Task.Queue;
        task.success(function(err, file){
            callback(err, content);
        });

        task.error(function(err, file){
            callback(err, content);
        });

        filePaths.forEach(function(filePath, i){   
            task.add(function(){ 
                readFile(path.join('/', filePath), encode, function(err, file){ 
                    content = content + file;
                    task[err ? 'fail' : 'done'](err, file);
                }, dirs);
            }); 
        });

        task.start(); 
    // 多目录读取文件
    }else if(dirs && dirs.length){    
        // var file, err;  
        // for(var i=0,len=dirs.length; i<len; i++){ 
        //     try{
        //         // console.log(path.join(dirs[i], filePath));
        //         file = fs.readFileSync(path.join(dirs[i], removeQuery(filePath))); 
        //     }catch(e){
        //         err = e;
        //     }
        //     if(file){ 
        //         err = null;
        //         break;
        //     }
        // }

        // callback(err, file);


        var readResult = [];
        var task = new Task.Concurrency;  
        // console.log(dirs); 
        dirs.forEach(function(dir, i){  
            task.add(function(){  
                var realPath = path.join(dir, removeQuery(filePath));
                fs.exists(realPath, function(exists){  
                    if(exists){
                        readFile(realPath, encode, function(err, file){ 
                            var ext = path.extname(realPath);
                            if(!err && ext=='.css' || ext=='.js'){ 
                                file = '/* file:' + realPath + '*/\n' + file + '\n\n';
                            }
                            readResult[i] = [err, file];
                            task.done();
                        });
                    } else {
                        readResult[i] = null;
                        task.done();
                    }
                });
            });
        });

        task.success(function(){
            for(var i=0,len=readResult.length; i<len; i++){ 
                if(readResult[i] && !readResult[i][0]){
                    callback.apply(null, readResult[i]);
                    return;
                }
            }
            callback.apply(null, readResult[0]);
        });  

        task.start();
        
    // 根目录读取
    }else{  
        fs.readFile(removeQuery(filePath), encode, callback);
    }
}
// 读取文件
exports.readFile = readFile;



function deepCopy(from, to){
    for(var i in from){
        if(typeof(from[i]) === 'object'){
            if(!to[i]){
                to[i] = {};
            }else if(to[i] && typeof(to[i]) !== 'object'){
                to[i] = {};
            }
            deepCopy(from[i], to[i]);
        }else{
            to[i] = from[i];
        }
    }
}
// 深拷贝 TODO: 循环引用的问题，目前场景木有需求
exports.deepCopy = deepCopy;





