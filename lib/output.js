/**
* @输出编译后的工程文件
* @author  guotingjie <guotingjie@yolo24.com>
*/

//exports
var output = module.exports = {};


var copyDefaultDir = function(){
  //jdf.config.baseDir是一期目录规划的问题
  var cssOutputDir = outputdir + '/' + jdf.config.cssDir.replace(jdf.config.baseDir+'/', '');
  var imagesOutputDir = outputdir + '/' + jdf.config.imagesDir;
  if(jdf.config.baseDir != ''){
    imagesOutputDir = outputdir + '/' + jdf.config.imagesDir.replace(jdf.config.baseDir+'/', '');
  }
  var jsOutputDir = outputdir + '/' + jdf.config.jsDir.replace(jdf.config.baseDir+'/', '');

  //图片目录不位于css/i中
  if(jdf.config.imagesDir.split(jdf.config.cssDir).length  == 1 ){
    f.copy(imagesDir, imagesOutputDir);
  }

  f.copy(cssDir, cssOutputDir, '(css|'+$.imageFileType()+')$', (excludeFiles ? excludeFiles : '(less|scss)$'), null, null, null, encoding);
  f.copy(jsDir, jsOutputDir, (isdebug ? '(js|map)$' : 'js$'), (excludeFiles ? excludeFiles : 'babel$'), null, null, null, encoding);

  // 输出widget todo 可配置
  var outputWidgetDir = outputdir+'/'+jdf.config.widgetDir;
  f.copy(widgetDir, outputWidgetDir,  '(js|css|'+$.imageFileType()+(isdebug ? '|map' : '') + ')$', (excludeFiles ? excludeFiles : '(less|scss|psd)$'), null, null, null, encoding);

  if(f.exists(widgetDir)){

    //将所有widget/images复制到html/images
    fs.readdirSync(widgetDir).forEach(function(dir){
      var source = widgetDir + '/' + dir;
      if(f.isDir(source) && f.exists(source + '/images') ){
        f.mkdir(jdf.config.htmlDir+'/images');
        f.copy(source + '/images', outputdir + '/' + jdf.config.htmlDir+ '/images', null, null, null, null, null, encoding);
      };
    });

    //复制到widget的目标目录之后，再将空目录删除
    fs.readdirSync(outputWidgetDir).forEach(function(dir){
      var realpath = fs.realpathSync(outputWidgetDir + '/' + dir);
      var dirs = fs.readdirSync(realpath);
      var files = f.getdirlist(realpath);

      if(files.length == 0 && dirs.length == 0){
        fs.rmdirSync(realpath);
      }
    });

    //combineWidgetCss下widget中的图片widgert/a/i/a.png输出至css/i/目录下
    if (jdf.config.output.combineWidgetCss){
      f.mkdir(imagesOutputDir);
      var imgList = f.getdirlist(widgetDir, $.imageFileType()+'$');
      imgList.forEach(function(imgListItem){
        f.copy(imgListItem, imagesOutputDir+'/'+ path.basename(imgListItem), null, null, null, null, null, encoding);
      });
    }
  }
}
