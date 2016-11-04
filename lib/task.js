// ;(function(){
    var Task = this.Task = {};

    // 队列任务
    function TaskQueue(){
        this._taskQueue = [];
        this._successQueue  = [];
        this._errorQueue = [];
        this.taskIndex = -1;
        this._isError = false;
    }
    TaskQueue.prototype = {
        constructor: TaskQueue
        ,add: function(fn){
            this._taskQueue.push(fn);
        }
        ,start: function(){
            this.done();
        }
        ,done: function(){ 
            var taskIndex = ++this.taskIndex;
            var taskQueue = this._taskQueue;
            var successQueue = this._successQueue;
            var i=0,success;

            if(taskIndex == taskQueue.length){  
                for(; success=successQueue[i++]; ){
                    if(typeof(success) == 'function'){
                        success.apply(this, arguments);
                    }
                }
            }else{  
                if(typeof(taskQueue[taskIndex]) == 'function'){
                    taskQueue[taskIndex].call(this);
                }
            }
        }
        ,fail: function(){
            if(this._isError){
                return;
            }
            this._isError = true;
            var errorQueue = this._errorQueue;
            var i=0, error;
            for(; error=errorQueue[i++]; ){
                if(typeof(error) == 'function'){
                    error.apply(this, arguments);
                }
            }
        }
        ,success: function(fn){
            this._successQueue.push(fn);
        }
        ,error: function(fn){
            this._errorQueue.push(fn);
        }
    };

    // 并发任务
    function TaskConcurrency(){
        this._taskList = [];
        this._successQueue  = [];
        this._errorQueue = [];
        this._successCount = 0;
        this._isError = false;
    }
    TaskConcurrency.prototype = {
        constructor: TaskConcurrency
        ,add: function(fn){
            this._taskList.push(fn);
        }
        ,start: function(){
            var i = 0, task;
            var taskList = this._taskList;
            for(; task=taskList[i++]; ){
                if(typeof(task) == 'function'){
                    task.apply(this, arguments);
                }
            }
        }
        ,done: function(){ 
            this._successCount++;
            // console.log(this._successCount + ':' + this._taskList.length);
            var successQueue = this._successQueue;
            var i = 0, success;
            if(this._successCount == this._taskList.length){
                for(; success=successQueue[i++]; ){
                    if(typeof(success) == 'function'){
                        success.apply(this, arguments);
                    }
                }
            }
        }
        ,fail: function(){
            if(this._isError){
                return;
            }
            this._isError = true;
            var errorQueue = this._errorQueue;
            var i=0, error;
            for(; error=errorQueue[i++]; ){
                if(typeof(error) == 'function'){
                    error.apply(this, arguments);
                }
            }
        }
        ,success: function(fn){
            this._successQueue.push(fn);
        }
        ,error: function(fn){
            this._errorQueue.push(fn);
        }
    };

    Task.Queue = TaskQueue;
    Task.Concurrency = TaskConcurrency;

    module.exports = Task;
// })();

// var taskQueue = new Task.Queue;
// taskQueue.add(function(){
//     var that = this;
//     setTimeout(function(){
//         console.log(taskQueue.taskIndex);
//         that.done();
//     }, 5000);
// });
// taskQueue.add(function(){
//     var that = this;
//     setTimeout(function(){
//         console.log(taskQueue.taskIndex);
//         that.done();
//     }, 1000);
// });
// taskQueue.add(function(){
//     var that = this;
//     setTimeout(function(){
//         console.log(taskQueue.taskIndex);
//         that.done();
//     }, 6000);
// }); 
// taskQueue.success(function(){
//     console.log('success...');
// });
// taskQueue.error(function(){
//     console.log('error...');
// });
// taskQueue.start();


// var taskConcurrency = new Task.Concurrency;
// taskConcurrency.add(function(){ 
//     var that = this;
//     setTimeout(function(){
//         console.log('the one');
//         that.fail();
//     }, 2000); 
// });
// taskConcurrency.add(function(){ 
//     var that = this;
//     setTimeout(function(){
//         console.log('the two');
//         that.fail();
//     }, 1000); 
// });
// taskConcurrency.add(function(){ 
//     var that = this;
//     setTimeout(function(){
//         console.log('the three');
//         that.fail();
//     }, 5000); 
// }); 
// taskConcurrency.success(function(){
//     console.log('success...');
// });
// taskConcurrency.error(function(){
//     console.log('error...');
// });
// taskConcurrency.start();


