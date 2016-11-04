#!/usr/bin/env node
var path = require('path');
const Liftoff = require('liftoff');
const argv = require('minimist')(process.argv.slice(2));

const gserver = new Liftoff({
  name: 'gserver', 
  extensions:  {
    '.js': null
    ,cwd: argv.cwd
  }, 
  v8flags: ['--harmony']   
});

if(process.argv.indexOf('init') > -1){ 
  require( path.join(__dirname, '../lib/util.js') ).copy(path.join(__dirname, "../", "./example"), './');
}else{
  require( path.join(__dirname, '../lib/server.js') ).start(process.argv);
}



