/*
_setDrag和_createHandle方法依赖jq-ui
*/


(function ($) {
  'use strict';

  /************************************************************************
   * Doodle class
   ************************************************************************/
  function Doodle(el, options) {
    this.$el = $(el);
    this.options = options;
    this.init = false;

    this.menus = {primary: null, active: null, all: {}};
    this.previousMode = null;
    this.width = this.$el.width();//parseInt(window.getComputedStyle(this.$el[0], null).width);
    this.height = this.$el.height();

    this.ctxBgResize = false;
    this.ctxResize = false;
    
    this.generate();
    this._init();
  }
  
  Doodle.prototype = {
    generate: function () {
      if (this.init) { return this; }

      var _this = this;

      // 自动插入每个canvas
      // 同时返回jq对象， 因此可以链式调用
      //  我们将为tempCanvas设置一些临时的属性，但无论如何都会在按下鼠标后被重置
      function createCanvas(name) {
        var newName = (name ? name.capitalize() : ''),
            canvasName = 'canvas' + newName,
            ctxName = 'ctx' + newName;

        _this[canvasName] = document.createElement('canvas');
        _this[ctxName] = _this[canvasName].getContext('2d');
        _this['$' + canvasName] = $(_this[canvasName]);
        //_this[ctxName].scale(2,2)

        _this['$' + canvasName]
        .attr('class', 'kDoodle-canvas' + (name ? '-' + name : ''))
        .attr('width', _this.width + 'px')
        .attr('height', _this.height + 'px')
        .css({position: 'absolute', left: 0, top: 0});

        _this.$el.append(_this['$' + canvasName]);

        return _this['$' + canvasName];
      }

      // event functions
      function canvasMousedown(e) {
        e.preventDefault();
        e.stopPropagation();
        _this.draw = true;//涂鸦的标记
        e.canvasEvent = 'down';
        _this._closeSelectBoxes();
        _this._callShapeFunc.apply(_this, [e]);
      }

      function documentMousemove(e) {
        if (_this.draw) {
          e.canvasEvent = 'move';
          _this._callShapeFunc.apply(_this, [e]);
        }
      }

      function documentMouseup(e) {

        //确保只有在涂鸦时才执行
        if (_this.draw) {
          _this.draw = false;
          e.canvasEvent = 'up';
          _this._callShapeFunc.apply(_this, [e]);
        }
      }

      // create bg canvases
      createCanvas('bg');
      
      // create drawing canvas
      createCanvas('')
      .on('mousedown', canvasMousedown)
      .bindMobileEvents();
      
      // 为画的转移到主canvas之前的临时图形 创建临时的canvas
      createCanvas('temp').hide();
      
      // event handlers for drawing
      $(document)
      .on('mousemove', documentMousemove)
      //.on('mousedown', $.proxy(this._closeSelectBoxes, this))
	    .on('mousedown', this._closeSelectBoxes.bind(this))
      .on('mouseup', documentMouseup);

      // we will need to preset theme to get proper dimensions
      // 当需要创建菜单append到后面时，我们需要重置主题以获得合适的尺寸
      this.setTheme(this.options.theme);
    },

    _init: function () {
      var index = null,
          setFuncName = null;

      this.init = true;

      // 运行任何存在的设置函数
      for (index in this.options) {
        setFuncName = 'set' + index.capitalize();
        if (this[setFuncName]) { this[setFuncName](this.options[index]); }
      }

      // fix menus
      this._fixMenus();

      // 初始化菜单的激活状态
      this.menus.primary._getIcon(this.options.mode).trigger('click');      
    },

    resize: function () {
      var bg = this.getBg(),
          image = this.getImage();

      this.width = this.$el.width();
      this.height = this.$el.height();

      this.canvasBg.width = this.width;
      this.canvasBg.height = this.height;
      this.canvas.width = this.width;
      this.canvas.height = this.height;

      if (this.ctxBgResize === false) {
        this.ctxBgResize = true;
        this.setBg(bg, true);
      }

      if (this.ctxResize === false) {
        this.ctxResize = true;
        this.setImage(image, '', true, true);
      }
    },

    /************************************
     * setters
     ************************************/
    setTheme: function (theme) {
      var i, ii;

      theme = theme.split(' ');

    	// 移除任何以 "kDoodle-theme-" 开始的类名
      this.$el.attr('class', (this.$el.attr('class') || '').replace(/wPaint-theme-.+\s|kDoodle-theme-.+$/, ''));
      
      // 添加每一种主题
      for (i = 0, ii = theme.length; i < ii; i++) {
      	this.$el.addClass('kDoodle-theme-' + theme[i]);
      }
    },

    setMode: function (mode) {
      this.setCursor(mode);//设置鼠标样式
      this.previousMode = this.options.mode;//previousMode是为了保存像设置线宽一类的操作
      this.options.mode = mode;
    },

    setImage: function (img, ctxType, resize, notUndo) {
      if (!img) { return true; }

      var _this = this,
          myImage = null,
          ctx = '';

      function loadImage() {
        var ratio = 1, xR = 0, yR = 0, x = 0, y = 0, w = myImage.width, h = myImage.height;

        if (!resize) {
          // get width/height
          if (myImage.width > _this.width || myImage.height > _this.height || _this.options.imageStretch) {
            xR = _this.width / myImage.width;
            yR = _this.height / myImage.height;

            ratio = xR < yR ? xR : yR;

            w = myImage.width * ratio;
            h = myImage.height * ratio;
          }

          // get left/top (centering)
          x = (_this.width - w) / 2;
          y = (_this.height - h) / 2;
        }

        ctx.clearRect(0, 0, _this.width, _this.height);
        ctx.drawImage(myImage, x, y, w, h);

        _this[ctxType + 'Resize'] = false;

      }
      
      ctxType = 'ctx' + (ctxType || '').capitalize();
      ctx = this[ctxType];
      
      if (window.rgbHex(img)) {
        ctx.clearRect(0, 0, this.width, this.height);
        ctx.fillStyle = img;
        ctx.rect(0, 0, this.width, this.height);
        ctx.fill();
      }
      else {
        myImage = new Image();
        myImage.src = img.toString();
        $(myImage).load(loadImage);
      }
    },

    setBg: function (img, resize) {//设置背景图片
      if (!img) { return true; }
      
      this.setImage(img, 'bg', resize, true);
    },

    setCursor: function (cursor) {//设置鼠标样式
    	cursor = $.fn.kDoodle.cursors[cursor] || $.fn.kDoodle.cursors['default'];

      this.$el.css('cursor', 'url("' + this.options.path + cursor.path + '") ' + cursor.left + ' ' + cursor.top + ', default');
    },

    setMenuOrientation: function (orientation) {//设置菜单的方位
      $.each(this.menus.all, function (i, menu) {
        menu.options.aligment = orientation;
        menu.setAlignment(orientation);
      });
    },

    getImage: function (withBg) {//获得canvas图像的数据和背景图片数据叠加，并转换成base64编码返回
      var canvasSave = document.createElement('canvas'),
          ctxSave = canvasSave.getContext('2d');

      withBg = withBg === false ? false : true;//相当于默认为true，默认包含背景图片

      $(canvasSave)
      .css({display: 'none', position: 'absolute', left: 0, top: 0})
      .attr('width', this.width)
      .attr('height', this.height);

      if (withBg) { ctxSave.drawImage(this.canvasBg, 0, 0); }
      ctxSave.drawImage(this.canvas, 0, 0);

      return canvasSave.toDataURL();
    },

    getBg: function () {//获得背景图片的base64编码
      return this.canvasBg.toDataURL();
    },

    /************************************
     * menu helpers
     ************************************/
    _createMenu: function (name, options) {
      options = options || {};
      options.alignment = this.options.menuOrientation;
      options.handle = this.options.menuHandle;
      
      return new Menu(this, name, options);
    },

    _fixMenus: function () {
      var _this = this,
          $selectHolder = null;

      function selectEach(i, el) {
        var $el = $(el),
            $select = $el.clone();

        $select.appendTo(_this.$el);

        if ($select.outerHeight() === $select.get(0).scrollHeight) {
          $el.css({overflowY: 'auto'});
        }

        $select.remove();
      }

      for (var key in this.menus.all) {
      	$selectHolder = _this.menus.all[key].$menu.find('.kDoodle-menu-select-holder');
        if ($selectHolder.length) { $selectHolder.children().each(selectEach); }
      }
    },

    _closeSelectBoxes: function (item) {
      var key, $selectBoxes;

      for (key in this.menus.all) {
      	$selectBoxes = this.menus.all[key].$menuHolder.children('.kDoodle-menu-icon-select');

      	if (item) { $selectBoxes = $selectBoxes.not('.kDoodle-menu-icon-name-' + item.name); }

      	$selectBoxes.children('.kDoodle-menu-select-holder').hide();
      }
    },

    /************************************
     * events
     ************************************/

    _callShapeFunc: function (e) {

      var canvasOffset = this.$canvas.offset(),
          canvasEvent = e.canvasEvent.capitalize(),
          func = '_draw' + this.options.mode.capitalize() + canvasEvent;
          console.log(func)

		//在这儿更新offsets，因为我们在document上监听mouseup而不是在canvas上
      e.pageX = Math.floor(e.pageX - canvasOffset.left);
      e.pageY = Math.floor(e.pageY - canvasOffset.top);
      // call drawing func
      if (this[func]) { this[func].apply(this, [e]); }

      //如果设置了回调函数则运行回调函数
      if (this.options['draw' + canvasEvent]) { this.options['_draw' + canvasEvent].apply(this, [e]); }

      // 运行用户设置的回调
      if (canvasEvent === 'Down' && this.options.onShapeDown) { this.options.onShapeDown.apply(this, [e]); }
      else if (canvasEvent === 'Move' && this.options.onShapeMove) { this.options.onShapeMove.apply(this, [e]); }
      else if (canvasEvent === 'Up' && this.options.onShapeUp) { this.options.onShapeUp.apply(this, [e]); }
    },

    _stopPropagation: function (e) {
      e.stopPropagation();
    },

    /************************************
     * shape helpers
     ************************************/
    _drawShapeDown: function (e) {
      this.$canvasTemp
      .css({left: e.PageX, top: e.PageY})
      .attr('width', 0)
      .attr('height', 0)
      .show();

      this.canvasTempLeftOriginal = e.pageX;
      this.canvasTempTopOriginal = e.pageY;
    },
    
    _drawShapeMove: function (e, factor) {
    	//$canvasTemp的初始坐标位置
      var xo = this.canvasTempLeftOriginal,
          yo = this.canvasTempTopOriginal;

      // we may need these in other funcs, so we'll just pass them along with the event
      factor = factor || 2;
    	//$canvasTemp的左上角坐标位置
      e.left = (e.pageX < xo ? e.pageX : xo);
      e.top = (e.pageY < yo ? e.pageY : yo);
    	//$canvasTemp的宽高
      e.width = Math.abs(e.pageX - xo);
      e.height = Math.abs(e.pageY - yo);
    	//$canvasTemp的线宽
      e.x = this.options.lineWidth / 2 * factor;
      e.y = this.options.lineWidth / 2 * factor;
      e.w = e.width - this.options.lineWidth * factor;
      e.h = e.height - this.options.lineWidth * factor;

      $(this.canvasTemp)
      .css({left: e.left, top: e.top})
      .attr('width', e.width)
      .attr('height', e.height);
      
      // 保存最新的画布左上角的位置，在mouseup的时候需要用到
      this.canvasTempLeftNew = e.left;
      this.canvasTempTopNew = e.top;

      factor = factor || 2;

      this.ctxTemp.fillStyle = this.options.fillStyle;
      this.ctxTemp.strokeStyle = this.options.strokeStyle;
      this.ctxTemp.lineWidth = this.options.lineWidth * factor;
    },
    
    _drawShapeUp: function () {
    	//把canvasTemp上的图像画到正式画布上
    	this.ctx.drawImage(this.canvasTemp, this.canvasTempLeftNew, this.canvasTempTopNew);
    	//隐藏canvasTemp
      this.$canvasTemp.hide();
    },

    /****************************************
     * dropper 这里调用picker的方法
     ****************************************/
    _drawDropperDown: function (e) {
      var pos = {x: e.pageX, y: e.pageY},
          pixel = this._getPixel(this.ctx, pos),
          color = null;

      color = 'rgba(' + [ pixel.r, pixel.g, pixel.b, pixel.a ].join(',') + ')';

      // set color from dropper here
      this.options[this.dropper] = color;
      this.menus.active._getIcon(this.dropper).wColorPicker('color', color);
    },

    _drawDropperUp: function () {
      this.setMode(this.previousMode);
    },

    // get pixel data represented as RGBa color from pixel array.
    _getPixel: function (ctx, pos) {
      var imageData = ctx.getImageData(0, 0, this.width, this.height),
          pixelArray = imageData.data,
          base = ((pos.y * imageData.width) + pos.x) * 4;
      
      return {
        r: pixelArray[base],
        g: pixelArray[base + 1],
        b: pixelArray[base + 2],
        a: pixelArray[base + 3]
      };
    }
  };

  /************************************************************************
   * Menu class   @param{kDoodle} Doodle对象
   ************************************************************************/
  function Menu(kDoodle, name, options) {//Menu构造函数
  	this.kDoodle = kDoodle;//保存对Doodle对象的引用
    this.options = options;
    this.name = name;/*main、text*/
    this.type = !kDoodle.menus.primary ? 'primary' : 'secondary';
    this.docked = true;//??
    this.dockOffset = {left: 0, top: 0};

    this.generate();
  }
  
  Menu.prototype = {
    generate: function () {
    	this.$menu = $('<div class="kDoodle-menu"></div>');//创建菜单盒子
    	this.$menuHolder = $('<div class="kDoodle-menu-holder kDoodle-menu-name-' + this.name + '"></div>');//创建菜单盒子子盒子
      //debugger
      if (this.options.handle) { this.$menuHandle = this._createHandle(); }//创建可拖拽的菜单
      else { this.$menu.addClass('kDoodle-menu-nohandle'); }
      //console.log(this.type)
      if (this.type === 'primary') {//主菜单

      	this.kDoodle.menus.primary = this;//创建一个引用指向Doodle对象的主菜单

        this.setOffsetLeft(this.options.offsetLeft);//设置菜单的位置
        this.setOffsetTop(this.options.offsetTop);
      }
      else if (this.type === 'secondary') {//副菜单
        this.$menu.hide();//副菜单（文本菜单）初始化时需隐藏
      }

      // append menu items
      this.$menu.append(this.$menuHolder.append(this.$menuHandle));
      this.reset();
      
      // append menu
      this.kDoodle.$el.append(this.$menu);

      this.setAlignment(this.options.alignment);
    },

    // create / reset menu - will add new entries in the array
    reset: function () {
    	var _this = this,
		//拿到菜单下所有菜单选项
          menu = $.fn.kDoodle.menus[this.name],
          key;
      for (key in menu.items) {

        // 只添加一次
      	if (!this.$menuHolder.children('.kDoodle-menu-icon-name-' + key).length) {
          
          // 添加 item name, 在交互中需要
          menu.items[key].name = key;

          // 如果img没有设置就用默认img
          menu.items[key].img = _this.kDoodle.options.path + (menu.items[key].img || menu.img);

          _this._appendItem(menu.items[key]);
        }
      }
    },

    _appendItem: function (item) {
		//创建菜单项
      var $item = this['_createIcon' + item.icon.capitalize()](item);

      if (item.after) {//指定插在某个菜单后面
      	this.$menuHolder.children('.kDoodle-menu-icon-name-' + item.after).after($item);
      }
      else {
        this.$menuHolder.append($item);
      }
    },

    /************************************
     * setters
     ************************************/
    setOffsetLeft: function (left) {
      this.$menu.css({left: left});
    },

    setOffsetTop: function (top) {
      this.$menu.css({top: top});
    },

    setAlignment: function (alignment) {
      var tempLeft = this.$menu.css('left');

      this.$menu.attr('class', this.$menu.attr('class').replace(/wPaint-menu-alignment-.+\s|kDoodle-menu-alignment-.+$/, ''));
      this.$menu.addClass('kDoodle-menu-alignment-' + alignment);

      this.$menu.width('auto').css('left', -10000);
      this.$menu.width(this.$menu.width()).css('left', tempLeft);

      // 根据对齐方式设置合适的偏移量
      if (this.type === 'secondary') {
        //console.log(this.type)
        if (this.options.alignment === 'horizontal') {
        	this.dockOffset.top = this.kDoodle.menus.primary.$menu.outerHeight(true);
        }
        else {
        	this.dockOffset.left = this.kDoodle.menus.primary.$menu.outerWidth(true);
        }
      }   
    },

    /************************************
     * handle 设置可拖拽的盒子
     ************************************/
    _createHandle: function () {
      var _this = this,
          $handle = $('<div class="kDoodle-menu-handle"></div>');

      // draggable functions
      function draggableStart() {
        _this.docked = false;
        _this._setDrag();//拖拽文本菜单用的
      }

      function draggableStop() {
        $.each(_this.$menu.data('ui-draggable').snapElements, function (i, el) {
          var offset = _this.$menu.offset(),
              offsetPrimary = _this.kDoodle.menus.primary.$menu.offset();
          //console.log(this.type)
          _this.dockOffset.left = offset.left - offsetPrimary.left;
          _this.dockOffset.top = offset.top - offsetPrimary.top;
          _this.docked = el.snapping;//当文本菜单拖拽到长的一级菜单下方紧挨时，该值为真
        });

        _this._setDrag();//拖拽文本菜单用的
      }

      function draggableDrag() {
        _this._setIndex();
      }

      // the drag/snap events for menus are tricky
      // init handle for ALL menus, primary menu will drag a secondary menu with it, but that is un/binded in the toggle function
      this.$menu.draggable({handle: $handle});
      console.log(this.type)
      // if it's a secondary menu we want to check for snapping
      // on drag we set docked to false, on snap we set it back to true
      if (this.type === 'secondary') {
      	this.$menu.draggable('option', 'snap', this.kDoodle.menus.primary.$menu);
        this.$menu.draggable('option', 'start', draggableStart);
        this.$menu.draggable('option', 'stop', draggableStop);
        this.$menu.draggable('option', 'drag', draggableDrag);
      }

      //$handle.bindMobileEvents();

      return $handle;
    },

    /************************************
     * generic icon 创建每一个图标盒子和外层盒子（单个）
     ************************************/
    _createIconBase: function (item) {
    	var _this = this,
			//创建每一个菜单的外层盒子，即图标的外层盒子
          $icon = $('<div class="kDoodle-menu-icon kDoodle-menu-icon-name-' + item.name + '"></div>'),
			//图标的实际盒子
          $iconImg = $('<div class="kDoodle-menu-icon-img"></div>'),
          width = $iconImg.realWidth(null, null, this.kDoodle.$el);

      function mouseenter(e) {
        var $el = $(e.currentTarget);

        $el.siblings('.hover').removeClass('hover');
        if (!$el.hasClass('disabled')) { $el.addClass('hover'); }
      }

      function mouseleave(e) {
        $(e.currentTarget).removeClass('hover');
      }

      function click() {//鼠标按下时选中
      	_this.kDoodle.menus.active = _this;
      }
		//给图标的外层盒子绑定事件
      $icon
      .attr('title', item.title)
      //.on('mousedown', $.proxy(this.kDoodle._closeSelectBoxes, this.kDoodle, item))
		.on('mousedown', this.kDoodle._closeSelectBoxes.bind(this.kDoodle, item))
      .on('mouseenter', mouseenter)
      .on('mouseleave', mouseleave)
      .on('click', click);

      if ($.isNumeric(item.index)) {
        $iconImg
        .css({
          backgroundImage: 'url(' + item.img + ')',
          backgroundPosition: (-width * item.index) + 'px 0px'
        });
      }
		//把图标的实际盒子插入到图标的外层盒子中
      return $icon.append($iconImg);
    },

    /************************************
     * icon group 创建图标的外层盒子（多个子盒子，即有下拉框的这种情况）
     ************************************/
    _createIconGroup: function (item) {
      var _this = this,
          css = { backgroundImage: 'url(' + item.img + ')' },
		  //单个菜单的最外层盒子
          $icon = this.$menuHolder.children('.kDoodle-menu-icon-group-' + item.group),
          iconExists = $icon.length,
          $selectHolder = null,
          $option = null,
          $item = null,
          width = 0;

      // local functions
      function setIconClick() {

        // only trigger if menu is not visible otherwise it will fire twice
        // from the mousedown to open the menu which we want just to display the menu
        // not fire the button callback
      	if (!$icon.children('.kDoodle-menu-select-holder').is(':visible')) {
      		item.callback.apply(_this.kDoodle, []);
        }
      }

      function selectHolderClick() {
        $icon.addClass('active').siblings('.active').removeClass('active');
      }

      function optionClick() {

        // rebind the main icon when we select an option
        $icon
        .attr('title', item.title)
        .off('click.setIcon')
        .on('click.setIcon', setIconClick);
        
        // run the callback right away when we select an option
        $icon.children('.kDoodle-menu-icon-img').css(css);
        item.callback.apply(_this.kDoodle, []);
      }

      // crate icon if it doesn't exist yet
      if (!iconExists) {
        $icon = this._createIconBase(item)
        .addClass('kDoodle-menu-icon-group kDoodle-menu-icon-group-' + item.group)
        .on('click.setIcon', setIconClick)
        .on('mousedown', $.proxy(this._iconClick, this));
      }

      // get the proper width here now that we have the icon
      // this is for the select box group not the main icon
      width = $icon.children('.kDoodle-menu-icon-img').realWidth(null, null, this.kDoodle.$el);
      css.backgroundPosition = (-width * item.index) + 'px center';

    	// create selectHolder if it doesn't exist
		//创建下拉菜单的最外层盒子（小箭头盒子的兄弟盒子）
      $selectHolder = $icon.children('.kDoodle-menu-select-holder');
      if (!$selectHolder.length) {
        $selectHolder = this._createSelectBox($icon);
        $selectHolder.children().on('click', selectHolderClick);
      }

	  //创建下拉菜单的最里层子菜单
      $item = $('<div class="kDoodle-menu-icon-select-img"></div>')
      .attr('title', item.title)
      .css(css);
		//创建下拉菜单的每一个菜单的最外层盒子
      $option = this._createSelectOption($selectHolder, $item)
      .addClass('kDoodle-menu-icon-name-' + item.name)
      .on('click', optionClick);

      // move select option into place if after is set
      if (item.after) {
      	$selectHolder.children('.kDoodle-menu-select').children('.kDoodle-menu-icon-name-' + item.after).after($option);
      }

      // we only want to return an icon to append on the first run of a group
      if (!iconExists) { return $icon; }
    },

    /************************************
     * icon generic 创建一般图标
     ************************************/
    _createIconGeneric: function (item) {

      // just a go between for the iconGeneric type
      return this._createIconActivate(item);
    },

    /************************************
     * icon
     ************************************/
    _createIconActivate: function (item) {

      // since we are piggy backing icon with the item.group
      // we'll just do a redirect and keep the code separate for group icons
      if (item.group) { return this._createIconGroup(item); }

      var _this = this,
          $icon = this._createIconBase(item);

      function iconClick(e) {
		//切换菜单的active状态
        if (item.icon !== 'generic') { _this._iconClick(e); }
        item.callback.apply(_this.kDoodle, [e]);
      }

      $icon.on('click', iconClick);

      return $icon;
    },

    _isIconDisabled: function (name) {
    	return this.$menuHolder.children('.kDoodle-menu-icon-name-' + name).hasClass('disabled');
    },

    _setIconDisabled: function (name, disabled) {
    	var $icon = this.$menuHolder.children('.kDoodle-menu-icon-name-' + name);

      if (disabled) {
        $icon.addClass('disabled').removeClass('hover');
      }
      else {
        $icon.removeClass('disabled');
      }
    },

    _getIcon: function (name) {
    	return this.$menuHolder.children('.kDoodle-menu-icon-name-' + name);
    },

    _iconClick: function (e) {
    	//这里的$el指的是一级菜单的最外层单个菜单选项（绑定click的那个盒子）
    	var $el = $(e.currentTarget),//currentTarget 事件属性返回其监听器触发事件的节点，即当前处理该事件的元素、文档或窗口。
          menus = this.kDoodle.menus.all;

    	// make sure to loop using parent object - don't use .kDoodle-menu-secondary otherwise we would hide menu for all canvases
      for (var menu in menus) {//
        if (menus[menu] && menus[menu].type === 'secondary') { menus[menu].$menu.hide(); }  
      }

      $el.siblings('.active').removeClass('active');
      if (!$el.hasClass('disabled')) { $el.addClass('active'); }
    },

    /************************************
     * iconToggle切换菜单命令（即切换active类并执行相应的回调）
     ************************************/
    _createIconToggle: function (item) {
      var _this = this,
          $icon = this._createIconBase(item);

      function iconClick() {
        $icon.toggleClass('active');
        item.callback.apply(_this.kDoodle, [$icon.hasClass('active')]);
      }

      $icon.on('click', iconClick);

      return $icon;
    },

    /************************************
     * select
     ************************************/
    _createIconSelect: function (item) {
      var _this = this,
          $icon = this._createIconBase(item),
          $selectHolder = this._createSelectBox($icon),
          i, ii, $option;

      function optionClick(e) {
		//切换一级菜单的背景图片
      	$icon.children('.kDoodle-menu-icon-img').html($(e.currentTarget).html());
      	item.callback.apply(_this.kDoodle, [$(e.currentTarget).html()]);
      }

      // add values for select
      for (i = 0, ii = item.range.length; i < ii; i++) {
      	$option = this._createSelectOption($selectHolder, item.range[i]);
		//为每一个选项绑定事件
        $option.on('click', optionClick);
        if (item.useRange) { $option.css(item.name, item.range[i]); }
      }

      return $icon;
    },
//创建下拉框并控制下拉框的显示切换，返回创建的下拉框对象
    _createSelectBox: function ($icon) {
//创建下拉框的最外层盒子
    	var $selectHolder = $('<div class="kDoodle-menu-select-holder"></div>'),
//创建下拉框的最外层盒子的子盒子
          $select = $('<div class="kDoodle-menu-select"></div>'),
          timer = null;

      function clickSelectHolder(e) {
        e.stopPropagation();
        $selectHolder.hide();
      }

      function iconMousedown() {//让下拉框出现（延时执行）
		//下拉选择框切换
        timer = setTimeout(function () { $selectHolder.toggle(); }, 200);
      }

      function iconMouseup() {//若没有延时200ms，则取消定时器，即不让下拉框出现
        clearTimeout(timer);
      }

      function iconClick() {
        $selectHolder.toggle();
      }

      $selectHolder//给下拉框的最外层盒子绑定事件，在回调中隐藏下拉框
      .on('mousedown mouseup', this.kDoodle._stopPropagation)
      .on('click', clickSelectHolder)
      .hide();

      // of hozizontal we'll pop below the icon
      if (this.options.alignment === 'horizontal') {
      	$selectHolder.css({ left: 0, top: $icon.children('.kDoodle-menu-icon-img').realHeight('outer', true, this.kDoodle.$el) });
      }
      // vertical we'll pop to the right
      else {
      	$selectHolder.css({ left: $icon.children('.kDoodle-menu-icon-img').realWidth('outer', true, this.kDoodle.$el), top: 0 });
      }

      $icon//给一级菜单添加类名和相应的子盒子
      .addClass('kDoodle-menu-icon-select')
      .append('<div class="kDoodle-menu-icon-group-arrow"></div>')
      .append($selectHolder.append($select));
    	//为有下拉框的一级菜单添加一个延时，这样点击一下一级菜单并不会立马出发该事件，而要延时200ms才会触发该事件（要想让下拉框出现，需长按鼠标）
      // for groups we want to add a delay before the selectBox pops up
      if ($icon.hasClass('kDoodle-menu-icon-group')) {
        $icon
        .on('mousedown', iconMousedown)
        .on('mouseup', iconMouseup);//
      }
	  else { $icon.on('click', iconClick); }//选中线宽的那里，不需要延时，点击直接显示下拉菜单

      return $selectHolder;
    },
  	/*
	@params{$selectHolder}传入的下拉框对象
	@params{$selectHolder}传入的下拉框对象
    return创建好的每一个下拉框选项
	*/
    _createSelectOption: function ($selectHolder, value) {
    	var $select = $selectHolder.children('.kDoodle-menu-select'),//创建下拉框的唯一子盒子
          $option = $('<div class="kDoodle-menu-select-option"></div>').append(value);//创建下拉框的每一个选项盒子并添加值（元素）

      // set class for first item to remove any undesired styles like borders
      if (!$select.children().length) { $option.addClass('first'); }
		//把创建好的选项盒子插入到下拉框中
      $select.append($option);

      return $option;
    },

    _setSelectValue: function (icon, value) {
    	this._getIcon(icon).children('.kDoodle-menu-icon-img').html(value);
    },

    /************************************
     * color picker
     ************************************/
    _createIconColorPicker: function (item) {
      var _this = this,
          $icon = this._createIconBase(item);

      function iconClick() {

        // if we happen to click on this while in dropper mode just revert to previous
      	if (_this.kDoodle.options.mode === 'dropper') { _this.kDoodle.setMode(_this.kDoodle.previousMode); }
      }

      function iconOnSelect(color) {
      	item.callback.apply(_this.kDoodle, [color]);
      }

      function iconOnDropper() {
        $icon.trigger('click');
        _this.kDoodle.dropper = item.name;
        _this.kDoodle.setMode('dropper');
      }

      $icon
      .on('click', iconClick)
      .addClass('kDoodle-menu-colorpicker')
      .wColorPicker({
        mode: 'click',
        generateButton: false,
        dropperButton: true,
        onSelect: iconOnSelect,
        onDropper: iconOnDropper
      });

      return $icon;
    },

    _setColorPickerValue: function (icon, value) {
    	this._getIcon(icon).children('.kDoodle-menu-icon-img').css('backgroundColor', value);
    },

    /************************************
     * menu toggle
     ************************************/
    _createIconMenu: function (item) {//点击菜单弹出另一菜单
      var _this = this,
          $icon = this._createIconActivate(item);

      function iconClick() {
      	_this.kDoodle.setCursor(item.name);

        // the items name here will be the menu name
      	var menu = _this.kDoodle.menus.all[item.name];
        menu.$menu.toggle();//创建另一菜单
        if (_this.handle) {//好像一直都是undefined
          menu._setDrag();
        } else {
          menu._setPosition();//让弹出的菜单处于正确的位置
        }
      }

      $icon.on('click', iconClick);

      return $icon;
    },

    // here we specify which menu will be dragged
    _setDrag: function () {
      var $menu = this.$menu,
          drag = null, stop = null;

      if ($menu.is(':visible')) {
      	console.log(this.docked)
        if (this.docked) {

          // make sure we are setting proper menu object here
          drag = stop = $.proxy(this._setPosition, this);
          this._setPosition();
        }

        // register drag/stop events
        this.kDoodle.menus.primary.$menu.draggable('option', 'drag', drag);
        this.kDoodle.menus.primary.$menu.draggable('option', 'stop', stop);
      }
    },

    _setPosition: function () {
    	var offset = this.kDoodle.menus.primary.$menu.position();

      this.$menu.css({
        left: offset.left + this.dockOffset.left,
        top: offset.top + this.dockOffset.top
      });
    },

    _setIndex: function () {//??
    	var primaryOffset = this.kDoodle.menus.primary.$menu.offset(),
          secondaryOffset = this.$menu.offset();

      if (
        secondaryOffset.top < primaryOffset.top ||
        secondaryOffset.left < primaryOffset.left
      ) {
      	this.$menu.addClass('kDoodle-menu-behind');
      }
      else {
      	this.$menu.removeClass('kDoodle-menu-behind');
      }
    }
  };

  /************************************************************************
   * kDoodle
   ************************************************************************/
  $.support.canvas = (document.createElement('canvas')).getContext;

  $.fn.kDoodle = function (options, value) {

    //function create() {
    //  if (!$.support.canvas) {
    //    $(this).html('Browser does not support HTML5 canvas, please upgrade to a more modern browser.');
    //    return false;
    //  }

    //  return $.proxy(get, this)();
    //}

  	function get() {
  		if (!$.support.canvas) {
  			$(this).html('你的浏览器不支持canvas，建议你使用Chrome浏览器最新版');
  			return false;
  		}
    	var kDoodle = $.data(this, 'kDoodle');//获取this对象上的kDoodle的value
     // console.log(kDoodle)
		  if (!kDoodle) {//如果不存在，说明没有获取到，那么就创建kDoodle对象并缓存kDoodle的数据
			kDoodle = new Doodle(this, $.extend(true, {}, options));
			$.data(this, 'kDoodle', kDoodle);
		  }

      return kDoodle;
    }

    function runOpts() {
      var kDoodle = $.data(this, 'kDoodle');//获取对象的kDoodle值

      if (kDoodle) {//获取到了
		//若有，则直接执行
        if (kDoodle[options]) { kDoodle[options].apply(kDoodle, [value]); }
        else if (value !== undefined) {
          if (kDoodle[func]) { kDoodle[func].apply(kDoodle, [value]); }
          if (kDoodle.options[options]) { kDoodle.options[options] = value; }
        }
        else {
          if (kDoodle[func]) { values.push(kDoodle[func].apply(kDoodle, [value])); }
          else if (kDoodle.options[options]) { values.push(kDoodle.options[options]); }
          else { values.push(undefined); }
        }
      }
    }

    if (typeof options === 'string') {
      var values = [],
          func = (value ? 'set' : 'get') + options.charAt(0).toUpperCase() + options.substring(1);

      this.each(runOpts);

      if (values.length) { return values.length === 1 ? values[0] : values; }
      
      return this;
    }

    options = $.extend({}, $.fn.kDoodle.defaults, options);
    options.lineWidth = parseInt(options.lineWidth, 10);
    options.fontSize = parseInt(options.fontSize, 10);
  	//return this.each(create);
    return this.each(get);
  };

  /************************************************************************
   * extend
   ************************************************************************/
  $.fn.kDoodle.extend = function (funcs, protoType) {
    var key;
    
    function elEach(func) {
//如果在原型上存在该函数名，那么这2个函数都得执行，不能覆盖
    	if (protoType[func]) {
			//console.log(111)
        var tmpFunc = Doodle.prototype[func],
            newFunc = funcs[func];
        
        protoType[func] = function () {
          tmpFunc.apply(this, arguments);
          newFunc.apply(this, arguments);
        };
      }else {
    		//如果在原型上不存在该函数名，那么这个原型对象
			protoType[func] = funcs[func];
      }
    }

    protoType = protoType === 'menu' ? Menu.prototype : Doodle.prototype;
    //console.log(protoType)
    for (key in funcs) { elEach(key); }
  };

  /************************************************************************
   * Init holders
   ************************************************************************/
  $.fn.kDoodle.menus = {};

  $.fn.kDoodle.cursors = {};

  $.fn.kDoodle.defaults = {
    path:            '',                // set absolute path for images and cursors
    theme:           'standard classic', // set theme
    autoScaleImage:  true,               // auto scale images to size of canvas (fg and bg)
    autoCenterImage: true,               // auto center images (fg and bg, default is left/top corner)
    menuHandle:      true,               // setting to false will means menus cannot be dragged around
    menuOrientation: 'horizontal',       // menu alignment (horizontal,vertical)
    menuOffsetLeft:  5,                  // left offset of primary menu
    menuOffsetTop:   5,                  // top offset of primary menu
    bg:              null,               // set bg on init
    image:           null,               // set image on init
    imageStretch:    false,              // stretch smaller images to full canvans dimensions
    onShapeDown:     null,               // callback for draw down event
    onShapeMove:     null,               // callback for draw move event
    onShapeUp:       null                // callback for draw up event
  };
})(jQuery);