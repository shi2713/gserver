'use strict';

/**
 * 引入的相关css、js路径替换
 * @example
  <link rel="stylesheet" href="http://css.gomein.net.cn/??gmlib/reset/1.1.0/reset.css,gmpro/1.0.0/public/1.0.0/css/aside.min.css,gmpro/1.0.0/public/1.0.0/css/category.min.css,gmpro/1.0.0/public/1.0.0/css/topad.min.css,gmpro/1.0.0/public/1.0.0/css/top.min.css,gmpro/1.0.0/public/1.0.0/css/head.min.css,gmpro/1.0.0/public/1.0.0/css/foot.min.css?v=201604150939">
 * @author  guotingjie <guotingjie@yolo24.com>
 */
var path = require('path');
var fs = require('fs');
var g$ = require('../index.js');

// exports
var buildPage = module.exports = {};

/**
 * @init
 */
buildPage.init = function(inputPath, content, type, callback, param) {

  var isBuild = type == 'build';
	var isRelease = type == 'release';
	var isOutput = type == 'output';

	//css,js路径替换
	if (isOutput) content = staticUrlReplace(content);

	var origin = content;
	// var isJM = false;
	var cssFile='' , jsFile='';
	// var cssComboArr = [];
	// var jsComboArr = [];

  var data = {
		origin:origin,
		tpl:content,
		css:cssFile,
		js:jsFile
	}
	if (callback) callback(data);
}

var $ = {
  reg: {
    cssStr : '<link\\s.*?stylesheet\\s*.*href="(.*?)".*?>',
		cssLink:function(){
			return new RegExp(this.cssStr,'gm');
		},
		jsStr : '<script\\s.*?src="(.*?)".*?</script>',
		jsLink:function(){
			return new RegExp(this.jsStr,'gm');
		},
		staticPre:function(){
			return new RegExp('.*?static','gm');
		},
		htmlComment: function(){
			return new RegExp('<!--[\\S\\s]*?-->', 'g');
		}
  },
  placeholder:{
		csscomboLink : function(url){
			 return '<link type="text/css" rel="stylesheet"  href="'+url+'" source="combo"/>\r\n';
		},
		cssLink : function(url){
			 return '<link type="text/css" rel="stylesheet"  href="'+url+'" source="widget"/>\r\n';
		},
		jscomboLink:function(url){
			 return '<script type="text/javascript" src="'+url+'" source="widget"></script>\r\n';
		},
		jsLink:function(url){
			 return '<script type="text/javascript" src="'+url+'" source="widget"></script>\r\n';
		},
		insertHead:function(content,str){
			if ( /<\/head>/.test(content) ){
				return content.replace('</head>',str+'</head>');
			}else{
				return str + content;
			}
		},
		insertBody:function(content,str){
			if ( /<\/body>/.test(content) ){
				return content.replace('</body>',str+'</body>');
			}else{
				return content + str;
			}
		}
	},
  is:{
    //含有http,https
		httpLink:function(str){
			return /^http:\/\/|https:\/\/|\/\//.test(str);
		}
  }
}

/**
 * @name $.isArray
 * @param {All} obj 主体
 * @return {Boolean} true/false
 */
$.isArray = function(obj){
	return Object.prototype.toString.apply(obj) === '[object Array]';
}

/**
 * @数组去重
 * @算法: 设置成一个对象的属性
 */
$.uniq = function (arr){
	if($.isArray(arr)){
		var obj = {};
		for (var i=0; i<arr.length; i++){
			obj[arr[i]]=i;
		}
		arr=[];
		var j = 0;
		for (var i in obj){
			arr[j] = i;
			j += 1;
		}
	}
	return arr;
}

/**
* 原页面上的静态资源css, js链接替换处理: js直接加cdn, css链接根据配置是否combo加cdn
* @param {String} str 源代码
* @return {String} 替换后的源代码
* @example
	<link type="text/css" rel="stylesheet"  href="../gmpro/css/main.css" />
	<link type="text/css" rel="stylesheet"  href="../gmpro/css/page.css" />
	==>
	<link type="text/css" rel="stylesheet"  href="http://css.gomein.net.cn/??productpath/css/main.css,productpath/css/less.css" />
  ------------------------------------------------------------------------------------------------------------------------------
	<script type="text/javascript" src="../app/js/common.js"></script>
	 ==>
	<script type="text/javascript" src="http://cdnurl.com/productpath/js/common.js"></script>
*/
function staticUrlReplace(str) {
	var replaceCore = function(str, type) {
		var regStr = $.reg[type + 'Str'];
		var reg = new RegExp(regStr, 'gm');
		var regResult = str.match(reg);

		if (regResult) {
			var comboArray = [];
			regResult.forEach(function(item) {
				var reg = new RegExp(regStr, 'gm');
				var i = reg.exec(item);
				var cdnRegStr = 'http://' + type + '.gomein.net.cn';
				var cdnReg = new RegExp(cdnRegStr + '/', 'gm');
				var k = i['input'];

				var strReplace = function() {
					if (!/href="\/\//.test(k)) {
						str = str.replace(k + '\r\n', '');
					}
				}

				if (i) {
					//url
					var j = i[1];
					if (!$.is.httpLink(i[1])) {
						j = projectPathReplace(j);
					} else {
						g$.download(j, function(download) {});
						j = j.replace(cdnRegStr, '');
					}

					var widgetReg = new RegExp('^' + g$.config.widgetDir, 'gm');
					if (!widgetReg.test(j)) {
						comboArray.push(j);
						strReplace();
					}
				}
			});

			if (comboArray.length > 0) {
				comboArray = $.uniq(comboArray);
				var tagSrc = '';

				//combo
				if (g$.config.output[type + 'Combo']) {
					var cdnPrefix = '';
					cdnPrefix = g$.config[type + 'Cdn'] + (comboArray.length > 1 ? '/??' : '/');
					var comboUrl = comboArray.join(',');
					comboUrl = comboUrl.replace(/\/\//gm, '/');
					var staticUrl = cdnPrefix + comboUrl;
					tagSrc = '' + $.placeholder[type + 'comboLink'](staticUrl);
				} else {
					for (var i = 0; i < comboArray.length; i++) {
						var item = comboArray[i];
						item = g$.config.cdn ? g$.config.cdn + '/' + item : item;
						item = addgetProjectPath(item);
						tagSrc += $.placeholder[type + 'Link'](item);
					}
				}

				if (type == 'js') {
					str = insertJs(str, tagSrc, g$.config.output.jsPlace);
				} else {
					str = $.placeholder.insertHead(str, tagSrc);
				}
			}
		}
		return str;
	}

	str = replaceCore(str, 'css');
	str = replaceCore(str, 'js');
	return str;
}

/**
 * @addgetProjectPath
 */
function addgetProjectPath(str){
	if(!g$.config.cdn && !/^\.\./.test(str)){
		str = '..'+str;
	}
	return str ;
}

/**
 * @projectPathReplace
 * @example
	/css/index.css
	../css/index.css
	==>
	projectPath/css/index.css
 */
function projectPathReplace(j){
	j = j.replace(g$.config.baseDir, '');

	if(g$.config.cdn){
		j = j.replace(/\.\.\//g,'/');
		//add projectPath
		j = g$.getProjectPath() +	j;
		// del ../  ./
		if (j.charAt(0) == '/') { j = j.replace('/','');}
		// 替换./和//为/
		j = j.replace(/\/\/|\.\//gm, '/');
	}

	// // ==> /
	j = j.replace(/\/\//gm,'/');
	return j;
}

/**
 * @insertJs
 * @(考虑到性能 insertHead -> insertBody) -> 放head有利于前后端沟通,可通过配置修改
 * @jdf.config.output.jsPlace 'insertHead' --> header ; 'insertBody' --> body
 */
function insertJs(content, jsLink, jsPlace){
	if(jsPlace == 'insertHead'){
		content = $.placeholder.insertHead(content, jsLink);
	}else if(jsPlace == 'insertBody'){
		content = $.placeholder.insertBody(content, jsLink);
	}
	return content;
}
