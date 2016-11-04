var child_process = require('child_process');
var spawn = child_process.spawn;

var http = require('http');
var url=require('url');
var fs=require('fs');
var path=require('path');
var rootDir = path.join('../');
var util = require(rootDir + '/lib/util.js')
var mine=require(rootDir + '/lib/mine.js').types;
var Task = require(rootDir + '/lib/task.js');


function startServer(argv){
    var PORT; 
    argv = argv || process.argv;
    if(argv[0].indexOf('node')>-1){
        PORT = parseInt(argv[2]) || 3000;
    }else{
        PORT = parseInt(argv[1]) || 3000;
    }

    var server = http.createServer(function (request, response) {
        var config;
        var staticPath;
        var pathname;
        var realPath;  
        var ext; 

        var taskQueue = new Task.Queue;

        // 读取配置信息
        taskQueue.add(function(){
            fs.readFile('./conf.json', "utf-8", function (err, file) { 
                if(file){
                    try{
                        config = JSON.parse(file); 
                    }catch(e){
                        response.writeHead(500, {
                            'Content-Type': 'text/plain'
                        });
                        response.write("config file parse error.\n" + e);
                        response.end();
                    }
                    taskQueue.done();
                }else{
                    taskQueue.done();
                } 
            });
        });

        // rewrite 和 合并文件
        taskQueue.add(function(){
            var rurl = request.url; 
            var rewrite = config.rewrite;
            var rootPath;

            if(rurl.indexOf('??') > -1){ // 合并文件 
                realPath = rurl.split("??").map(function(el){ 
                    return el.replace(/\?[^?]+$/, ''); 
                }).join("??");
                ext = path.extname(rurl.split('??')[1].split(',')[0]);
                ext = ext ? ext.slice(1) : 'unknown';
            }else{
                for(var matchUrl in rewrite){
                    if(rurl.indexOf(matchUrl) == 0){
                        rurl = rewrite[matchUrl];
                        rootPath = './';
                        break;
                    }
                }
                
                pathname = url.parse(rurl).pathname;
                realPath = path.join(rootPath || './', pathname); 
                if(rootPath){
                    staticPath = realPath;
                } 
                ext = path.extname(realPath);
                ext = ext ? ext.slice(1) : 'unknown';
            }

            taskQueue.done();
        });

        // 请求的文件不存在
        taskQueue.add(function(){ 
            var ftlPath;  
            if(!staticPath && /[\\\/]?\$/.test(realPath) ){
                staticPath = realPath.replace(/^[\\\/]?\$([^\/\\\?]+)/, function(a, b){
                    return config[b] || '';
                }).replace(/\\|\//g, path.sep);
            } else {
                ftlPath = path.join(config.ftlDir, realPath);
            } 

            util.fileExists(staticPath || ftlPath, function(exists, errorPath){ 
                if (!exists) {
                    response.writeHead(404, {
                        'Content-Type': 'text/plain'
                    });

                    response.write("This request URL " + (errorPath || pathname) + " was not found on this server.");
                    response.end();
                } else {
                    taskQueue.done();
                } 
            });  
             
        }); 

        // 处理请求文件
        taskQueue.add(function(){
            if(ext === 'ftl'){
                taskQueue.done();
            }else{
                // 静态文件 
                util.readFile(staticPath || realPath, "binary", function(err, file) {
                    if (err) {
                        response.writeHead(500, {
                            'Content-Type': 'text/plain'
                        }); 
                        response.write("Can not read file:" + pathname);
                        response.end();
                    } else {
                        var contentType = mine[ext] || "text/plain";
                        response.writeHead(200, {
                            'Content-Type': contentType
                        });
                        response.write(file, "binary");
                        response.end();
                    }
                });
            } 
        });
        // ftl模板文件
        taskQueue.add(function(jsonPath){ 
            var realPathArr = realPath.split('.');
            realPathArr[realPathArr.length-1] = 'json'; 
            var jsonPath = path.join('./data', realPathArr.join('.')); 
            fs.exists(jsonPath, function(exists){
                var ftlRoot = (config.ftlDir || '').replace(/\\|\//g, path.sep) || path.join(__dirname);

                var Freemarker = require(rootDir + '/lib/freemarker.js');
                var fm = new Freemarker({
                    viewRoot: ftlRoot, 
                    options: {
                        sourceEncoding: "utf-8"
                        ,outputEncoding: "utf-8"
                    }
                });
                
                if(exists){
                    fs.readFile(jsonPath, 'utf-8', function (err, file) { 
                        var data;
                        var dataParseError;
                        if(err || !file){
                            data = {};
                        }else{
                            try{
                                data = JSON.parse(file);
                            }catch(e){
                                data = {};
                                dataParseError = e;
                            }
                        } 

                        if(config.coverData){
                            var coverData,oneData;
                            coverData = config.coverData;
                            for(oneData in coverData){
                                data[oneData] = coverData[oneData];
                            }
                        };

                        fm.render(realPath, data, function(err, data, out) { 
                            response.writeHead(200, {
                                'Content-Type': 'text/html;charset=utf-8'
                            });
                            if(dataParseError){
                                data = 'test data parse error:' + (dataParseError + '').replace(/\n/g, '<br>\n') + '<br>' + data;
                            } 
                            if(err){
                                data = 'render freemarker error:' + (err + '').replace(/\n/g, '<br>\n') + '<br>' + data; 
                            }
                            if(out.toLowerCase().indexOf('done') == -1){
                                data = 'render freemarker error:' + (out + '').replace(/\n/g, '<br>\n') + '<br>' + data; 
                            }
                            response.write(data);
                            response.end();
                        });
                    });
                }else{
                    fm.render(realPath, {}, function(err, data, out) {
                        response.writeHead(200, {
                            'Content-Type': 'text/html;charset=utf-8'
                        });  

                        if(out.toLowerCase().indexOf('done') == -1){
                            data = 'render freemarker error:' + (out + '').replace(/\n/g, '<br>\n') + '<br>' + data; 
                        }

                        response.write(data);
                        response.end();
                    });
                }
            });
        });
        taskQueue.start();    
        
    });
    server.listen(PORT);
    console.log("Server runing at port: " + PORT + ".");
}

// startServer();

exports.start = startServer;









