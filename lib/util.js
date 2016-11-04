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
        dirs.forEach(function(dir, i){ 
            task.add(function(){ 
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
        var readResult = [];
        var task = new Task.Concurrency;   
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
                        readResult[i] = [true, realPath];
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



/*
 * 处理SSI
 */
var SSI = require('ssi');
var http = require('http');
function fixRegExpString(str){
    return str
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}');
}
function parseSSI(fileContent, callback, rootDirs, filePath){
    var matches = fileContent.match(/<!--#\s*include\s+(file|virtual)=["']?[^"']+["']?\s*-->/g); 
    var currDir = filePath.split(/[\\\/]/);
    currDir.length = currDir.length - 1;
    currDir = currDir.join(path.sep); 
    if(matches){
        // 如果包含SSI 
        var task = new Task.Concurrency; 
        matches.forEach(function(SSITag, i){ 
            task.add(function(){
                var match;
                if(match = SSITag.match(/<!--#\s*include\s+(file|virtual)=["']?([^"']+)["']?\s*-->/)){ 
                    // 虚拟目录
                    if(match[1] == 'virtual'){
                        // 先从本地ftl文件夹找
                        var tmpFilePath;
                        if(match[2].substr(0, 1) == '/'){
                            tmpFilePath = match[2]; 
                        }else{
                            tmpFilePath = path.join(currDir, match[2]); 
                        }
                        readFile(tmpFilePath, 'utf-8', function(err, content){ 
                            if(err){  
                                // 本地文件未找到从uat拉取
                                var options = { 
                                    hostname: 'www.atguat.com.cn', 
                                    port: 80, 
                                    path: match[2], 
                                    method: 'GET' 
                                }; 
                                 
                                var req = http.request(options, function(res) {  
                                    if(res.statusCode == 200){
                                        // res.setEncoding('utf8'); 
                                        var body = '';
                                        res.on('data', function (chunk) { 
                                            body += chunk; 
                                        })
                                        .on('end', function () {   
                                            parseSSI(body.toString(), function(err, content){
                                                if(!err){ 
                                                    fileContent = fileContent.replace(new RegExp(fixRegExpString(match[0]), 'g'), content); 
                                                    task.done();
                                                }else{ 
                                                    task.fail(match[2] + '->' + content);
                                                }
                                            }, rootDirs, filePath);
                                        }); 
                                    }else{ 
                                        task.fail(match[2] + '\'s http code: ' + res.statusCode);
                                    } 
                                }); 
                                 
                                // uat拉失败，直接抛出错误
                                req.on('error', function(e) {  
                                    task.fail(match[2] + ' has [http error]:' + e.message + '\n<br>' + JSON.stringify(options) );
                                }); 
                                   
                                req.end();
                            } else {
                                // 本地读取成功 
                                parseSSI((content||'').toString(), function(err, content){
                                    if(!err){ 
                                        fileContent = fileContent.replace(new RegExp(fixRegExpString(match[0]), 'g'), content); 
                                        task.done();
                                    }else{ 
                                        task.fail(match[2] + '->' + content);
                                    }
                                }, rootDirs, filePath); 
                            } 
                        },  rootDirs);
                    }else if(match[1] == 'file'){
                        // 文件包含从本地ftl文件夹找
                        var tmpFilePath;
                        if(match[2].substr(0, 1) == '/' || match[2].substr(0, 2) == '..'){
                            task.fail(match[2] + ' error: can\'t read file.' ); 
                        }else{
                            tmpFilePath = path.join(currDir, match[2]);  
                            // console.log(tmpFilePath);
                            readFile(tmpFilePath, 'utf-8', function(err, content){ 
                                if(err){  
                                    // 本地文件未找到直接抛出异常 
                                    task.fail(match[2] + ' error:' + content);
                                } else {
                                    // 本地读取成功
                                    parseSSI((content||'').toString(), function(err, content){
                                        if(!err){ 
                                            fileContent = fileContent.replace(new RegExp(fixRegExpString(match[0]), 'g'), content); 
                                            task.done();
                                        }else{ 
                                            task.fail(match[2] + '->' + content);
                                        }
                                    }, rootDirs, filePath); 
                                }  
                            }, rootDirs);
                        }
                    }else{
                        task.fail(match[0] + ' unknow include.'); 
                    }
                    
                } 
            }); 
        });
        task.success(function(){ 
            var parser = new SSI("", "", "");
            var results = parser.parse("", fileContent);  
            callback(false, results.contents);
        });

        task.error(function(path){
            callback(true, filePath + '\n<br>' + path);
        });

        task.start();  
    }else{
        callback(false, fileContent);
    }
}
exports.parseSSI = parseSSI;



