var child_process = require('child_process');
var spawn = child_process.spawn;


var http = require('http');
var url  = require('url');
var fs   = require('fs');
var path = require('path');
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
        var filePath;  
        var ext; 
        var dirs = [];

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
                        response.write("[config.json] parse error.\n" + e);
                        response.end();
                    }
                    // 记录所有需要遍历的目录
                    dirs.push(config.ftlDir);
                    dirs.push(config.cssDir);
                    dirs.push(config.jsDir);
                    dirs.push('./');

                    taskQueue.done();
                }else{
                    taskQueue.done();
                } 
            });
        }); 

        // 请求的文件不存在
        taskQueue.add(function(){
            // console.log('[server.js] request:' + request.url);
            filePath = url.parse(request.url).path; 
            var rewrite,matchUrl;
            rewrite = config.rewrite;

            for(matchUrl in rewrite){
                if(filePath.indexOf(matchUrl) == 0){
                    filePath = rewrite[matchUrl]; 
                    break;
                }
            }

            // 去掉.min
            filePath = filePath.replace(/min\.(js|css)/g, '$1');
            ext = path.extname(filePath).replace(/\?[^\?]*$/, '').slice(1);

            // console.log('[server.js] filePath:' + filePath);
            // console.log('[server.js] ext:' + ext);
            
            util.fileExists(filePath, function(exists, errorPath){ 
                if (!exists) {
                    response.writeHead(404, {
                        'Content-Type': 'text/plain'
                    });

                    response.write("This request URL " + (errorPath || filePath) + " was not found on this server.");
                    response.end();
                } else {  
                    taskQueue.done(); 
                } 
            }, dirs);  
             
        }); 


        // 处理请求文件
        taskQueue.add(function(){ 
            if(ext == 'ftl'){
                taskQueue.done();
            }else{
                util.readFile(filePath, "binary", function(err, file) {
                    if (err) {
                        response.writeHead(500, {
                            'Content-Type': 'text/plain'
                        }); 
                        response.write("Can not read file:" + filePath);
                        response.end();
                    } else {
                        var contentType = mine[ext] || "text/plain";
                        response.writeHead(200, {
                            'Content-Type': contentType
                        });
                        response.write(file, "binary");
                        response.end();
                    }
                }, dirs); 
            }
        });


        // ftl模板文件
        taskQueue.add(function(){
            var jsonPath = path.join('./data', filePath.replace(/\.ftl$/, '.json'));
            // console.log(jsonPath);
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
                            util.deepCopy(coverData, data);
                            // for(oneData in coverData){
                            //     if(typeof(data[oneData]) == 'object'){

                            //     }
                            //     data[oneData] = coverData[oneData];
                            // }
                        };
                        // console.log(data);

                        fm.render(filePath, data, function(err, data, out) { 
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
                    fm.render(filePath, {}, function(err, data, out) {
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









