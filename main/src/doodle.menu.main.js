(function ($) {

  // setup menu
  $.fn.kDoodle.menus.main = {
  	img:  'plugins/kDoodle/main/img/icons-menu-main.png',
    items: {
      undo: {
        icon: 'generic',
        title: '后退',
        index: 0,
        callback: function () { this.undo(); }
      },
      redo: {
        icon: 'generic',
        title: '前进',
        index: 1,
        callback: function () { this.redo(); }
      },
      clear: {
        icon: 'generic',
        title: '清除',
        index: 2,
        callback: function () { this.clear(); }
      },
      rectangle: {
        icon: 'activate',
        title: '矩形',
        index: 3,
        callback: function () { this.setMode('rectangle'); }
      },
      ellipse: {
        icon: 'activate',
        title: '椭圆',
        index: 4,
        callback: function () { this.setMode('ellipse'); }
      },
      line: {
        icon: 'activate',
        title: '直线',
        index: 5,
        callback: function () { this.setMode('line'); }
      },
      pencil: {
        icon: 'activate',
        title: '铅笔',
        index: 6,
        callback: function () { this.setMode('pencil'); }
      },
      eraser: {
        icon: 'activate',
        title: '橡皮',
        index: 8,
        callback: function () { this.setMode('eraser'); }
      },
      bucket: {
        icon: 'activate',
        title: '填充',
        index: 9,
        callback: function () { this.setMode('bucket'); }
      },
      scale: {
      	icon: 'activate',
      	title: '放大',
      	index: 10,
      	callback: function () { this.setMode('scale'); }
      },
      translate: {
      	icon: 'activate',
      	title: '拖动',
      	index: 11,
      	callback: function () { this.setMode('translate'); }
      },
      fillStyle: {
        title: '填充颜色',
        icon: 'colorPicker',
        callback: function (color) { this.setFillStyle(color); }
      },
      lineWidth: {
        icon: 'select',
        title: '线宽',
        range: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        value: 2,
        callback: function (width) { this.setLineWidth(width); }
      },
      strokeStyle: {
        icon: 'colorPicker',
        title: '线条颜色',
        callback: function (color) { this.setStrokeStyle(color); }
      }      
    }
  };

  // extend cursors
  $.extend($.fn.kDoodle.cursors, {
  	'default': { path: 'plugins/kDoodle/main/img/cursor-crosshair.png', left: 7, top: 7 },
  	'dropper': { path:  'plugins/kDoodle/main/img/cursor-dropper.png', left: 0, top: 12 },
  	'pencil': { path:  'plugins/kDoodle/main/img/cursor-pencil.png', left: 0, top: 11.99 },
  	'bucket': { path:  'plugins/kDoodle/main/img/cursor-bucket.png', left: 0, top: 10 },
  	'eraser1': { path:  'plugins/kDoodle/main/img/cursor-eraser1.png', left: 1, top: 1 },
  	'eraser2': { path:  'plugins/kDoodle/main/img/cursor-eraser2.png', left: 2, top: 2 },
  	'eraser3': { path: 'plugins/kDoodle/main/img/cursor-eraser3.png', left: 2, top: 2 },
  	'eraser4': { path:  'plugins/kDoodle/main/img/cursor-eraser4.png', left: 3, top: 3 },
  	'eraser5': { path: 'plugins/kDoodle/main/img/cursor-eraser5.png', left: 3, top: 3 },
  	'eraser6': { path: 'plugins/kDoodle/main/img/cursor-eraser6.png', left: 4, top: 4 },
  	'eraser7': { path: 'plugins/kDoodle/main/img/cursor-eraser7.png', left: 4, top: 4 },
  	'eraser8': { path:'plugins/kDoodle/main/img/cursor-eraser8.png', left: 5, top: 5 },
  	'eraser9': { path:  'plugins/kDoodle/main/img/cursor-eraser9.png', left: 5, top: 5 },
  	'eraser10': { path:  'plugins/kDoodle/main/img/cursor-eraser10.png', left: 6, top: 6 }
  });

  // extend defaults
  $.extend($.fn.kDoodle.defaults, {
    mode:        'pencil',  // set mode
    lineWidth:   '2',       // 初始线宽
    fillStyle:   'transparent', // 初始填充颜色
    strokeStyle: '#339966'  // 初始填充样式
  });

  // extend functions
  $.fn.kDoodle.extend({
    undoCurrent: -1,
    undoArray: [],
    setUndoFlag: true,
  	undoMax:100,//最多只能返回99步(因为初始化已经占用了1步)

    generate: function () {
      this.menus.all.main = this._createMenu('main', {
        offsetLeft: this.options.menuOffsetLeft,
        offsetTop: this.options.menuOffsetTop
      });
    },

    _init: function () {
      this._addUndo();
      this.menus.all.main._setIconDisabled('clear', true);
    },

    setStrokeStyle: function (color) {
      this.options.strokeStyle = color;
      this.menus.all.main._setColorPickerValue('strokeStyle', color);
    },

    setLineWidth: function (width) {
      this.options.lineWidth = width;
      this.menus.all.main._setSelectValue('lineWidth', width);

      this.setCursor(this.options.mode);
    },

    setFillStyle: function (color) {
      this.options.fillStyle = color;
      this.menus.all.main._setColorPickerValue('fillStyle', color);
    },

    setCursor: function (cursor) {
      if (cursor === 'eraser') {
        this.setCursor('eraser' + this.options.lineWidth);
      }
    },

    /****************************************
     * undo / redo
     ****************************************/
    undo: function () {
      if (this.undoArray[this.undoCurrent - 1]) {
        this._setUndo(--this.undoCurrent);
      }

      this._undoToggleIcons();
    },

    redo: function () {
      if (this.undoArray[this.undoCurrent + 1]) {
        this._setUndo(++this.undoCurrent);
      }

      this._undoToggleIcons();
    },

    _addUndo: function () {//把操作历史记录保存起来

    	//如果undoCurrent不是指向数组的最后一个元素，我们需要用最新图像替换数组的当前位置的元素
      if (this.undoCurrent < this.undoArray.length - 1) {
        this.undoArray[++this.undoCurrent] = this.getImage(false);
      }
      else { // 
        this.undoArray.push(this.getImage(false));


        if (this.undoArray.length > this.undoMax) {
        	//this.undoArray = this.undoArray.slice(1, this.undoArray.length);
        	this.undoArray.shift();
        }
        else { this.undoCurrent++; }
      }

    	//for undo's then a new draw we want to remove everything afterwards - in most cases nothing will happen here
		//在undo之后画新的图，我们需要移除当前指针之后的所有图像，在大多数情况下不会走这里
      while (this.undoCurrent !== this.undoArray.length - 1) {
      	this.undoArray.pop();
      }

      this._undoToggleIcons();
      this.menus.all.main._setIconDisabled('clear', false);
    },

    _undoToggleIcons: function () {//根据当前的状态判断undo和redo的显示状态
      var undoIndex = (this.undoCurrent > 0 && this.undoArray.length > 1) ? 0 : 1,
          redoIndex = (this.undoCurrent < this.undoArray.length - 1) ? 2 : 3;

      this.menus.all.main._setIconDisabled('undo', undoIndex === 1 ? true : false);
      this.menus.all.main._setIconDisabled('redo', redoIndex === 3 ? true : false);
    },

    _setUndo: function (undoCurrent) {//获取后退或者前进的图片
      this.setImage(this.undoArray[undoCurrent], null, null, true);
    },

    /****************************************
     * clear
     ****************************************/
    clear: function () {

      // only run if not disabled (make sure we only run one clear at a time)
      if (!this.menus.all.main._isIconDisabled('clear')) {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this._addUndo();
        this.menus.all.main._setIconDisabled('clear', true);
      }
    },

    /****************************************
     * rectangle
     ****************************************/
    _drawRectangleDown: function (e) { this._drawShapeDown(e); },

    _drawRectangleMove: function (e) {
      this._drawShapeMove(e);

      this.ctxTemp.rect(e.x, e.y, e.w, e.h);
      this.ctxTemp.stroke();
      this.ctxTemp.fill();
    },

    _drawRectangleUp: function (e) {
      this._drawShapeUp(e);
      this._addUndo();
    },

  	/****************************************
     * scale
     ****************************************/
    _drawScaleDown: function (e) { this._drawShapeDown(e); },

    _drawScaleMove: function (e) {
    	this._drawShapeMove(e);

    	this.ctxTemp.rect(e.x, e.y, e.w, e.h);
    	this.ctxTemp.stroke();
    	this.ctxTemp.fill();
    },

    _drawScaleUp: function (e, flag) {
    	//var img = this.getImage();
    	//this.ctx.scale(1.75, 1.75);

    	//var canvas = document.getElementById("myCanvas");
    	//var context = canvas.getContext("2d");
    	this.ctx.save();  //先保存下绘图状态
    	//this.ctx.translate(-this.canvasBg.width / 2, -this.canvasBg.height / 2);  //进行位移操作
    	//this.ctx.scale(1.2,1.2);
    	//this.ctx.translate(this.canvasBg.width / 2, this.canvasBg.height / 2);  //进行位移操作

    	//this.ctx.drawImage(this.canvasBg, 0, 0)
    	//this.ctx.drawImage(this.canvas, 0, 0)

    	context.clearRect(-this.ctx.canvas.width, -this.ctx.canvas.width, 2 * this.ctx.canvas.width, 2 * this.ctx.canvas.height);
    	context.drawImage(
			   img, //规定要使用的图像、画布或视频。
			   0, 0, //开始剪切的 x 坐标位置。
			   img.width, img.height,  //被剪切图像的高度。
			   imgX, imgY,//在画布上放置图像的 x 、y坐标位置。
			   img.width * imgScale, img.height * imgScale  //要使用的图像的宽度、高度
		   );
    	//this.ctxBg.scale(1.75, 1.75);
    	this._drawShapeUp(e,true);
    	//this._addUndo();
    },
  	/****************************************
     * scale-translate
     ****************************************/
    _drawTranslateDown: function (e) { this._drawShapeDown(e); },

    _drawTranslateMove: function (e) {
    	//this._drawShapeMove(e);

    	this.ctxTemp.rect(e.x, e.y, e.w, e.h);
    	//this.ctxTemp.stroke();
    	//this.ctxTemp.fill();
    },

    _drawTranslateUp: function (e, flag) {

    	//this._drawShapeUp(e, true);
    	//this._addUndo();
    },


  	/****************************************
     * 适合大小
     ****************************************/
    strength: function () {

    	//if (!this.menus.all.main._isIconDisabled('clear')) {
    	//	this.ctx.clearRect(0, 0, this.width, this.height);
    	//	this._addUndo();
    	//	this.menus.all.main._setIconDisabled('clear', true);
    	//}
    },
    /****************************************
     * ellipse
     ****************************************/
    _drawEllipseDown: function (e) { this._drawShapeDown(e); },

    _drawEllipseMove: function (e) {
      this._drawShapeMove(e);

      this.ctxTemp.ellipse(e.x, e.y, e.w, e.h);
      this.ctxTemp.stroke();
      this.ctxTemp.fill();
    },

    _drawEllipseUp: function (e) {
      this._drawShapeUp(e);
      this._addUndo();
    },

    /****************************************
     * line
     ****************************************/
    _drawLineDown: function (e) { this._drawShapeDown(e); },

    _drawLineMove: function (e) {
      this._drawShapeMove(e, 1);

      var xo = this.canvasTempLeftOriginal;
      var yo = this.canvasTempTopOriginal;
      
      if (e.pageX < xo) { e.x = e.x + e.w; e.w = e.w * - 1; }
      if (e.pageY < yo) { e.y = e.y + e.h; e.h = e.h * - 1; }
      
      this.ctxTemp.lineJoin = 'round';
      this.ctxTemp.beginPath();
      this.ctxTemp.moveTo(e.x, e.y);
      this.ctxTemp.lineTo(e.x + e.w, e.y + e.h);
      this.ctxTemp.closePath();
      this.ctxTemp.stroke();
    },

    _drawLineUp: function (e) {
      this._drawShapeUp(e);
      this._addUndo();
    },

    /****************************************
     * pencil
     ****************************************/
    _drawPencilDown: function (e) {
      this.ctx.lineJoin = 'round';
      this.ctx.lineCap = 'round';
      this.ctx.strokeStyle = this.options.strokeStyle;
      this.ctx.fillStyle = this.options.strokeStyle;
      this.ctx.lineWidth = this.options.lineWidth;
      
      this.ctx.beginPath();
      this.ctx.arc(e.pageX, e.pageY, this.options.lineWidth / 2, 0, Math.PI * 2, true);
      this.ctx.closePath();
      this.ctx.fill();
      
      //start the path for a drag
      this.ctx.beginPath();
      this.ctx.moveTo(e.pageX, e.pageY);
    },
    
    _drawPencilMove: function (e) {
      this.ctx.lineTo(e.pageX, e.pageY);
      this.ctx.stroke();
    },
    
    _drawPencilUp: function () {
      this.ctx.closePath();
      this._addUndo();
    },

    /****************************************
     * eraser
     ****************************************/
    _drawEraserDown: function (e) {
      this.ctx.save();
      this.ctx.globalCompositeOperation = 'destination-out';
      this._drawPencilDown(e);
    },
    
    _drawEraserMove: function (e) {
      this._drawPencilMove(e);
    },
    
    _drawEraserUp: function (e) {
      this._drawPencilUp(e);
      this.ctx.restore();
    },

    /****************************************
     * bucket
     ****************************************/
    _drawBucketDown: function (e) {
      this.ctx.fillArea(e.pageX, e.pageY, this.options.fillStyle);
      this._addUndo();
    }
  });
})(jQuery);
