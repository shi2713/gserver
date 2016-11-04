/**
* @文件操作
* @author  guotingjie <guotingjie@yolo24.com>
*/

//原生组件
var path = require('path');
var fs = require('fs');
var util = require('util');
var Url = require('url');

var f = module.exports = {
  exists:fs.existsSync || path.existsSync,
  isFile : function(path){
		return this.exists(path) && fs.statSync(path).isFile();
	},
	isDir : function(path){
		return this.exists(path) && fs.statSync(path).isDirectory();
	},
  realpath : function(path){
		if(path && f.exists(path)){
			path = fs.realpathSync(path);
			if(this.isWin){
				path = path.replace(/\\/g, '/');
			}
			if(path !== '/'){
				path = path.replace(/\/$/, '');
			}
			return path;
		} else {
			return false;
		}
	},
  /**
	* @路径格式化 \ ==> /
	*/
	pathFormat:function(str){
		return str.replace(/\\/g,'\/');
	},
	currentDir:function(){
		return fs.realpathSync('.');
	},
  /**
	* @读文件
	* @update
	*/
	read:function(path,encodeing){
		if (this.exists(path)){
			try {
				var encodeing = encodeing || 'utf8';
				return fs.readFileSync(path,encodeing);
			} catch (e) {
				console.log("error [f.read]");
				console.log(path);
				console.log(e);
			}
		}
	},
	/**
	* @写文件
	*/
	write:function(path,source,encodeing){
		try {
			var encodeing = encodeing || 'utf8';

			if(encodeing == 'gbk'){
				var s = iconv.decode(source, 'gbk');
    			source = iconv.encode(s, 'gbk');
    		}

			fs.writeFileSync(path , source, encodeing);
		} catch (e) {
			console.log("error [f.write] " + path);
			console.log(e);
		}
	},
  /**
	* @文件夹/文件 不包括的那些文件
	*/
	excludeFiles:function(filename){
		 return !(/.svn|Thumbs.db|.DS_Store/.test(filename));
	},
  /**
	* @删除文件
	* @param source {String} 原始路径
	* @param callback {Function} 回调函数
	*/
	del:function(source,callback){
		var removedAll = true;
		var source = f.realpath(source);

		if(source){
			if(f.isDir(source)){
				var files;
				try {
					files = fs.readdirSync(source);
				} catch (err) {
					console.log(err);
				}

				files.forEach(function(name){
					if(name != '.' && name != '..') {
						removedAll = f.del(source + '/' + name) && removedAll;
					}
				});

				if(removedAll) {
					if(fs.existsSync(source)){
						fs.rmdirSync(source);
					}

					if(callback) callback();
				}
			} else if(f.isFile(source)){
				if (f.isWin && f.exists(source)) {
					fs.chmodSync(source, 666);
				}
				fs.unlinkSync(source);
			} else {
				removedAll = false;
			}
		}

		return removedAll;
	},
  /**
	* @文件筛选
	* @param {String}  source  原始文件夹/文件路径
	* @param {String}  include  包括的文件后缀
	* @param {String}  exclude  不包括的文件后缀
	* @example f.filter(source, null, 'less|scss')
	*/
  filter:function(source, include, exclude) {
    var filterTag = true;
		if (include) {
			var reg = new RegExp(include, 'gm');
			var regResult = reg.exec(source);
			if (!regResult) {
				filterTag = false;
			}
		}

		if (exclude) {
			var reg = new RegExp(exclude, 'gm');
			var regResult = reg.exec(source);
			if (regResult) {
				filterTag = false;
			}
		}

		return filterTag;
  },
  /**
	* @文件夹/文件复制
	* @param source {String} 原始文件夹/文件路径
	* @param target {String} 目标文件夹/文件路径
	* @param uncover {Boole} false 覆盖
	* @param move {Boole} false 移动
	* @example f.copy(source,target,'include.js','exclude.css',false,false,false);
	*/
	copy:function(source, target, include, exclude, uncover, move , logTag, encoding){
		var removedAll = true;
		var source = f.realpath(source);

		if(source && f.filter(source, null, exclude)){
			if (!f.exists(target) && f.isDir(source)) {
				f.mkdir(target);
			}

			if(f.isDir(source)){
				fs.readdirSync(source).forEach(function(name){
					if(name != '.' && name != '..' && f.excludeFiles(name)  ) {
						removedAll = f.copy(source + '/' + name,target + '/' + name, include, exclude, uncover, move , logTag ) && removedAll;
					}
				});

				if(move && removedAll) {
					fs.rmdirSync(source);
				}
			} else if(f.isFile(source) && f.filter(source, include, exclude)){
				if(uncover && f.exists(target)){
					//uncover
					removedAll = false;
				} else {
					//中文会报错
					f.write(target,fs.readFileSync(source), encoding);
          //f.copyBinary(source,target)
					if(move) {
						fs.unlinkSync(source);
					}
				}
			} else {
				removedAll = false;
			}
		} else {
			if (typeof(logTag) != 'undefined' && logTag) {
				console.log('error : [ '+source+' ] --- no such file or dir');
			}
		}
		return removedAll;
	},
	/**
	* @下载文件
	* @param path 下载文件路径
	* @param target 目标文件名
	*/
	download:function(source,target,callback){
		var http = require('http');
		var fs = require('fs');

    // 创建目录
    this.mkdir(target.substr(0,target.lastIndexOf('\\')));
		var file = fs.createWriteStream(target);
		var request = http.get(source,function(response) {
			var status = response.statusCode;
			response.pipe(file);

			response.on('end',function(){
				if(status >= 200 && status < 300 || status === 304){
					if(callback) callback('ok');
				}

				if(status === 404){
					console.log('download error '+source+ ' not exist.');
					if(callback) callback('error');
				}
			});

			response.on('error',function(err){
				 var msg = typeof err === 'object' ? err.message : err;
				 console.log(err);
			})
		});
	}
}

//同步mkdir
f.mkdir = function(p, mode, made) {
    if (mode === undefined) {
        mode = 0777 & (~process.umask());
    }
    if (!made) made = null;

    if (typeof mode === 'string') mode = parseInt(mode, 8);
    p = path.resolve(p);

	if ( !f.exists(p) ) {
		try {
			fs.mkdirSync(p, mode);
			made = made || p;
		}
		catch (err0) {
			switch (err0.code) {
				case 'ENOENT' :
					made = f.mkdir(path.dirname(p), mode, made);
					f.mkdir(p, mode, made);
					break;
				default:
					var stat;
					try {
						stat = fs.statSync(p);
					}
					catch (err1) {
						throw err0;
					}
					if (!stat.isDirectory()) throw err0;
					break;
			}
		}
		return made;
	}
};


/**
* @递归读取文件列表
* @2016-4-15
*/
f.getdirlist = function(source, include, exclude) {
  var _this = this;
  var result = [];

  if(source){
    if(f.isDir(source)){
      fs.readdirSync(source).forEach(function(name){
        result = result.concat(_this.getdirlist(source + '/' + name, include, exclude) );
      });
    } else if(f.isFile(source) && f.filter(source, include, exclude)){
      result.push(source.replace("//","/"));
    }
  }
  return result;
}

/**
 * @读取json
 * @2016-4-15
 */
f.readJSON = function(url, callback){
	var res = null;
	if (f.exists(url)) {
		try{
			var data = f.read(url);
			if (data) {
				data = JSON.parse(data);
				res = data;
			}
			if(callback) callback(res);
		}catch(e){
			console.log('error [f.readJSON] "'+url+'" format error' );
			console.log(e);
			//if(callback) callback(res);
		}
	}else{
		console.log('error [f.readJSON] "'+url+'" is not exists' );
		//if(callback) callback(res);
	}
}
