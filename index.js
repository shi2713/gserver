//module.exports = require('./package');
var f = require('./lib/file.js');
var gServer = require('./lib/gServer.js');
var path = require('path');
var buildPage = require("./lib/buildPage.js");

var g$ = module.exports;

g$.config = {
  "localServerPort": 80, //本地服务器端口
  // "stageCssServer":"127.0.0.1",
  // "stageJsServer":"127.0.0.1",
  "buildDirName": 'html',
  "outputdirName": 'build', // 编译输出目录
  "cssDir": "css", //css文件夹名称
	"imagesDir": "css/i", //images文件夹名称
	"jsDir": "js", //js文件夹名称
  "htmlDir": "html",
  "output": {
    "cssCombo": true,
    "jsCombo": true,
    "jsPlace": "insertBody",
    "encoding": 'UTF-8'
  },
  "jsCdn":"http://js.gomein.net.cn",
  "cssCdn":"http://css.gomein.net.cn",//http://127.0.0.1
  "cdn":'http://css.gomein.net.cn'
};

/**
 * @build html
 */
g$.buildMain = function(type, param) {
    var builddir = '/' + g$.config.buildDirName + '/';
    var basedir = g$.currentDir + builddir;
    var encoding = g$.config.output.encoding;

    //build html
    if (f.exists(basedir)) {
        var basedirlist = f.getdirlist(basedir, '.html$');
        basedirlist.forEach(function(source) {

            //var target = path.normalize(g$.bgCurrentDir + builddir + source.replace(basedir, ''));
            buildPage.init(source, f.read(source), 'output', function(data) {

                var outputdirName = g$.config.outputdirName;
                var outputdir = g$.currentDir+'/' + outputdirName+'/'+ g$.getProjectPath() + builddir;

                if(!f.exists(outputdir)) {
                  f.mkdir(outputdir);
                }

                if(f.excludeFiles(outputdir + source.replace(basedir, ''))){
                    f.write(outputdir + source.replace(basedir, ''), data.tpl, encoding);
                }

                return 'ok';

            }, param);
        });
    }
}

/**
 * @后台文件夹生成
 * @g$.bgCurrentDir 后台文件根目录
 */
g$.bgMkdir = function() {

    var list = ['LOCALAPPDATA', 'HOME', 'APPDATA'];
    var temp;
    for (var i = 0, len = list.length; i < len; i++) {
        if (temp = process.env[list[i]]) {
            break;
        }
    }
    if (temp) {
        temp = temp || __dirname + '/../';
        temp += '/.g$-temp/';
        temp = path.normalize(temp);
        f.mkdir(temp);

        //创建文件夹
        var creatDir = function(filename) {
            var dir = path.normalize(temp + '/' + filename + '/');
            f.mkdir(dir);
            g$[filename + 'Dir'] = dir;
        };

        //项目缓存文件夹
        creatDir('cache');
        //项目temp文件夹
        creatDir('temp');

        //复制当前项目至temp文件夹(除outputdir)
        //取得当前工程名
        var currentDirName = path.basename(g$.currentDir);
        g$.bgCurrentDir = path.normalize(g$.tempDir + '/' + currentDirName);

        g$.bgCurrentDirName = currentDirName;
        f.mkdir(g$.bgCurrentDir);
    }
}

/**
 * @复制当前项目至工程后台目录
 * @仅copy css文件
 */
g$.bgCopyDir = function() {
  f.copy(g$.currentDir + '/' + g$.config.cssDir, g$.bgCurrentDir + '/' + g$.config.cssDir);
  f.copy(g$.currentDir + '/' + g$.config.htmlDir, g$.bgCurrentDir + '/' + g$.config.htmlDir);
}

/**
 * @从服务器端下载文件
 */
g$.download = function(url, callback) {
    var downloadDir = path.normalize(g$.bgCurrentDir + require('url').parse(url).path);

    //console.log('begin downloading : ' + url);

    f.download(url, downloadDir, function(data) {
        if (data == 'ok') {
          callback && callback();
        } else if (data == 'error') {

        }
    });
}

/**
 * @获取项目前缀名字
 */
g$.getProjectPath = function() {
    var currentDir = f.currentDir(),
        nowDir = '',
        result = '';
    if (g$.config.projectPath != null) {
        result = g$.config.projectPath;
    } else {
        //当前文件夹的文件夹命名为projectPath
        result = path.basename(f.currentDir());
    }
    return result;
}

/**
 * @服务器
 * @param {Boolse}  comboDebug 联调/线上调试模式
 */
g$.server = function(serverPort, comboDebug, callback) {
  comboDebug = comboDebug || false;

  g$.bgMkdir();
  //g$.bgCopyDir();
  gServer.init( g$.bgCurrentDir, serverPort, g$.config.cdn, g$.getProjectPath(), comboDebug, null );

  console.log('gome server : Port ' + serverPort);
}

/**
 * @开始构建工程
 */
g$.build = function() {

  g$.bgMkdir();
  g$.bgCopyDir();
  g$.buildMain();
}

/**
 * @入口
 */
g$.init = function(argv) {
  var cmd2 = argv[2];
  g$.currentDir = f.currentDir();

  if (cmd2 === 'b' || cmd2 === 'build') {
      g$.build();
  } else if(cmd2 === 's' || cmd2 === 'server') {
      g$.server(argv[3] || g$.config.localServerPort ,false, null);
  }
}

g$.init(process.argv);
